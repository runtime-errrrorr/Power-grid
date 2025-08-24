// ================= Fault Behaviors =================
function clearPoleFaultIcon(poleId) {
    const overlay = faultIcons[poleId];
    if (overlay) {
      map.removeLayer(overlay);
      delete faultIcons[poleId];
    }
  }
  function setPoleFaultIcon(poleId, svgPath) {
    clearPoleFaultIcon(poleId);
    const p = poles.find(x => x.id === poleId);
    if (!p) return;
    const icon = L.divIcon({
      className: "fault-icon",
      html: `<img src="${svgPath}" style="width:16px;height:16px;" />`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    const overlay = L.marker(p.coords, { icon, interactive: false, pane: 'markerPane' }).addTo(map);
    faultIcons[poleId] = overlay;
  }
  function clearAllFaultIcons() {
    Object.keys(faultIcons).forEach(id => clearPoleFaultIcon(+id));
  }
  
  function removeOverUnderClasses() {
    poles.forEach(p => {
      const el = getPoleMarkerEl(p.id);
      removeClass(el, 'overvoltage-pole');
      removeClass(el, 'undervoltage-pole');
    });
    lines.forEach(Lobj => {
      const lel = getLineEl(Lobj);
      removeClass(lel, 'overvoltage-line');
      removeClass(lel, 'undervoltage-line');
    });
  }
  
  function removeNeutralClasses() {
    poles.forEach(p => {
      const el = getPoleMarkerEl(p.id);
      removeClass(el, 'pole-neutral');
    });
    lines.forEach(Lobj => {
      const lel = getLineEl(Lobj);
      removeClass(lel, 'line-neutral');
    });
  }
  
  function applyNeutralFault(poleId) {
    removeOverUnderClasses();
    setPoleColor(poleId, COLOR.NEUTRAL_DARK, { includeLines: false });
    clearPoleFaultIcon(poleId);
    const down = downstreamIds(poleId);
    down.forEach(id => setPoleColor(id, COLOR.WARNING));
    lines.forEach(Lobj => {
      if (Lobj.ids.some(id => down.includes(id))) {
        Lobj.line.setStyle({ color: COLOR.WARNING });
        addClass(getLineEl(Lobj), 'line-neutral');
      }
    });
    logEvent(`Neutral Fault at Pole ${poleId}`, "warn");
    showAlert(`⚡ Neutral Fault at Pole ${poleId}`);
    updateSystemStatus("WARNING");
  }
  
  function applyShortOrLTG(poleId, label) {
    removeOverUnderClasses();
    removeNeutralClasses();
    setPoleColor(poleId, COLOR.FAULT, { includeLines: false });
    setPoleFaultIcon(poleId, "caution.svg");
    const down = downstreamIds(poleId);
    down.forEach(id => setPoleColor(id, COLOR.OFF));
    lines.forEach(Lobj => {
      if (Lobj.ids.some(id => down.includes(id))) {
        Lobj.line.setStyle({ color: COLOR.OFF });
      } else {
        Lobj.line.setStyle({ color: COLOR.OK });
      }
    });
    logEvent(`${label} at Pole ${poleId}`, "fault");
    showAlert(`⚡ ${label} at Pole ${poleId}`);
    updateSystemStatus("FAULT");
  }
  
  function applyOverUnderGlobal(type, faultPoleId, numericVoltage) {
    removeNeutralClasses();
    clearAllColors();
    removeOverUnderClasses();
    clearAllFaultIcons();
    setPoleFaultIcon(faultPoleId, "caution.svg");
  
    const lineClass = (type === "Overvoltage") ? "overvoltage-line" : "undervoltage-line";
    const poleClass = (type === "Overvoltage") ? "overvoltage-pole" : "undervoltage-pole";
    const lineColor = (type === "Overvoltage") ? COLOR.OVERVOLT : COLOR.UNDERVOLT;
    const label = (type === "Overvoltage") ? "Overvoltage" : "Undervoltage";
  
    lines.forEach(Lobj => {
      Lobj.line.setStyle({
        color: lineColor,
        weight: (type === "Overvoltage" ? 5 : 4),
        opacity: (type === "Overvoltage" ? 0.95 : 0.8)
      });
      addClass(getLineEl(Lobj), lineClass);
    });
    poles.forEach(p => {
      if (p.id === SUBSTATION_ID) return;
      setPoleColor(p.id, lineColor, { borderOnly: true, includeLines: false });
      const el = getPoleMarkerEl(p.id);
      addClass(el, poleClass);
    });
  
    const extra = (numericVoltage != null) ? ` (${numericVoltage}V)` : "";
    logEvent(`${label} condition across network${extra} — origin Pole ${faultPoleId}`, "warn");
    showAlert(`⚠️ ${label} detected — propagating from Pole ${faultPoleId}${extra}`);
    updateSystemStatus("WARNING");
  }
  