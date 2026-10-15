const { parseDeviceStatusMessage } = require("../message-parser");
const { getTopicContext } = require("../topics");

async function handleDeviceStatus({
  topic,
  message,
  context,
  logger = console,
  maxPayloadBytes,
  deviceRepository = null,
  deviceCommandPublisher = null,
  deviceCommandsTopic = null,
}) {
  const topicContext = context || getTopicContext(topic);
  if (!topicContext || topicContext.type !== "device-status") {
    throw new Error(`Topic MQTT de estado inválido: ${topic}`);
  }

  const deviceStatus = parseDeviceStatusMessage(message, { maxPayloadBytes });
  if (
    deviceStatus.reportedDeviceId &&
    deviceStatus.reportedDeviceId !== topicContext.deviceId
  ) {
    throw new Error("deviceId del mensaje no coincide con el topic MQTT");
  }

  const status = {
    deviceId: topicContext.deviceId,
    hardwareId: deviceStatus.hardwareId,
    status: deviceStatus.status,
    timestamp: deviceStatus.timestamp,
    firmwareVersion: deviceStatus.firmwareVersion,
    wifiRssiDbm: deviceStatus.wifiRssiDbm,
    signalQuality: deviceStatus.signalQuality,
    batteryLevel: deviceStatus.batteryLevel,
    lastIp: deviceStatus.lastIp,
    wifiSsid: deviceStatus.wifiSsid,
    provisioningStatus: deviceStatus.provisioningStatus,
    linkedToHome: deviceStatus.linkedToHome,
  };

  if (deviceRepository) {
    status.persistence = await deviceRepository.recordMqttStatus({
      deviceCode: status.deviceId,
      connectivityStatus: status.status,
      eventAt: status.timestamp,
      firmwareVersion: status.firmwareVersion,
      wifiRssiDbm: status.wifiRssiDbm,
      signalQuality: status.signalQuality,
      batteryLevel: status.batteryLevel,
      lastIp: status.lastIp,
      wifiSsid: status.wifiSsid,
      hardwareId: status.hardwareId,
      provisioningStatus: status.provisioningStatus,
    });
  }

  // La BD es la autoridad de vinculacion. Si el ESP32 informa un estado
  // diferente, se corrige por MQTT cuando vuelve a estar ONLINE. Los comandos
  // no son retenidos para no dejar acciones obsoletas en el broker.
  const backendLinked = status.persistence?.linked_to_home === true;
  const deviceLinked = deviceStatus.linkedToHome;
  if (
    status.status === "ONLINE" &&
    deviceLinked !== null &&
    deviceLinked !== backendLinked &&
    deviceCommandPublisher &&
    deviceCommandsTopic
  ) {
    const command = backendLinked ? "confirm_link" : "unlink";
    try {
      await deviceCommandPublisher.publish(
        deviceCommandsTopic(status.deviceId),
        { command, reason: "backend_link_state_sync" },
        { qos: 1, retain: false },
      );
      logger.info(`[MQTT] Sincronizacion de vinculacion enviada: ${command}`);
    } catch (error) {
      logger.warn(
        `[MQTT] No se pudo sincronizar la vinculacion: ${error.message}`,
      );
    }
  }

  logger.info("[MQTT] Estado de dispositivo recibido", status);
  return status;
}

module.exports = { handleDeviceStatus };
