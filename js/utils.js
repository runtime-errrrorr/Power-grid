// ================= Utilities =================
function downstreamIds(fromId) {
    const ids = [];
    for (let i = fromId - 1; i >= 1; i--) ids.push(i);
    return ids;
  }
  
  function getPoleMarkerEl(id) {
    const m = markers[id];
    if (!m) return null;
    const el = m.getElement && m.getElement();
    if (!el) return null;
    if (id === SUBSTATION_ID) {
      return el.querySelector('.triangle-marker') || el;
    }
    return el; // circleMarker
  }
  
  function getLineEl(lineObj) {
    if (!lineObj || !lineObj.line) return null;
    return lineObj.line.getElement && lineObj.line.getElement();
  }
  
  function addClass(el, cls) { if (el) el.classList.add(cls); }
  function removeClass(el, cls) { if (el) el.classList.remove(cls); }
  
  function resetAllVisuals() {
    clearAllColors();
    clearAllFaultIcons();
    removeOverUnderClasses();
    removeNeutralClasses();
  }
  