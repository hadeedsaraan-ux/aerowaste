// --- Planetary Global State ---
const gameState = {
  earthAqi: 382,
  maya: {
    unlocked: true,
    completed: false,
    polymersHarvested: 0,
    targetPolymers: 30,
    lungFilter: 18,
    oxygenReserve: 3.2
  },
  kael: {
    unlocked: false,
    completed: false,
    plasmaTemp: 1800,
    vBlocksForged: 0,
    targetVBlocks: 2,
    powerGenerated: 1400,
    targetPower: 5000
  },
  vance: {
    unlocked: false,
    completed: false,
    railCharge: 28,
    trajectoryLocked: false
  },
  currentOperative: null,
  audioPlaying: false
};

// --- DOM References ---
const screenSelect = document.getElementById('screen-character-select');
const screenCockpit = document.getElementById('screen-mission-cockpit');
const btnBack = document.getElementById('btn-back-to-select');
const activeOpTitle = document.getElementById('active-op-title');
const missionObjective = document.getElementById('mission-objective');
const hudToxin = document.getElementById('hud-toxin');
const hudReserve = document.getElementById('hud-reserve');
const stageWorkspace = document.getElementById('stage-workspace');
const dialogueSpeaker = document.getElementById('dialogue-speaker');
const dialogueText = document.getElementById('dialogue-text');
const controlActions = document.getElementById('control-buttons-container');
const missionLog = document.getElementById('mission-log');
const btnAudio = document.getElementById('btn-ambient-sound');
const globalTimer = document.getElementById('global-timer');

const cardKael = document.getElementById('card-kael');
const cardVance = document.getElementById('card-vance');

// --- Web Audio API: Procedural Sci-Fi Ambient Drone ---
let audioCtx = null;
let droneOsc = null;
let droneGain = null;

function toggleAmbientAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!gameState.audioPlaying) {
    audioCtx.resume();
    droneOsc = audioCtx.createOscillator();
    droneGain = audioCtx.createGain();

    droneOsc.type = 'sawtooth';
    droneOsc.frequency.setValueAtTime(55, audioCtx.currentTime); // Low A1 note

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, audioCtx.currentTime);

    droneGain.gain.setValueAtTime(0.04, audioCtx.currentTime);

    droneOsc.connect(filter);
    filter.connect(droneGain);
    droneGain.connect(audioCtx.destination);

    droneOsc.start();
    gameState.audioPlaying = true;
    btnAudio.textContent = '🔊 AUDIO: ACTIVE';
    btnAudio.style.borderColor = 'var(--cyan-neon)';
    addLog('[COMM] Atmospheric audio feed connected.', 'sys');
  } else {
    droneGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    setTimeout(() => {
      droneOsc.stop();
      droneOsc.disconnect();
      gameState.audioPlaying = false;
      btnAudio.textContent = '🔇 AMBIENT AUDIO';
      btnAudio.style.borderColor = 'rgba(255,255,255,0.15)';
    }, 500);
  }
}
btnAudio.addEventListener('click', toggleAmbientAudio);

// --- Mission Log Helper ---
function addLog(msg, type = 'normal') {
  const p = document.createElement('p');
  p.className = `log-entry ${type}`;
  p.textContent = msg;
  missionLog.appendChild(p);
  missionLog.scrollTop = missionLog.scrollHeight;
}

// --- Cinematic Typewriter Effect ---
let typeTimeout = null;
function typeDialogue(speaker, text) {
  clearTimeout(typeTimeout);
  dialogueSpeaker.textContent = speaker.toUpperCase();
  dialogueText.textContent = '';
  let i = 0;
  function step() {
    if (i < text.length) {
      dialogueText.textContent += text.charAt(i);
      i++;
      typeTimeout = setTimeout(step, 18);
    }
  }
  step();
}

// --- Operative Navigation ---
document.querySelectorAll('.character-card').forEach(card => {
  card.addEventListener('click', () => {
    const char = card.dataset.char;
    if (card.classList.contains('locked')) {
      return addLog(`[SECURITY] Operative ${char.toUpperCase()} is locked. Complete previous mission.`, 'alert');
    }
    loadOperativeCockpit(char);
  });
});

