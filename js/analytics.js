// ================= Analytics =================
let voltageChart, currentChart;
let analyticsVisible = true;

function initializeAnalytics() {
  const poleSelect = document.getElementById('selectedPole');
  poles.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.name;
    poleSelect.appendChild(option);
  });
  initializeCharts();
  setupResizeHandler();
}

function initializeCharts() {
  const voltageCtx = document.getElementById('voltageChart').getContext('2d');
  const currentCtx = document.getElementById('currentChart').getContext('2d');
  const chartConfig = {
    type: 'line',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second',
            displayFormats: { second: 'HH:mm:ss' }
          },
          ticks: { autoSkip: true, maxTicksLimit: 8 }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#ccc' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      },
      plugins: { legend: { labels: { color: '#ccc' } } }
    }
  };

  voltageChart = new Chart(voltageCtx, {
    ...chartConfig,
    data: {
      datasets: poles.map(p => ({
        label: `Pole ${p.id} Voltage`,
        data: analyticsData.voltageData[p.id],
        borderColor: '#00bfff',
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointRadius: 0
      }))
    }
  });

  currentChart = new Chart(currentCtx, {
    ...chartConfig,
    data: {
      datasets: poles.map(p => ({
        label: `Pole ${p.id} Current`,
        data: analyticsData.currentData[p.id],
        borderColor: '#ff9800',
        borderWidth: 2,
        tension: 0.3,
        fill: false,
        pointRadius: 0
      }))
    }
  });
}

function addAnalyticsData(poleId, voltage, current) {
  const ts = Date.now();
  if (!analyticsData.voltageData[poleId]) analyticsData.voltageData[poleId] = [];
  if (!analyticsData.currentData[poleId]) analyticsData.currentData[poleId] = [];

  if (!isNaN(voltage)) {
    analyticsData.voltageData[poleId].push({ x: ts, y: voltage });
    if (analyticsData.voltageData[poleId].length > analyticsData.maxDataPoints)
      analyticsData.voltageData[poleId].shift();
  }
  if (!isNaN(current)) {
    analyticsData.currentData[poleId].push({ x: ts, y: current });
    if (analyticsData.currentData[poleId].length > analyticsData.maxDataPoints)
      analyticsData.currentData[poleId].shift();
  }
  if (voltageChart && currentChart) {
    voltageChart.update('none');
    currentChart.update('none');
  }
}

function updateAnalytics() {
  const selected = document.getElementById('selectedPole').value;
  if (selected === "all") {
    voltageChart.data.datasets.forEach(ds => ds.hidden = false);
    currentChart.data.datasets.forEach(ds => ds.hidden = false);
  } else {
    voltageChart.data.datasets.forEach(ds => ds.hidden = !ds.label.includes(`Pole ${selected}`));
    currentChart.data.datasets.forEach(ds => ds.hidden = !ds.label.includes(`Pole ${selected}`));
  }
  voltageChart.update();
  currentChart.update();
}

function clearAnalyticsData() {
  poles.forEach(p => {
    analyticsData.voltageData[p.id] = [];
    analyticsData.currentData[p.id] = [];
  });
  if (voltageChart && currentChart) {
    voltageChart.update();
    currentChart.update();
  }
}

function toggleAnalytics() {
  const block = document.getElementById('analyticsBlock');
  analyticsVisible = !analyticsVisible;
  block.style.display = analyticsVisible ? "block" : "none";
}

function setupResizeHandler() {
  const block = document.getElementById('analyticsBlock');
  const handle = block.querySelector('.resize-handle');
  let isResizing = false, startY = 0, startHeight = 0;

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
    const newHeight = Math.max(200, Math.min(800, startHeight - deltaY));
    block.style.height = `${newHeight}px`;
  });

  window.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = 'default';
  });
}
