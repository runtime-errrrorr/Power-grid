// ========================== MQTT Manager ==========================

import { MQTT_CONFIG, SUBSTATION_ID } from './config.js';
import { appState } from './state.js';

export class MQTTManager {
  constructor(faultManager) {
    this.client = null;
    this.faultManager = faultManager;
    this.connect();
  }
  
  connect() {
    this.client = mqtt.connect(MQTT_CONFIG.BROKER_URL);
    
    this.client.on("connect", () => {
      console.log("Connected to MQTT broker");
      this.client.subscribe(MQTT_CONFIG.TOPICS.POLES);
    });
    
    this.client.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        this.faultManager.updatePoleStatus(data);
      } catch (e) {
        console.error("Invalid MQTT message", e);
      }
    });
  }
  
  publishSubstationToggle(status) {
    const message = {
      command: "substation_toggle",
      substation_id: SUBSTATION_ID,
      status: status,
      timestamp: Date.now()
    };
    
    this.client.publish(MQTT_CONFIG.TOPICS.COMMANDS, JSON.stringify(message));
  }
  
  getClient() {
    return this.client;
  }
  
  disconnect() {
    if (this.client) {
      this.client.end();
    }
  }
}
