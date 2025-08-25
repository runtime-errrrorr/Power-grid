// ========================== Utility Functions ==========================

import { SUBSTATION_ID } from './config.js';

// DOM Utilities
export function getElement(id) {
  return document.getElementById(id);
}

export function addClass(el, cls) { 
  if (el) el.classList.add(cls); 
}

export function removeClass(el, cls) { 
  if (el) el.classList.remove(cls); 
}

// Pole Utilities
export function downstreamIds(fromId) {
  const ids = [];
  for (let i = fromId - 1; i >= 1; i--) ids.push(i);
  return ids;
}

export function getPoleMarkerEl(markers, id) {
  const m = markers[id];
  if (!m) return null;
  const el = m.getElement && m.getElement();
  if (!el) return null;
  if (id === SUBSTATION_ID) {
    return el.querySelector('.triangle-marker') || el;
  }
  return el; // for circleMarker, this is the <path> element
}

export function getLineEl(lineObj) {
  if (!lineObj || !lineObj.line) return null;
  return lineObj.line.getElement && lineObj.line.getElement();
}

// Alert and Logging Utilities
// Persistent alert banner: shows until explicitly cleared.
// Debounces identical repeating messages to avoid re-renders.
export function showAlert(msg) {
  const banner = getElement("alertBanner");
  if (!banner) return;
  // Avoid re-writing if same message is already shown
  const currentMsg = banner.getAttribute('data-msg') || '';
  const isVisible = banner.classList.contains('show');
  if (isVisible && currentMsg === String(msg)) return;
  banner.setAttribute('data-msg', String(msg));
  banner.innerText = msg;
  banner.style.display = "block";
  void banner.offsetWidth;
  banner.classList.add("show");
}

export function clearAlert() {
  const banner = getElement("alertBanner");
  if (!banner) return;
  banner.classList.remove("show");
  banner.removeAttribute('data-msg');
  setTimeout(() => (banner.style.display = "none"), 300);
}

export function logEvent(eventLogEl, msg, type = 'info', data = null) {
  let color = '#e0e0e0';
  if (type === 'fault') color = '#f44336';
  if (type === 'warn') color = '#ffc107';
  if (eventLogEl) {
    eventLogEl.innerHTML += `<span style="color:${color};">${new Date().toLocaleTimeString()} - ${msg}</span><br>`;
    eventLogEl.scrollTop = eventLogEl.scrollHeight;
  }
}

export function updateSystemStatus(status) {
  const light = getElement("status-light");
  const text = getElement("status-text");
  if (!light || !text) return;
  text.innerText = status;
  if (status === "FAULT") { 
    light.style.background = '#f44336'; 
    text.style.color = '#f44336'; 
  }
  else if (status === "WARNING") { 
    light.style.background = '#ffc107'; 
    text.style.color = '#ffc107'; 
  }
  else { 
    light.style.background = '#4caf50'; 
    text.style.color = '#4caf50'; 
  }
}