btnBack.addEventListener('click', () => {
  screenCockpit.classList.remove('active');
  screenSelect.classList.add('active');
  updateSelectionCards();
});

function loadOperativeCockpit(char) {
  gameState.currentOperative = char;
  screenSelect.classList.remove('active');
  screenCockpit.classList.add('active');

  controlActions.innerHTML = '';
  stageWorkspace.innerHTML = '';

  if (char === 'maya') setupMayaMission();
  if (char === 'kael') setupKaelMission();
  if (char === 'vance') setupVanceMission();
}

// ==========================================
// 1. MAYA CHEN (GROUND SCAVENGER)
// ==========================================
function setupMayaMission() {
  activeOpTitle.textContent = 'OPERATIVE: MAYA CHEN // SECTOR 04';
  missionObjective.textContent = `OBJECTIVE: Harvest ${gameState.maya.targetPolymers}kg polymers & restore oxygen`;
  
  hudToxin.textContent = '488 PPM';
  hudToxin.className = 'hud-val color-warn';
  hudReserve.textContent = `${gameState.maya.oxygenReserve} L`;
  hudReserve.className = 'hud-val color-cyan';

  typeDialogue('MAYA', '"The acid fog is thick today. My throat burns... I need 30kg of high-grade plastic to sell to Dr. Kael\'s sub-refinery before my rebreather shuts down."');

  // Interactive Stage: Spawn Debris Grid
  renderMayaWorkspace();

  // Control Buttons
  const btnScan = document.createElement('button');
  btnScan.className = 'cockpit-btn btn-action-primary';
  btnScan.textContent = '⚡ Ultrasonic Pulse Scan (Find Polymers)';
  btnScan.onclick = () => {
    addLog('[RADAR] Dense microplastic silt and polymer hulls tagged in Sector 04.', 'sys');
    renderMayaWorkspace(true);
  };

  const btnBreathe = document.createElement('button');
  btnBreathe.className = 'cockpit-btn';
  btnBreathe.textContent = '🫁 Emergency Adrenaline Filter Purge';
  btnBreathe.onclick = () => {
    gameState.maya.lungFilter = Math.min(100, gameState.maya.lungFilter + 15);
    addLog('[BIO] Lung filter flushed. Respiration stabilized momentarily.', 'success');
  };

  controlActions.appendChild(btnScan);
  controlActions.appendChild(btnBreathe);
}

function renderMayaWorkspace(pulse = false) {
  stageWorkspace.innerHTML = '';
  const container = document.createElement('div');
  container.style.cssText = 'display:flex; flex-wrap:wrap; gap:12px; justify-content:center; max-width:440px;';

  const items = [
    { name: 'Industrial Polycarbonate', kg: 6.5 },
    { name: 'Contaminated PET Slurry', kg: 4.2 },
    { name: 'Nylon Mesh Shards', kg: 5.0 },
    { name: 'High-Density Polymer Core', kg: 8.5 },
    { name: 'Degraded Silt Pellets', kg: 6.0 }
  ];

  items.forEach(item => {
    const chip = document.createElement('div');
    chip.style.cssText = `
      background: ${pulse ? 'rgba(0, 240, 255, 0.25)' : 'rgba(255, 183, 3, 0.15)'};
      border: 1px solid ${pulse ? 'var(--cyan-neon)' : 'var(--amber-neon)'};
      color: #fff;
      padding: 10px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      user-select: none;
      transition: all 0.2s;
    `;
    chip.textContent = `[+] ${item.name} (${item.kg}kg)`;
    chip.onclick = () => harvestItem(chip, item.kg);
    container.appendChild(chip);
  });

  stageWorkspace.appendChild(container);
}

function harvestItem(element, kg) {
  gameState.maya.polymersHarvested += kg;
  gameState.maya.oxygenReserve += parseFloat((kg * 0.6).toFixed(1));
  hudReserve.textContent = `${gameState.maya.oxygenReserve.toFixed(1)} L`;

  element.style.transform = 'scale(0)';
  setTimeout(() => element.remove(), 200);

  addLog(`[SCAVENGE] Harvested ${kg}kg polymers. Earned +${(kg * 0.6).toFixed(1)}L medical oxygen.`, 'normal');

  if (gameState.maya.polymersHarvested >= gameState.maya.targetPolymers && !gameState.maya.completed) {
    gameState.maya.completed = true;
    gameState.kael.unlocked = true;
    typeDialogue('MAYA', '"Bag is full! 30kg secured. Transmitting haul directly to Dr. Kael\'s underground furnace. My lungs can breathe again!"');
    addLog('[MISSION ACCOMPLISHED] Maya secured required polymers. DR. KAEL UNLOCKED.', 'success');
    updateSelectionCards();
  }
}

