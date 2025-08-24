// ========================== Main Application ==========================

import { MapManager } from './mapManager.js';
import { FaultManager } from './faultManager.js';
import { AnalyticsManager } from './analyticsManager.js';
import { MQTTManager } from './mqttManager.js';
import { UIManager } from './uiManager.js';
import { appState } from './state.js';

export class SCADAApp {
  constructor() {
    this.mapManager = null;
    this.faultManager = null;
    this.analyticsManager = null;
    this.mqttManager = null;
    this.uiManager = null;
  }
  
  async initialize() {
    try {
      console.log("Initializing SCADA Application...");
      
      // Initialize managers in dependency order
      this.mapManager = new MapManager();
      this.faultManager = new FaultManager(this.mapManager);
      this.analyticsManager = new AnalyticsManager();
      this.mqttManager = new MQTTManager(this.faultManager);
      this.uiManager = new UIManager(
        this.mapManager, 
        this.faultManager, 
        this.analyticsManager, 
        this.mqttManager
      );
      
      // Initialize map and poles
      this.mapManager.addPoles();
      
      // Initialize UI button states
      this.uiManager.initializeButtonStates();
      
      // Reset system to initial state
      this.uiManager.reset();
      
      console.log("SCADA Application initialized successfully!");
      
    } catch (error) {
      console.error("Failed to initialize SCADA Application:", error);
    }
  }
  
  getManagers() {
    return {
      mapManager: this.mapManager,
      faultManager: this.faultManager,
      analyticsManager: this.analyticsManager,
      mqttManager: this.mqttManager,
      uiManager: this.uiManager
    };
  }
  
  getState() {
    return appState;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new SCADAApp();
  app.initialize();
  
  // Make app globally available for debugging
  window.scadaApp = app;
});
