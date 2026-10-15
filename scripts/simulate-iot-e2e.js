/*
 * Simula el ciclo que ejecuta una placa ESP32 real sin guardar secretos:
 * BLE activo -> vincular -> MQTT/telemetria cada 5 s -> desvincular -> BLE activo.
 *
 * Requiere SIM_OWNER_LOGIN, SIM_OWNER_PASSWORD, SIM_HOME_ID y SIM_DEVICE_CODE.
 */
const { randomUUID } = require('node:crypto');
const mqtt = require('mqtt');

const intervalMs = Number(process.env.SIM_INTERVAL_MS || 5000);
const telemetryCycles = Number(process.env.SIM_TELEMETRY_CYCLES || 3);
const apiBaseUrl = (process.env.SIM_API_URL || 'http://127.0.0.1:3000/api/v1').replace(/\/$/, '');
const brokerUrl = process.env.SIM_MQTT_BROKER_URL || process.env.MQTT_LOCAL_BROKER_URL || 'mqtt://127.0.0.1:1883';
const deviceCode = process.env.SIM_DEVICE_CODE;
const hardwareId = process.env.SIM_HARDWARE_ID || deviceCode;
const homeId = process.env.SIM_HOME_ID;
const ownerLogin = process.env.SIM_OWNER_LOGIN;
const ownerPassword = process.env.SIM_OWNER_PASSWORD;
const wifiSsid = process.env.SIM_WIFI_SSID || 'HidroSmart-Simulation';

function requireValue(name, value) {
  if (!value) throw new Error(`Falta la variable ${name}`);
  return value;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCookies(response) {
  const cookies = response.headers.getSetCookie?.() || [];
  return cookies.reduce((jar, cookie) => {
    const [pair] = cookie.split(';', 1);
    const separator = pair.indexOf('=');
    if (separator > 0) jar.set(pair.slice(0, separator), decodeURIComponent(pair.slice(separator + 1)));
    return jar;
  }, new Map());
}

class CookieApi {
  constructor() {
    this.cookies = new Map();
  }

  cookieHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ');
  }

  async request(path, { method = 'GET', body } = {}) {
    const headers = { accept: 'application/json' };
    const cookie = this.cookieHeader();
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && this.cookies.get('hidrosmart_csrf')) {
      headers['x-csrf-token'] = this.cookies.get('hidrosmart_csrf');
    }
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    for (const [name, value] of parseCookies(response)) this.cookies.set(name, value);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`${method} ${path} fallo (${response.status}): ${data?.error?.message || text}`);
    }
    return data;
  }
}

function publish(client, topic, payload) {
  return new Promise((resolve, reject) => {
    client.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, (error) => error ? reject(error) : resolve());
  });
}

