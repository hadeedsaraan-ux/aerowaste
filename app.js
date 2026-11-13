// --- Planetary State ---
let state = {
  aqi: 342,
  oxygen: 12.5,
  energy: 1420,
  vBlocks: 0,
  bagCount: 0,
  sessionOxygen: 0,
  launchFuel: 1420,
  targetFuel: 5000,
  isRefining: false,
  isLaunching: false
};

// --- DOM References ---
const aqiDisplay = document.getElementById('aqi-display');
const oxygenDisplay = document.getElementById('oxygen-display');
const energyDisplay = document.getElementById('energy-display');
const vblocksDisplay = document.getElementById('vblocks-display');
const bagCountDisplay = document.getElementById('bag-count');
const sessionOxygenDisplay = document.getElementById('session-oxygen');
const wasteField = document.getElementById('waste-field');
const coreStatus = document.getElementById('core-status');
const fuelProgressBar = document.getElementById('fuel-progress-bar');
const fuelPctDisplay = document.getElementById('fuel-pct');
const btnLaunch = document.getElementById('btn-launch-shuttle');
const launchMsg = document.getElementById('launch-msg');
const trajStatus = document.getElementById('traj-status');
const trajVel = document.getElementById('traj-vel');

// Canvas
const canvas = document.getElementById('orbitCanvas');
const ctx = canvas.getContext('2d');

// Waste items generator
const debrisTypes = [
  { name: 'PET Bottle', kg: 0.25 },
  { name: 'Polyethylene Bag', kg: 0.15 },
  { name: 'Industrial Scrap', kg: 1.2 },
  { name: 'Microplastic Silt', kg: 0.5 },
  { name: 'Synthetic Mesh', kg: 0.8 }
];

function spawnDebris() {
  wasteField.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const item = debrisTypes[Math.floor(Math.random() * debrisTypes.length)];
    const token = document.createElement('div');
    token.className = 'waste-token';
    token.textContent = `${item.name} (${item.kg}kg)`;
    token.onclick = () => collectSingleDebris(token, item.kg);
    wasteField.appendChild(token);
  }
}

function collectSingleDebris(element, kg) {
  state.bagCount = parseFloat((state.bagCount + kg).toFixed(2));
  const earnedO2 = parseFloat((kg * 1.5).toFixed(2));
  state.sessionOxygen = parseFloat((state.sessionOxygen + earnedO2).toFixed(2));
  
  element.style.transform = 'scale(0)';
  setTimeout(() => element.remove(), 200);

  updateUI();
  if (wasteField.children.length <= 1) {
    setTimeout(spawnDebris, 500);
  }
}

// Button Events
document.getElementById('btn-collect-all').addEventListener('click', () => {
  const tokens = Array.from(wasteField.querySelectorAll('.waste-token'));
  tokens.forEach((t, idx) => {
    setTimeout(() => {
      state.bagCount = parseFloat((state.bagCount + 0.5).toFixed(2));
      state.sessionOxygen = parseFloat((state.sessionOxygen + 0.75).toFixed(2));
      t.remove();
      updateUI();
      if (idx === tokens.length - 1) setTimeout(spawnDebris, 400);
    }, idx * 60);
  });
});

document.getElementById('btn-deposit-refinery').addEventListener('click', () => {
  if (state.bagCount <= 0) return alert('Your collection bag is empty! Harvest some debris first.');
  state.oxygen = parseFloat((state.oxygen + state.sessionOxygen).toFixed(2));
  const depositedKg = state.bagCount;
  state.bagCount = 0;
  state.sessionOxygen = 0;
  
  // Instant visual feedback
  coreStatus.textContent = `QUEUED: ${depositedKg}kg POLYMERS`;
  updateUI();
});

document.getElementById('btn-refine').addEventListener('click', () => {
  if (state.isRefining) return;
  state.isRefining = true;
  coreStatus.textContent = 'VITRIFYING SLUDGE...';
  coreStatus.style.color = 'var(--amber-neon)';

  setTimeout(() => {
    // Generate Energy and V-Blocks
    const generatedEnergy = 850;
    state.energy += generatedEnergy;
    state.vBlocks += 1;
    state.aqi = Math.max(45, state.aqi - 18); // Reduce pollution

    coreStatus.textContent = '+1 V-BLOCK FORGED';
    coreStatus.style.color = 'var(--emerald-neon)';
    state.isRefining = false;

    updateUI();
  }, 1200);
});

document.getElementById('btn-feed-grid').addEventListener('click', () => {
  if (state.energy <= 0) return alert('No surplus energy in bank to transfer!');
  const transfer = Math.min(state.energy, 1200);
  state.energy -= transfer;
  state.launchFuel = Math.min(state.targetFuel, state.launchFuel + transfer);
  updateUI();
});