// ==========================================
// 2. DR. KAEL (PLASMA VITRIFICATION)
// ==========================================
function setupKaelMission() {
  activeOpTitle.textContent = 'OPERATIVE: DR. KAELEN THORNE // SUB-TERRAIN';
  missionObjective.textContent = `OBJECTIVE: Forge ${gameState.kael.targetVBlocks} Vitrified V-Blocks & Generate 5,000 kWh`;

  hudToxin.textContent = 'REACTOR: 1,800°C';
  hudToxin.className = 'hud-val color-cyan';
  hudReserve.textContent = `${gameState.kael.powerGenerated} kWh`;
  hudReserve.className = 'hud-val color-amber';

  typeDialogue('DR. KAEL', '"Maya\'s polymer shipment arrived. We won\'t burn this into the sky. We are vitrifying the chemical toxins into bulletproof glass blocks, and routing plasma power to the launch rail."');

  renderKaelWorkspace();

  const btnVitrify = document.createElement('button');
  btnVitrify.className = 'cockpit-btn btn-action-primary';
  btnVitrify.textContent = '🔥 Engage Plasma Arc (Forge V-Block)';
  btnVitrify.onclick = () => forgeVBlock();

  const btnDAC = document.createElement('button');
  btnDAC.className = 'cockpit-btn';
  btnDAC.textContent = '🌀 Direct Air Capture (Suck Atmospheric Soot)';
  btnDAC.onclick = () => {
    gameState.earthAqi = Math.max(30, gameState.earthAqi - 24);
    globalTimer.textContent = `EARTH AQI: ${gameState.earthAqi} // RECOVERING`;
    addLog('[DAC ENGINE] Electrostatic scrubber absorbed 1.2 metric tons of carbon soot.', 'success');
  };

  controlActions.appendChild(btnVitrify);
  controlActions.appendChild(btnDAC);
}

function renderKaelWorkspace() {
  stageWorkspace.innerHTML = `
    <div style="text-align:center;">
      <div style="width:140px; height:140px; border-radius:50%; border:2px dashed var(--cyan-neon); margin:0 auto 16px; display:flex; justify-content:center; align-items:center; background: radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 70%);">
        <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--cyan-neon);">PLASMA CORE<br>${gameState.kael.vBlocksForged}/${gameState.kael.targetVBlocks} BLOCKS</span>
      </div>
      <p style="font-family:var(--font-mono); font-size:0.85rem; color:var(--text-muted);">
        Stabilized Inert Glass: <strong>${gameState.kael.vBlocksForged} Blocks</strong><br>
        Grid Power for Rocket: <strong>${gameState.kael.powerGenerated} / 5,000 kWh</strong>
      </p>
    </div>
  `;
}

function forgeVBlock() {
  gameState.kael.vBlocksForged += 1;
  gameState.kael.powerGenerated += 1800;
  hudReserve.textContent = `${gameState.kael.powerGenerated} kWh`;
  renderKaelWorkspace();

  addLog(`[FURNACE] Toxins vitrified into bulletproof non-leaching glass. Generated +1,800 kWh.`, 'normal');

  if (gameState.kael.vBlocksForged >= gameState.kael.targetVBlocks && gameState.kael.powerGenerated >= gameState.kael.targetPower && !gameState.kael.completed) {
    gameState.kael.completed = true;
    gameState.vance.unlocked = true;
    typeDialogue('DR. KAEL', '"Both toxic V-Blocks are inert and solid. Launch power threshold exceeded! Alerting Commander Vance at the orbital gantry."');
    addLog('[MISSION ACCOMPLISHED] Vitrification complete. COMMANDER VANCE UNLOCKED.', 'success');
    updateSelectionCards();
  }
}

