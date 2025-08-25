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
    window.turnOnSubstation = () => this.turnOnSubstation();
    window.showPole = (pole) => this.showPole(pole);
    window.updateAnalytics = () => this.updateAnalytics();
    window.clearAnalyticsData = () => this.clearAnalyticsData();
    window.toggleAnalytics = () => this.toggleAnalytics();
    window.refreshCharts = () => this.analyticsManager.refreshCharts();
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
    const selectedId = appState.getSelectedPoleId();
    const id = selectedId || SUBSTATION_ID; // Default to substation if no pole selected
    
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
    
    // Update substation button visibility
    this.updateSubstationButtonVisibility();
    
    updateSystemStatus("OK");
    const eventLogEl = document.getElementById('eventLog');
    eventLogEl.innerHTML = "";
    logEvent(eventLogEl, "System Reset");
  }
  
  showAnalytics() {
    this.analyticsManager.showAnalytics();
  }
  
  turnOnSubstation() {
    // Send MQTT message to turn on substation (just send 'r' command)
    this.mqttManager.publishSubstationToggle("ONLINE");
    
    // Log the command sent
    const eventLogEl = document.getElementById('eventLog');
    logEvent(eventLogEl, "Turn on substation command sent", "info");
    showAlert("📡 Turn on substation command sent");
    
    // Don't change visual state - wait for actual substation response
    // The visual state will be updated when the substation sends OK status
  }
  
  updateSubstationButtonVisibility() {
    const btn = document.getElementById('substationToggleBtn');
    if (!btn) return;
    
    const substationData = appState.getPoleData()[SUBSTATION_ID];
    
    // Check for fault conditions - handle both old and new formats
    const isSubstationOffline = substationData && (
      substationData.status === "CRITICAL" || 
      substationData.status === "FAULT" ||
      (substationData.fault_type && 
       substationData.fault_type !== "NIL" && 
       substationData.fault_type !== "Normal")
    );
    
    if (isSubstationOffline) {
      // Show button when substation is offline
      btn.style.display = 'block';
      btn.textContent = "⚡ Turn On Substation";
      btn.style.background = "rgba(244, 67, 54, 0.2)";
      btn.style.borderColor = "#f44336";
    } else {
      // Hide button when substation is online
      btn.style.display = 'none';
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
    
    // Initialize substation button visibility
    this.updateSubstationButtonVisibility();
  }
}
