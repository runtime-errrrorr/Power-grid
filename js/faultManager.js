// ========================== Fault Manager ==========================

import { COLOR, SUBSTATION_ID } from './config.js';
import { appState } from './state.js';
import { downstreamIds, getPoleMarkerEl, getLineEl, addClass, removeClass, logEvent, showAlert, updateSystemStatus } from './utils.js';

export class FaultManager {
  constructor(mapManager) {
    this.mapManager = mapManager;
  }
  
  updateSubstationStatus(data) {
    // Handle substation status updates from MQTT
    // Expected JSON format: { voltage, current, status, fault_code }
    
    const substationId = SUBSTATION_ID;
    const status = (data.status || "OK").toUpperCase();
    const voltage = parseFloat(data.voltage) || 0;
    const current = parseFloat(data.current) || 0;
    const faultCode = data.fault_code || 0;
    
    // Update substation data in state
    appState.updatePoleData(substationId, {
      pole_id: substationId,
      voltage: voltage,
      current: current,
      status: status,
      fault_code: faultCode,
      timestamp: Date.now()
    });
    
    if (status === "FAULT") {
      // Substation fault affects entire network
      this.mapManager.resetAllVisuals();
      this.mapManager.setPoleColor(substationId, COLOR.FAULT, { includeLines: false });
      
      // Turn off all downstream poles
      [1, 2, 3, 4].forEach(id => this.mapManager.setPoleColor(id, COLOR.OFF));
      
      // Turn off all lines
      const lines = appState.getLines();
      lines.forEach(Lobj => Lobj.line.setStyle({ color: COLOR.OFF }));
      
      const eventLogEl = document.getElementById('eventLog');
      logEvent(eventLogEl, "Substation fault — all poles disconnected", "fault", data);
      showAlert("⚡ Substation fault — all poles disconnected");
      updateSystemStatus("FAULT");
    } else if (status === "WARNING") {
      this.mapManager.setPoleColor(substationId, COLOR.WARNING, { borderOnly: true });
      const eventLogEl = document.getElementById('eventLog');
      logEvent(eventLogEl, "Substation warning", "warn", data);
      updateSystemStatus("WARNING");
    } else {
      // OK status
      this.mapManager.setPoleColor(substationId, COLOR.OK);
      this.mapManager.clearPoleFaultIcon(substationId);
      
      // Check if we should reset network visuals
      const poleData = appState.getPoleData();
      const anyActive = Object.values(poleData).some(d =>
        d.pole_id !== substationId && 
        ((d.status === "FAULT") || 
         (d.status === "WARNING" && ["overvoltage","undervoltage","neutralfault","neutral break"].includes((d.fault_type||"").toLowerCase())))
      );
      
      if (!anyActive) {
        this.mapManager.resetAllVisuals();
        updateSystemStatus("OK");
      }
    }
    
    // Update analytics for substation
    if (!isNaN(voltage) || !isNaN(current)) {
      appState.addAnalyticsData(substationId, voltage, current);
    }
  }
  
  applyNeutralFault(poleId) {
    this.mapManager.removeOverUnderClasses();
    this.mapManager.setPoleColor(poleId, COLOR.NEUTRAL_DARK, { includeLines: false });
    this.mapManager.clearPoleFaultIcon(poleId);
    
    const down = downstreamIds(poleId);
    down.forEach(id => this.mapManager.setPoleColor(id, COLOR.WARNING));
    
    const lines = appState.getLines();
    lines.forEach(Lobj => {
      if (Lobj.ids.some(id => down.includes(id))) {
        Lobj.line.setStyle({ color: COLOR.WARNING });
        const lel = getLineEl(Lobj);
        addClass(lel, 'line-neutral');
      }
    });
    
    const eventLogEl = document.getElementById('eventLog');
    logEvent(eventLogEl, `Neutral Fault at Pole ${poleId}`, "warn");
    showAlert(`⚡ Neutral Fault at Pole ${poleId}`);
    updateSystemStatus("WARNING");
  }
  
  applyShortOrLTG(poleId, label) {
    this.mapManager.removeOverUnderClasses();
    this.mapManager.removeNeutralClasses();
    this.mapManager.setPoleColor(poleId, COLOR.FAULT, { includeLines: false });
    this.mapManager.setPoleFaultIcon(poleId, "./assets/caution.svg");
    
    const down = downstreamIds(poleId);
    down.forEach(id => this.mapManager.setPoleColor(id, COLOR.OFF));
    
    const lines = appState.getLines();
    lines.forEach(Lobj => {
      if (Lobj.ids.some(id => down.includes(id))) {
        Lobj.line.setStyle({ color: COLOR.OFF });
      } else {
        Lobj.line.setStyle({ color: COLOR.OK });
      }
    });
    
    const eventLogEl = document.getElementById('eventLog');
    logEvent(eventLogEl, `${label} at Pole ${poleId}`, "fault");
    showAlert(`⚡ ${label} at Pole ${poleId}`);
    updateSystemStatus("FAULT");
  }
  
