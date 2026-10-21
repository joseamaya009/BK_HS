function getPositiveInteger(value, fallback, variableName) {
  if (value === undefined || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${variableName} debe ser un entero mayor o igual a cero`);
  }

  return parsed;
}

function getBoolean(value, fallback, variableName) {
  if (value === undefined || value === '') return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;

  throw new Error(`${variableName} debe ser true o false`);
}

function getMqttConfig(env = process.env) {
  const brokerUrl = env.MQTT_BROKER_URL;

  if (!brokerUrl) {
    throw new Error('Falta la variable MQTT_BROKER_URL');
  }

  let parsedBrokerUrl;
  try {
    parsedBrokerUrl = new URL(brokerUrl);
    const protocol = parsedBrokerUrl.protocol;
    if (!['mqtt:', 'mqtts:', 'ws:', 'wss:'].includes(protocol)) {
      throw new Error('protocolo no soportado');
    }
  } catch (_error) {
    throw new Error('MQTT_BROKER_URL debe ser una URL MQTT válida');
  }

  const username = env.MQTT_USERNAME || undefined;
  const password = env.MQTT_PASSWORD || undefined;
  const isProduction = env.NODE_ENV === 'production';

  if (parsedBrokerUrl.username || parsedBrokerUrl.password) {
    throw new Error('MQTT_BROKER_URL no debe incluir credenciales; usa MQTT_USERNAME y MQTT_PASSWORD');
  }

  if (Boolean(username) !== Boolean(password)) {
    throw new Error('MQTT_USERNAME y MQTT_PASSWORD deben configurarse juntos');
  }

  if (isProduction && !['mqtts:', 'wss:'].includes(parsedBrokerUrl.protocol)) {
    throw new Error('En producción MQTT_BROKER_URL debe usar TLS (mqtts:// o wss://)');
  }

  if (isProduction && (!username || !password)) {
    throw new Error('En producción MQTT_USERNAME y MQTT_PASSWORD son obligatorios');
  }

  const qos = getPositiveInteger(env.MQTT_QOS, 1, 'MQTT_QOS');
  if (qos > 2) {
    throw new Error('MQTT_QOS debe ser 0, 1 o 2');
  }

  return {
    brokerUrl,
    qos,
    // Compatibilidad temporal con el firmware anterior, que no enviaba
    // mqttMessageId. Debe desactivarse cuando todos los dispositivos estén
    // actualizados para recuperar la idempotencia proporcionada por el ESP32.
    allowLegacyTelemetry: getBoolean(env.MQTT_ALLOW_LEGACY_TELEMETRY, false, 'MQTT_ALLOW_LEGACY_TELEMETRY'),
    maxPayloadBytes: getPositiveInteger(env.MQTT_MAX_PAYLOAD_BYTES, 16384, 'MQTT_MAX_PAYLOAD_BYTES') || 16384,
    options: {
      clientId: env.MQTT_CLIENT_ID || `hidrosmart-backend-${process.pid}`,
      clean: true,
      reconnectPeriod: getPositiveInteger(env.MQTT_RECONNECT_PERIOD_MS, 3000, 'MQTT_RECONNECT_PERIOD_MS'),
      connectTimeout: getPositiveInteger(env.MQTT_CONNECT_TIMEOUT_MS, 10000, 'MQTT_CONNECT_TIMEOUT_MS'),
      ...(username ? { username } : {}),
      ...(password ? { password } : {})
    }
  };
}

module.exports = { getMqttConfig };