// ==========================================
// 3. COMMANDER VANCE (ORBITAL VENUS LAUNCH)
// ==========================================
function setupVanceMission() {
  activeOpTitle.textContent = 'OPERATIVE: COMMANDER VANCE // EQUATORIAL GANTRY';
  missionObjective.textContent = 'OBJECTIVE: Eject Vitrified Poison on Trans-Venus Slingshot';

  hudToxin.textContent = 'RAIL: READY';
  hudToxin.className = 'hud-val color-emerald';
  hudReserve.textContent = 'TARGET: VENUS';
  hudReserve.className = 'hud-val color-cyan';

  typeDialogue('COMMANDER VANCE', '"Toxic glass payloads loaded into magnetic rail shuttle. We are using Earth\'s gravity assist to fling this poison toward Venus. Zero propellant smoke in our atmosphere."');

  renderVanceWorkspace();

  const btnLock = document.createElement('button');
  btnLock.className = 'cockpit-btn';
  btnLock.textContent = '📐 Calculate Hohmann Transfer Vector';
  btnLock.onclick = () => {
    gameState.vance.trajectoryLocked = true;
    addLog('[GUIDANCE] Gravitational slingshot calculated. Perigee: 11.4 km/s. LOCK ACQUIRED.', 'sys');
    renderVanceWorkspace(true);
  };

  const btnFire = document.createElement('button');
  btnFire.className = 'cockpit-btn btn-action-primary';
  btnFire.textContent = '🚀 FIRE NEGATIVE-EMISSION SHUTTLE';
  btnFire.onclick = () => fireShuttle();

  controlActions.appendChild(btnLock);
  controlActions.appendChild(btnFire);
}

function renderVanceWorkspace(locked = false) {
  stageWorkspace.innerHTML = `
    <div style="width:100%; height:200px; background:#000; border-radius:10px; border:1px solid rgba(255,255,255,0.1); position:relative; overflow:hidden; display:flex; justify-content:center; align-items:center;">
      <canvas id="cinemaCanvas" width="400" height="190"></canvas>
    </div>
  `;

  const canvas = document.getElementById('cinemaCanvas');
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Earth
  ctx.beginPath();
  ctx.arc(60, 95, 14, 0, Math.PI * 2);
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Draw Venus
  ctx.beginPath();
  ctx.arc(330, 95, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '10px JetBrains Mono';
  ctx.fillText('EARTH', 45, 130);
  ctx.fillText('VENUS', 315, 130);

  if (locked) {
    ctx.strokeStyle = '#00f0ff';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(60, 95);
    ctx.quadraticCurveTo(200, 20, 330, 95);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function fireShuttle() {
  if (!gameState.vance.trajectoryLocked) {
    return alert('Please calculate the Hohmann Transfer Vector first!');
  }

  addLog('[IGNITION] Electromagnetic pulse released. No chemical smoke emitted.', 'sys');
  addLog('[TELEMETRY] Payload cleared Earth escape velocity (11.2 km/s)...', 'sys');

  typeDialogue('COMMANDER VANCE', '"Ejection complete. The toxic poison is heading into the Venusian sun-furnace. Earth stays our only home—and today, she breathes a little easier."');

  setTimeout(() => {
    gameState.earthAqi = 48;
    globalTimer.textContent = 'EARTH AQI: 48 // CLEAN & RESTORED';
    addLog('[VICTORY] Remainder of cycle complete. Earth Air Restored to Safe Status.', 'success');
    alert('PLANETARY DIRECTIVE COMPLETE! Earth healed through Maya, Kael, and Vance.');
  }, 1800);
}

// --- Unlock Cards Helper ---
function updateSelectionCards() {
  if (gameState.kael.unlocked) {
    cardKael.classList.remove('locked');
    const btn = cardKael.querySelector('button');
    btn.disabled = false;
    btn.className = 'btn-select-char primary';
    btn.textContent = 'Assume Control: Dr. Kael »';
  }
  if (gameState.vance.unlocked) {
    cardVance.classList.remove('locked');
    const btn = cardVance.querySelector('button');
    btn.disabled = false;
    btn.className = 'btn-select-char primary';
    btn.textContent = 'Assume Control: Vance »';
  }
}
