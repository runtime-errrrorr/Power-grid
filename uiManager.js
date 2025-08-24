// ========================== UI Manager ==========================

import { POLES, SUBSTATION_ID, COLOR } from './config.js';
import { appState } from './state.js';
import { logEvent, showAlert, updateSystemStatus } from './utils.js';

export class UIManager {
  constructor(mapManager, faultManager, analyticsManager, mqttManager) {
    this.mapManager = mapManager;
    this.faultManager = faultManager;
    this.analyticsManager = analyticsManager;
    this.mqttManager = mqttManager;
    this.initializeUI();
  }
  
  initializeUI() {
    this.setupEventListeners();
    this.setupHamburgerMenu();
  }
  
  setupEventListeners() {
    // Make functions globally available for HTML onclick handlers
    window.simulateFault = () => this.simulateFault();
    window.generateSampleData = () => this.generateSampleData();
    window.reset = () => this.reset();
    window.showAnalytics = () => this.showAnalytics();
    window.toggleSubstation = () => this.toggleSubstation();
    window.showPole = (pole) => this.showPole(pole);
    window.updateAnalytics = () => this.updateAnalytics();
    window.clearAnalyticsData = () => this.clearAnalyticsData();
    window.toggleAnalytics = () => this.toggleAnalytics();
  }
  
  setupHamburgerMenu() {
    const sidePanel = document.getElementById('sidePanel');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    if (hamburgerBtn && sidePanel) {
      hamburgerBtn.addEventListener('click', () => sidePanel.classList.toggle('open'));
    }
  }
  
  showPole(pole) {
    appState.setSelectedPoleId(pole.id);
    const poleData = appState.getPoleData()[pole.id];
    const poleInfoEl = document.getElementById('poleInfo');
    
    poleInfoEl.innerHTML = `
      <h3 style="margin-bottom:5px; color:#4db6ff;">${pole.name}</h3>
      <div><b>Status:</b> ${poleData.status}</div>
      <div><b>Voltage:</b> ${poleData.voltage} V</div>
      <div><b>Current:</b> ${poleData.current} A</div>
      <div><b>Fault Code:</b> ${poleData.fault_code}</div>
      <div><b>Fault Type:</b> ${poleData.fault_type}</div>
      <div><b>Breaker:</b> ${poleData.breaker_status}</div>
      <div style="font-size:12px; color:#aaa;">Last update: ${new Date(poleData.timestamp).toLocaleTimeString()}</div>
    `;
  }
  
  simulateFault() {
    const id = appState.getSelectedPoleId() || 4;
    const fake = {
      pole_id: id,
      status: "FAULT",
      fault_type: "Overvoltage",  // change for testing
      voltage: 270,
      current: 110,
      breaker_status: "OPEN",
      timestamp: Date.now()
    };
    this.faultManager.updatePoleStatus(fake);
  }
  
  generateSampleData() {
    // Cycle through all poles with random volt/current
    POLES.forEach(p => {
      const sample = {
        pole_id: p.id,
        status: "OK",
        fault_type: "Normal",
        voltage: (220 + Math.random() * 20).toFixed(1),
        current: (50 + Math.random() * 20).toFixed(1),
        breaker_status: "CLOSED",
        timestamp: Date.now()
      };
      this.faultManager.updatePoleStatus(sample);
    });
  }
  
  reset() {
    this.mapManager.resetAllVisuals();
    appState.reset();
    
    // Reset substation button state
    const substationBtn = document.getElementById('substationToggleBtn');
    if (substationBtn) {
      substationBtn.textContent = "🔌 Toggle Substation";
      substationBtn.style.background = "rgba(255, 255, 255, 0.04)";
      substationBtn.style.borderColor = "rgba(255, 255, 255, 0.12)";
    }
    
    updateSystemStatus("OK");
    const eventLogEl = document.getElementById('eventLog');
    eventLogEl.innerHTML = "";
    logEvent(eventLogEl, "System Reset");
  }
  
  showAnalytics() {
    this.analyticsManager.showAnalytics();
  }
  
  toggleSubstation() {
    const currentStatus = appState.getSubstationOnline();
    const newStatus = !currentStatus;
    appState.setSubstationOnline(newStatus);
    
    // Update button text and appearance
    const btn = document.getElementById('substationToggleBtn');
    if (btn) {
      if (newStatus) {
        btn.textContent = "🔌 Toggle Substation";
        btn.style.background = "rgba(255, 255, 255, 0.04)";
        btn.style.borderColor = "rgba(255, 255, 255, 0.12)";
      } else {
        btn.textContent = "⚡ Substation OFF";
        btn.style.background = "rgba(244, 67, 54, 0.2)";
        btn.style.borderColor = "#f44336";
      }
    }
    
    // Send MQTT message
    this.mqttManager.publishSubstationToggle(newStatus ? "ONLINE" : "OFFLINE");
    
    // Update visual state
    if (newStatus) {
      // Bring substation back online
      this.mapManager.setPoleColor(SUBSTATION_ID, COLOR.OK, { includeLines: false });
      [1, 2, 3, 4].forEach(id => this.mapManager.setPoleColor(id, COLOR.OK));
      const lines = appState.getLines();
      lines.forEach(Lobj => Lobj.line.setStyle({ color: COLOR.OK }));
      
      const eventLogEl = document.getElementById('eventLog');
      logEvent(eventLogEl, "Substation brought back online", "info");
      showAlert("✅ Substation brought back online");
      updateSystemStatus("OK");
    } else {
      // Take substation offline
      this.mapManager.setPoleColor(SUBSTATION_ID, COLOR.OFF, { includeLines: false });
      [1, 2, 3, 4].forEach(id => this.mapManager.setPoleColor(id, COLOR.OFF));
      const lines = appState.getLines();
      lines.forEach(Lobj => Lobj.line.setStyle({ color: COLOR.OFF }));
      
      const eventLogEl = document.getElementById('eventLog');
      logEvent(eventLogEl, "Substation taken offline", "warn");
      showAlert("⚠️ Substation taken offline");
      updateSystemStatus("WARNING");
    }
  }
  
  updateAnalytics() {
    this.analyticsManager.updateAnalytics();
  }
  
  clearAnalyticsData() {
    this.analyticsManager.clearAnalyticsData();
  }
  
  toggleAnalytics() {
    this.analyticsManager.toggleAnalytics();
  }
  
  initializeButtonStates() {
    // Initialize view graph button state
    this.analyticsManager.updateViewGraphButton();
    
    // Initialize substation button state
    const substationBtn = document.getElementById('substationToggleBtn');
    if (substationBtn) {
      substationBtn.textContent = "🔌 Toggle Substation";
      substationBtn.style.background = "rgba(255, 255, 255, 0.04)";
      substationBtn.style.borderColor = "rgba(255, 255, 255, 0.12)";
    }
  }
}