document.getElementById('btn-launch-shuttle').addEventListener('click', () => {
  if (state.launchFuel < state.targetFuel || state.vBlocks < 1 || state.isLaunching) return;
  startLaunchSequence();
});

function updateUI() {
  aqiDisplay.textContent = `${state.aqi} (${state.aqi < 100 ? 'Moderate' : 'Severe'})`;
  if (state.aqi < 150) aqiDisplay.className = 'value success';
  oxygenDisplay.textContent = `${state.oxygen} L`;
  energyDisplay.textContent = `${state.energy} kWh`;
  vblocksDisplay.textContent = `${state.vBlocks} Units`;
  bagCountDisplay.textContent = `${state.bagCount} kg`;
  sessionOxygenDisplay.textContent = `+${state.sessionOxygen} L`;

  // Fuel bar
  const pct = Math.min(100, Math.round((state.launchFuel / state.targetFuel) * 100));
  fuelProgressBar.style.width = `${pct}%`;
  fuelPctDisplay.textContent = `${pct}% (${state.launchFuel} / ${state.targetFuel} kWh)`;

  // Check launch condition
  if (state.launchFuel >= state.targetFuel && state.vBlocks >= 1) {
    btnLaunch.disabled = false;
    launchMsg.textContent = 'ALL SYSTEMS GO — Trans-Venus trajectory lock acquired.';
    launchMsg.style.color = 'var(--emerald-neon)';
  } else {
    btnLaunch.disabled = true;
    launchMsg.textContent = `Requires: Min 1 V-Block (${state.vBlocks}/1) & 5,000 kWh (${state.launchFuel}/5,000)`;
    launchMsg.style.color = 'var(--text-muted)';
  }
}

// --- Orbital Simulation (Canvas) ---
let shuttle = {
  active: false,
  progress: 0,
  x: 0,
  y: 0
};

function drawOrbitSimulation() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Background stars
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 30, 1.5, 1.5);
  ctx.fillRect(120, 180, 1, 1);
  ctx.fillRect(380, 50, 1.5, 1.5);
  ctx.fillRect(440, 200, 1, 1);

  // Sun
  ctx.beginPath();
  ctx.arc(cx - 100, cy, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Orbit Paths
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  
  // Venus Orbit
  ctx.beginPath();
  ctx.arc(cx - 100, cy, 75, 0, Math.PI * 2);
  ctx.stroke();

  // Earth Orbit
  ctx.beginPath();
  ctx.arc(cx - 100, cy, 145, 0, Math.PI * 2);
  ctx.stroke();

  // Venus Planet
  const venusX = cx - 100 + Math.cos(1.8) * 75;
  const venusY = cy + Math.sin(1.8) * 75;
  ctx.beginPath();
  ctx.arc(venusX, venusY, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();

  // Earth Planet
  const earthX = cx - 100 + Math.cos(3.8) * 145;
  const earthY = cy + Math.sin(3.8) * 145;
  ctx.beginPath();
  ctx.arc(earthX, earthY, 9, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '10px JetBrains Mono';
  ctx.fillText('SUN', cx - 110, cy - 20);
  ctx.fillText('VENUS', venusX - 16, venusY + 18);
  ctx.fillText('EARTH', earthX - 16, earthY + 20);

  // Shuttle Trajectory Arc
  if (shuttle.active) {
    shuttle.progress += 0.008;

    // Bezier curve trajectory Earth -> Venus
    const t = shuttle.progress;
    const p0 = { x: earthX, y: earthY };
    const p1 = { x: cx, y: cy - 70 };
    const p2 = { x: venusX, y: venusY };

    shuttle.x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
    shuttle.y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

    // Trajectory dashed trace
    ctx.strokeStyle = '#10b981';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(p1.x, p1.y, shuttle.x, shuttle.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Rocket Shuttle
    ctx.beginPath();
    ctx.arc(shuttle.x, shuttle.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    trajVel.textContent = `${(11.2 + t * 18.5).toFixed(1)} km/s`;

    if (shuttle.progress >= 1) {
      shuttle.active = false;
      state.isLaunching = false;
      state.vBlocks = Math.max(0, state.vBlocks - 1);
      state.launchFuel = 0;
      state.aqi = Math.max(25, state.aqi - 30);
      trajStatus.textContent = 'PAYLOAD DELIVERED TO VENUS';
      trajVel.textContent = '0.0 km/s';
      updateUI();
      alert('SUCCESS: 1 Payload of toxic V-Blocks safely ejected from Earth into Venus trajectory! Zero emissions released.');
    }
  }

  requestAnimationFrame(drawOrbitSimulation);
}

function startLaunchSequence() {
  state.isLaunching = true;
  shuttle.active = true;
  shuttle.progress = 0;
  trajStatus.textContent = 'ESCAPE TRAJECTORY ENGAGED';
  btnLaunch.disabled = true;
}

// Initial Run
spawnDebris();
updateUI();
drawOrbitSimulation();
