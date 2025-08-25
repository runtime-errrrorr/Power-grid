// ========================== Fault Manager ==========================

import { COLOR, SUBSTATION_ID, POLES } from './config.js';
import { appState } from './state.js';
import { downstreamIds, getPoleMarkerEl, getLineEl, addClass, removeClass, logEvent, showAlert, clearAlert, updateSystemStatus } from './utils.js';

export class FaultManager {
  constructor(mapManager) {
    this.mapManager = mapManager;
    this.uiManager = null;
  }
  
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }
  
  updateSubstationStatus(data) { 
    // Handle substation status updates from MQTT
    // Expected JSON format: { substation_id, voltage, current, fault_code, fault_type, status, breaker_status, timestamp }
    
    const substationId = SUBSTATION_ID;
    const status = (data.status || "OK").toUpperCase();
    const voltage = parseFloat(data.voltage) || 0;
    const current = parseFloat(data.current) || 0;
    const faultCode = data.fault_code || 0;
    const faultType = (data.fault_type || "NIL").toUpperCase();
    const breakerStatus = data.breaker_status || "CLOSED";
    
    // Update substation data in state
    appState.updatePoleData(substationId, {
      pole_id: substationId,
      voltage: voltage,
      current: current,
      status: status,
      fault_code: faultCode,
      fault_type: faultType,
      breaker_status: breakerStatus,
      timestamp: Date.now()
    });
    
    // Handle different fault types and statuses
    if (status === "CRITICAL" || faultType !== "NIL") {
      // Substation fault affects entire network
      this.mapManager.resetAllVisuals();
      this.mapManager.setPoleColor(substationId, COLOR.FAULT, { includeLines: false });
      
      // Turn off all non-substation poles based on configured order
      POLES.filter(p => p.id !== substationId).forEach(p => this.mapManager.setPoleColor(p.id, COLOR.OFF));
      
      // Turn off all lines
      const lines = appState.getLines();
      lines.forEach(Lobj => Lobj.line.setStyle({ color: COLOR.OFF }));
      
      // Determine fault message based on fault type
      let faultMessage = "Substation fault — all poles disconnected";
      if (faultType === "LINE TO LINE") {
        faultMessage = "Substation line-to-line fault — all poles disconnected";
      } else if (faultType === "LINE TO GROUND") {
        faultMessage = "Substation line-to-ground fault — all poles disconnected";
      }
      
      const eventLogEl = document.getElementById('eventLog');
      logEvent(eventLogEl, faultMessage, "fault", data);
      showAlert(`⚡ ${faultMessage}`);
      updateSystemStatus("FAULT");
      
      // Update substation online state
      appState.setSubstationOnline(false);
    } else if (status === "WARNING") {
      this.mapManager.setPoleColor(substationId, COLOR.WARNING, { borderOnly: true });
      const eventLogEl = document.getElementById('eventLog');
      logEvent(eventLogEl, "Substation warning", "warn", data);
      updateSystemStatus("WARNING");
    } else {
      // OK status - normal working condition
      this.mapManager.setPoleColor(substationId, COLOR.OK);
      this.mapManager.clearPoleFaultIcon(substationId);
      
      // Update substation online state
      appState.setSubstationOnline(true);
      
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
        clearAlert();
      }
    }
    
    // Update analytics for substation
    if (!isNaN(voltage) || !isNaN(current)) {
      appState.addAnalyticsData(substationId, voltage, current);
    }
    
    // Update UI button visibility if UI manager is available
    if (this.uiManager && this.uiManager.updateSubstationButtonVisibility) {
      this.uiManager.updateSubstationButtonVisibility();
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
  
  // Neutral Break (code 10): fault pole and downstream yellow; lines to downstream yellow
  applyNeutralBreakWarning(poleId) {
    this.mapManager.removeOverUnderClasses();
    this.mapManager.removeNeutralClasses();
    this.mapManager.clearPoleFaultIcon(poleId);

    // Fault pole yellow
    this.mapManager.setPoleColor(poleId, COLOR.WARNING, { includeLines: false });

    const down = downstreamIds(poleId);
    // Downstream poles yellow
    down.forEach(id => this.mapManager.setPoleColor(id, COLOR.WARNING));

    // Lines to downstream yellow
    const lines = appState.getLines();
    lines.forEach(Lobj => {
      if (Lobj.ids.some(id => down.includes(id))) {
        Lobj.line.setStyle({ color: COLOR.WARNING });
      } else {
        Lobj.line.setStyle({ color: COLOR.OK });
      }
    });

    const eventLogEl = document.getElementById('eventLog');
    logEvent(eventLogEl, `Neutral Break at Pole ${poleId}`, "warn");
    showAlert(`⚠️ Neutral Break at Pole ${poleId}`);
    updateSystemStatus("WARNING");
  }

  // Line Fault (code 27): fault pole red with caution, downstream greyed out (OFF); lines grey
  applyLineFaultCritical(poleId) {
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
    logEvent(eventLogEl, `Line Fault at Pole ${poleId}`, "fault");
    showAlert(`⚡ Line Fault at Pole ${poleId}`);
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
      POLES.filter(p => p.id !== SUBSTATION_ID).forEach(p => this.mapManager.setPoleColor(p.id, COLOR.OFF));
      const lines = appState.getLines();
      lines.forEach(Lobj => Lobj.line.setStyle({ color: COLOR.OFF }));
      
      const eventLogEl = document.getElementById('eventLog');
      logEvent(eventLogEl, "Substation offline — all poles disconnected", "fault", data);
      showAlert("⚡ Substation offline — all poles disconnected");
      updateSystemStatus("FAULT");
      
      // Update substation online state
      appState.setSubstationOnline(false);
      
      // Update UI button visibility if UI manager is available
      if (this.uiManager && this.uiManager.updateSubstationButtonVisibility) {
        this.uiManager.updateSubstationButtonVisibility();
      }
      
      return;
    }

    if (status === "FAULT") {
      switch (normalizedType) {
        case "short":
          this.applyShortOrLTG(pole_id, "Short Circuit Fault");
          break;
        case "linetoground":
          this.applyShortOrLTG(pole_id, "Line-to-Ground Fault");
          break;
        case "line fault":
          this.applyLineFaultCritical(pole_id);
          break;
        case "neutralfault":
        case "neutral break":
          // For neutral break, fault and downstream yellow
          this.applyNeutralBreakWarning(pole_id);
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
        import('./utils.js').then(utils => utils.clearAlert());
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