  applyOverUnderGlobal(type, faultPoleId, numericVoltage) {
    this.mapManager.removeNeutralClasses();
    this.mapManager.clearAllColors();
    this.mapManager.removeOverUnderClasses();
    this.mapManager.clearAllFaultIcons();
    this.mapManager.setPoleFaultIcon(faultPoleId, "./assets/caution.svg");

    const lineClass = (type === "Overvoltage") ? "overvoltage-line" : "undervoltage-line";
    const poleClass = (type === "Overvoltage") ? "overvoltage-pole" : "undervoltage-pole";
    const lineColor = (type === "Overvoltage") ? COLOR.OVERVOLT : COLOR.UNDERVOLT;
    const label = (type === "Overvoltage") ? "Overvoltage" : "Undervoltage";

    const lines = appState.getLines();
    const markers = appState.getMarkers();
    
    lines.forEach(Lobj => {
      Lobj.line.setStyle({ 
        color: lineColor, 
        weight: (type === "Overvoltage" ? 5 : 4), 
        opacity: (type === "Overvoltage" ? 0.95 : 0.8) 
      });
      const lel = getLineEl(Lobj);
      addClass(lel, lineClass);
    });
    
    const poles = appState.getPoleData();
    Object.keys(poles).forEach(poleId => {
      if (Number(poleId) === SUBSTATION_ID) return;
      this.mapManager.setPoleColor(Number(poleId), lineColor, { borderOnly: true, includeLines: false });
      const el = getPoleMarkerEl(markers, Number(poleId));
      addClass(el, poleClass);
    });

    const extra = (numericVoltage != null) ? ` (${numericVoltage}V)` : "";
    const eventLogEl = document.getElementById('eventLog');
    logEvent(eventLogEl, `${label} condition across network${extra} — origin Pole ${faultPoleId}`, "warn");
    showAlert(`⚠️ ${label} detected — propagating from Pole ${faultPoleId}${extra}`);
    updateSystemStatus("WARNING");
  }
  
  updatePoleStatus(data) {
    const pole_id = Number(data.pole_id);
    if (!pole_id) { 
      console.warn("Missing pole_id", data); 
      return; 
    }

    // Normalize fault type (accepts fault_type or faultType)
    const rawType = data.fault_type || data.faultType || "Normal";
    const normalizedType = rawType.toLowerCase();
    const status = (data.status || "OK").toUpperCase();

    appState.updatePoleData(pole_id, data);

    // Special case: Substation fault => all downstream OFF
    if (pole_id === SUBSTATION_ID && status === "FAULT") {
      this.mapManager.resetAllVisuals();
      this.mapManager.setPoleColor(SUBSTATION_ID, COLOR.FAULT, { includeLines: false });
      [1,2,3,4].forEach(id => this.mapManager.setPoleColor(id, COLOR.OFF));
      const lines = appState.getLines();
      lines.forEach(Lobj => Lobj.line.setStyle({ color: COLOR.OFF }));
      
      const eventLogEl = document.getElementById('eventLog');
      logEvent(eventLogEl, "Substation offline — all poles disconnected", "fault", data);
      showAlert("⚡ Substation offline — all poles disconnected");
      updateSystemStatus("FAULT");
      return;
    }

    if (status === "FAULT") {
      switch (normalizedType) {
        case "short":
        case "line fault":
          this.applyShortOrLTG(pole_id, "Short Circuit Fault");
          break;
        case "linetoground":
          this.applyShortOrLTG(pole_id, "Line-to-Ground Fault");
          break;
        case "neutralfault":
        case "neutral break":
          this.applyNeutralFault(pole_id);
          break;
        case "overvoltage":
          this.mapManager.resetAllVisuals();
          this.applyOverUnderGlobal("Overvoltage", pole_id, data.voltage);
          break;
        case "undervoltage":
          this.mapManager.resetAllVisuals();
          this.applyOverUnderGlobal("Undervoltage", pole_id, data.voltage);
          break;
        default:
          this.applyShortOrLTG(pole_id, rawType);
      }
    } else if (status === "WARNING") {
      if (normalizedType === "overvoltage") {
        this.applyOverUnderGlobal("Overvoltage", pole_id, data.voltage);
      } else if (normalizedType === "undervoltage") {
        this.applyOverUnderGlobal("Undervoltage", pole_id, data.voltage);
      } else if (normalizedType === "neutralfault" || normalizedType === "neutral break") {
        this.applyNeutralFault(pole_id);
      } else {
        this.mapManager.setPoleColor(pole_id, COLOR.WARNING, { borderOnly: true });
        const eventLogEl = document.getElementById('eventLog');
        logEvent(eventLogEl, `Warning @ Pole ${pole_id}`, "warn", data);
        updateSystemStatus("WARNING");
      }
    } else {
      // OK case
      this.mapManager.clearPoleFaultIcon(pole_id);
      this.mapManager.setPoleColor(pole_id, COLOR.OK);

      // If no active issues, clear network visuals
      const poleData = appState.getPoleData();
      const anyActive = Object.values(poleData).some(d =>
        (d.status === "FAULT") || 
        (d.status === "WARNING" && ["overvoltage","undervoltage","neutralfault","neutral break"].includes((d.fault_type||d.faultType||"").toLowerCase()))
      );

      if (!anyActive) {
        this.mapManager.resetAllVisuals();
        updateSystemStatus("OK");
        const eventLogEl = document.getElementById('eventLog');
        logEvent(eventLogEl, "All clear — system normal.");
      } else {
        const eventLogEl = document.getElementById('eventLog');
        logEvent(eventLogEl, `OK @ Pole ${pole_id}`);
      }
    }

    // Update analytics
    const v = parseFloat(data.voltage);
    const c = parseFloat(data.current);
    if (!isNaN(v) || !isNaN(c)) {
      appState.addAnalyticsData(pole_id, v, c);
    }

    // Refresh side panel if this pole is selected
    if (appState.getSelectedPoleId() === pole_id) {
      if (window.showPole) {
        const pole = { id: pole_id, name: `Pole ${pole_id}` };
        window.showPole(pole);
      }
    }
  }
}
