// ========================== State Management ==========================

import { POLES, SUBSTATION_ID, ANALYTICS_MAX_DATA_POINTS } from './config.js';

// Application State
export class AppState {
  constructor() {
    this.markers = {};          // poleId -> Leaflet marker
    this.lines = [];            // [{ids:[a,b], line:L.Polyline}]
    this.poleData = {};         // telemetry per pole
    this.faultIcons = {};       // poleId -> overlay icon marker
    this.selectedPoleId = null; // last clicked pole
    this.substationOnline = true; // Track substation state
    
    // Analytics data storage
    this.analyticsData = {
      timestamps: [],
      voltageData: {},
      currentData: {},
      maxDataPoints: ANALYTICS_MAX_DATA_POINTS
    };
    
    this.initializeState();
  }
  
  initializeState() {
    // Initialize pole data defaults
    POLES.forEach(p => {
      this.poleData[p.id] = {
        voltage: "---",
        current: "---",
        fault_code: "---",
        fault_type: "Normal",
        status: "OK",
        breaker_status: "---",
        timestamp: Date.now()
      };
      this.analyticsData.voltageData[p.id] = [];
      this.analyticsData.currentData[p.id] = [];
    });
  }
  
  // Getters
  getMarkers() { return this.markers; }
  getLines() { return this.lines; }
  getPoleData() { return this.poleData; }
  getFaultIcons() { return this.faultIcons; }
  getSelectedPoleId() { return this.selectedPoleId; }
  getSubstationOnline() { return this.substationOnline; }
  getAnalyticsData() { return this.analyticsData; }
  
  // Setters
  setMarkers(markers) { this.markers = markers; }
  setLines(lines) { this.lines = lines; }
  setPoleData(poleData) { this.poleData = poleData; }
  setFaultIcons(faultIcons) { this.faultIcons = faultIcons; }
  setSelectedPoleId(id) { this.selectedPoleId = id; }
  setSubstationOnline(online) { this.substationOnline = online; }
  
  // State update methods
  updatePoleData(poleId, data) {
    this.poleData[poleId] = { ...this.poleData[poleId], ...data, timestamp: data.timestamp || Date.now() };
  }
  
  addMarker(poleId, marker) {
    this.markers[poleId] = marker;
  }
  
  addLine(line) {
    this.lines.push(line);
  }
  
  addFaultIcon(poleId, icon) {
    this.faultIcons[poleId] = icon;
  }
  
  removeFaultIcon(poleId) {
    delete this.faultIcons[poleId];
  }
  
  clearAllFaultIcons() {
    this.faultIcons = {};
  }
  
  addAnalyticsData(poleId, voltage, current) {
    const ts = Date.now();
    
    if (!this.analyticsData.voltageData[poleId]) this.analyticsData.voltageData[poleId] = [];
    if (!this.analyticsData.currentData[poleId]) this.analyticsData.currentData[poleId] = [];
    
    if (!isNaN(voltage)) {
      this.analyticsData.voltageData[poleId].push({ x: ts, y: voltage });
      if (this.analyticsData.voltageData[poleId].length > this.analyticsData.maxDataPoints)
        this.analyticsData.voltageData[poleId].shift();
    }
    
    if (!isNaN(current)) {
      this.analyticsData.currentData[poleId].push({ x: ts, y: current });
      if (this.analyticsData.currentData[poleId].length > this.analyticsData.maxDataPoints)
        this.analyticsData.currentData[poleId].shift();
    }
  }
  
  clearAnalyticsData() {
    POLES.forEach(p => {
      this.analyticsData.voltageData[p.id] = [];
      this.analyticsData.currentData[p.id] = [];
    });
  }
  
  reset() {
    this.poleData = {};
    this.faultIcons = {};
    this.substationOnline = true;
    this.selectedPoleId = null;
    this.initializeState();
  }
}

// Create and export singleton instance
export const appState = new AppState();