function connectMqtt() {
  const client = mqtt.connect(brokerUrl, {
    clientId: `hidrosmart-sim-${randomUUID()}`,
    reconnectPeriod: 1000,
    ...(process.env.SIM_MQTT_USERNAME ? { username: process.env.SIM_MQTT_USERNAME } : {}),
    ...(process.env.SIM_MQTT_PASSWORD ? { password: process.env.SIM_MQTT_PASSWORD } : {})
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tiempo agotado conectando al broker MQTT')), 10_000);
    client.once('connect', () => {
      clearTimeout(timer);
      resolve(client);
    });
    client.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function main() {
  requireValue('SIM_OWNER_LOGIN', ownerLogin);
  requireValue('SIM_OWNER_PASSWORD', ownerPassword);
  requireValue('SIM_HOME_ID', homeId);
  requireValue('SIM_DEVICE_CODE', deviceCode);
  if (!Number.isInteger(intervalMs) || intervalMs < 5000) throw new Error('SIM_INTERVAL_MS debe ser un entero de al menos 5000');
  if (!Number.isInteger(telemetryCycles) || telemetryCycles < 1) throw new Error('SIM_TELEMETRY_CYCLES debe ser un entero positivo');

  const api = new CookieApi();
  const client = await connectMqtt();
  const commandsTopic = `hidrosmart/devices/${deviceCode}/commands`;
  const statusTopic = `hidrosmart/devices/${deviceCode}/status`;
  const telemetryTopic = `hidrosmart/devices/${deviceCode}/telemetry`;
  let linkedToHome = false;
  let bleEnabled = true;
  let totalLiters = 0;
  const commands = [];

  const publishStatus = async () => {
    await publish(client, statusTopic, {
      deviceId: deviceCode,
      hardwareId,
      status: 'ONLINE',
      timestamp: new Date().toISOString(),
      firmwareVersion: 'sim-1.0.0',
      wifiRssiDbm: -45,
      batteryLevel: 100,
      lastIp: '192.0.2.10',
      wifiSsid,
      provisioningStatus: 'MQTT_CONNECTED',
      linkedToHome
    });
  };

  const commandPromise = (command) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`No se recibio el comando MQTT ${command}`)), 10_000);
    const listener = async (_topic, raw) => {
      try {
        const payload = JSON.parse(raw.toString('utf8'));
        commands.push(payload.command);
        if (payload.command !== command) return;
        client.removeListener('message', listener);
        clearTimeout(timer);
        linkedToHome = command === 'confirm_link';
        bleEnabled = command === 'unlink';
        await publishStatus();
        resolve(payload);
      } catch (error) {
        client.removeListener('message', listener);
        clearTimeout(timer);
        reject(error);
      }
    };
    client.on('message', listener);
  });

  let linkedDeviceId = null;
  try {
    await new Promise((resolve, reject) => client.subscribe(commandsTopic, { qos: 1 }, (error) => error ? reject(error) : resolve()));
    console.log('[SIM] BLE activo; dispositivo sin hogar. Publicando estado ONLINE.');
    await publishStatus();

    await api.request('/auth/login', { method: 'POST', body: { login: ownerLogin, password: ownerPassword } });
    const confirmLink = commandPromise('confirm_link');
    const linkResponse = await api.request('/devices/link', {
      method: 'POST',
      body: { homeId, code: deviceCode }
    });
    linkedDeviceId = linkResponse.data?.deviceId;
    if (!linkedDeviceId) throw new Error('La vinculacion no devolvio deviceId');
    await confirmLink;
    if (!linkedToHome || bleEnabled) throw new Error('El simulador no aplico confirm_link correctamente');
    console.log('[SIM] Vinculado: BLE apagado y Wi-Fi/MQTT activos.');

    for (let index = 1; index <= telemetryCycles; index += 1) {
      const flowRateLpm = 0.96;
      const consumptionLiters = Number((flowRateLpm * intervalMs / 60_000).toFixed(4));
      totalLiters = Number((totalLiters + consumptionLiters).toFixed(4));
      await publish(client, telemetryTopic, {
        mqttMessageId: `sim-${Date.now()}-${index}`,
        deviceId: deviceCode,
        hardwareId,
        timestamp: new Date().toISOString(),
        flowRateLpm,
        consumptionLiters,
        totalLiters,
        pulses: 36 * index,
        sampleIntervalSeconds: intervalMs / 1000,
        wifiRssiDbm: -45,
        batteryLevel: 100,
        voltage: 5,
        temperature: 25
      });
      console.log(`[SIM] Telemetria ${index}/${telemetryCycles} publicada (${consumptionLiters} L).`);
      if (index < telemetryCycles) await delay(intervalMs);
    }

    await delay(1000);
    const latest = await api.request(`/devices/${encodeURIComponent(linkedDeviceId)}/telemetry/latest`);
    if (!latest.data?.mqttMessageId?.startsWith('sim-')) throw new Error('La API no devolvio la telemetria simulada');
    console.log('[SIM] Dashboard/API confirmo la ultima lectura.');

    const unlink = commandPromise('unlink');
    await api.request(`/devices/${encodeURIComponent(linkedDeviceId)}/home/${encodeURIComponent(homeId)}`, { method: 'DELETE' });
    await unlink;
    if (linkedToHome || !bleEnabled) throw new Error('El simulador no reactivo BLE tras unlink');
    console.log('[SIM] Desvinculado: BLE activo de nuevo. Flujo completo correcto.');
  } finally {
    if (api.cookies.size) {
      try { await api.request('/auth/logout', { method: 'POST' }); } catch { /* la limpieza local no oculta el resultado principal */ }
    }
    await new Promise((resolve) => client.end(true, resolve));
  }
}

main().catch((error) => {
  console.error(`[SIM] Fallo: ${error.message}`);
  process.exitCode = 1;
});
