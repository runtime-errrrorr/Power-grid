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
      // Subscribe to both substation and poles topics
      this.client.subscribe(MQTT_CONFIG.TOPICS.SUBSTATION);
      this.client.subscribe(MQTT_CONFIG.TOPICS.POLES);
      console.log(`Subscribed to ${MQTT_CONFIG.TOPICS.SUBSTATION}`);
      console.log(`Subscribed to ${MQTT_CONFIG.TOPICS.POLES}`);
    });
    
    this.client.on("message", (topic, message) => {
      try {
        if (topic === MQTT_CONFIG.TOPICS.SUBSTATION) {
          // Handle substation messages (JSON format)
          const data = JSON.parse(message.toString());
          this.faultManager.updateSubstationStatus(data);
        } else if (topic === MQTT_CONFIG.TOPICS.POLES) {
          // Handle pole messages ($$...## format)
          const poleData = this.parsePoleMessage(message.toString());
          if (poleData) {
            this.faultManager.updatePoleStatus(poleData);
          }
        }
      } catch (e) {
        console.error("Invalid MQTT message", e);
        console.error("Topic:", topic);
        console.error("Message:", message.toString());
      }
    });
  }
  
  parsePoleMessage(message) {
    // Parse messages in format: $$P01,S01,0.0,0.04,0##
    // Format: $$PoleID,SubstationID,Voltage,Current,ErrorCode##
    
    // if (!message.startsWith('$$') || !message.endsWith('##')) {
    //   console.warn("Invalid pole message format:", message);
    //   return null;
    // }
    
    // Remove $$ and ## and split by comma
    const content = message.slice(2, -2);
    const parts = content.split(',');
    
    if (parts.length !== 5) {
      console.warn("Invalid pole message parts:", parts);
      return null;
    }
    
    const [poleIdStr, substationIdStr, voltageStr, currentStr, errorCodeStr] = parts;
    
    // Extract pole ID (remove 'P' prefix)
    const poleId = parseInt(poleIdStr.replace('P', ''));
    
    // Extract substation ID (remove 'S' prefix)
    const substationId = parseInt(substationIdStr.replace('S', ''));
    
    // Parse voltage and current
    const voltage = parseFloat(voltageStr);
    const current = parseFloat(currentStr);
    
    // Parse error code
    const errorCode = parseInt(errorCodeStr);
    
    // Determine fault type and status based on error code
    let faultType = "Normal";
    let status = "OK";
    
    switch (errorCode) {
      case 0:
        faultType = "Normal";
        status = "OK";
        break;
      case 27:
        faultType = "Line Fault";
        status = "FAULT";
        break;
      case 10:
        faultType = "Neutral Break";
        status = "FAULT";
        break;
      default:
        faultType = "Unknown";
        status = "WARNING";
    }
    
    return {
      pole_id: 4,
      substation_id: substationId,
      voltage: voltage,
      current: current,
      fault_type: faultType,
      status: status,
      error_code: errorCode,
      timestamp: Date.now()
    };
  }
  
  publishSubstationToggle(status) {
    this.client.publish(MQTT_CONFIG.TOPICS.COMMANDS, 'r');
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
