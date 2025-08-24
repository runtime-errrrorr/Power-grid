// ========================== Analytics Manager ==========================

import { POLES, CHART_CONFIG } from './config.js';
import { appState } from './state.js';

export class AnalyticsManager {
  constructor() {
    this.voltageChart = null;
    this.currentChart = null;
    this.analyticsVisible = true;
    this.initializeAnalytics();
  }
  
  initializeAnalytics() {
    const poleSelect = document.getElementById('selectedPole');
    POLES.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = p.name;
      poleSelect.appendChild(option);
    });
    this.initializeCharts();
    this.setupResizeHandler();
  }
  
  initializeCharts() {
    const voltageCtx = document.getElementById('voltageChart').getContext('2d');
    const currentCtx = document.getElementById('currentChart').getContext('2d');
    const chartConfig = {
      type: 'line',
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: CHART_CONFIG.ANIMATION_DURATION },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'second',
              displayFormats: { second: 'HH:mm:ss' }
            },
            ticks: { autoSkip: true, maxTicksLimit: CHART_CONFIG.MAX_TICKS }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#ccc' },
            grid: { color: 'rgba(255,255,255,0.1)' }
          }
        },
        plugins: {
          legend: { labels: { color: '#ccc' } }
        }
      }
    };

    this.voltageChart = new Chart(voltageCtx, {
      ...chartConfig,
      data: {
        datasets: POLES.map(p => ({
          label: `Pole ${p.id} Voltage`,
          data: appState.getAnalyticsData().voltageData[p.id],
          borderColor: '#00bfff',
          borderWidth: 2,
          tension: CHART_CONFIG.LINE_TENSION,
          fill: false,
          pointRadius: CHART_CONFIG.POINT_RADIUS
        }))
      }
    });

    this.currentChart = new Chart(currentCtx, {
      ...chartConfig,
      data: {
        datasets: POLES.map(p => ({
          label: `Pole ${p.id} Current`,
          data: appState.getAnalyticsData().currentData[p.id],
          borderColor: '#ff9800',
          borderWidth: 2,
          tension: CHART_CONFIG.LINE_TENSION,
          fill: false,
          pointRadius: CHART_CONFIG.POINT_RADIUS
        }))
      }
    });
  }
  
  updateCharts() {
    if (this.voltageChart && this.currentChart) {
      this.voltageChart.update('none');
      this.currentChart.update('none');
    }
  }
  
  updateAnalytics() {
    const selected = document.getElementById('selectedPole').value;

    if (selected === "all") {
      this.voltageChart.data.datasets.forEach(ds => ds.hidden = false);
      this.currentChart.data.datasets.forEach(ds => ds.hidden = false);
    } else {
      this.voltageChart.data.datasets.forEach(ds => ds.hidden = !ds.label.includes(`Pole ${selected}`));
      this.currentChart.data.datasets.forEach(ds => ds.hidden = !ds.label.includes(`Pole ${selected}`));
    }

    this.voltageChart.update();
    this.currentChart.update();
  }
  
  clearAnalyticsData() {
    appState.clearAnalyticsData();
    this.updateCharts();
  }
  
  showAnalytics() {
    const block = document.getElementById('analyticsBlock');
    this.analyticsVisible = true;
    block.style.display = "block";
    this.updateViewGraphButton();
  }
  
  toggleAnalytics() {
    const block = document.getElementById('analyticsBlock');
    this.analyticsVisible = !this.analyticsVisible;
    block.style.display = this.analyticsVisible ? "block" : "none";
    this.updateViewGraphButton();
  }
  
  updateViewGraphButton() {
    const btn = document.getElementById('viewGraphBtn');
    if (btn) {
      if (this.analyticsVisible) {
        btn.textContent = "📉 Hide Graph";
        btn.onclick = () => this.toggleAnalytics();
      } else {
        btn.textContent = "📈 View Graph";
        btn.onclick = () => this.showAnalytics();
      }
    }
  }
  
  setupResizeHandler() {
    const block = document.getElementById('analyticsBlock');
    const handle = block.querySelector('.resize-handle');
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    handle.addEventListener('mousedown', e => {
      isResizing = true;
      startY = e.clientY;
      startHeight = block.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (!isResizing) return;
      
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(200, Math.min(800, startHeight - deltaY)); // Min 200px, Max 800px
      block.style.height = `${newHeight}px`;
    });

    window.addEventListener('mouseup', () => {
      isResizing = false;
      document.body.style.cursor = 'default';
    });
  }
  
  isVisible() {
    return this.analyticsVisible;
  }
  
  getCharts() {
    return { voltageChart: this.voltageChart, currentChart: this.currentChart };
  }
}
