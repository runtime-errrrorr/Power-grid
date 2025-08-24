// ================= MQTT =================
const client = mqtt.connect("wss://broker.hivemq.com:8884/mqtt");

client.on("connect", () => {
  console.log("Connected to MQTT broker");
  client.subscribe("scada/poles/#");
});

client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    updatePoleStatus(data);
  } catch (e) {
    console.error("Invalid MQTT message", e);
  }
});
