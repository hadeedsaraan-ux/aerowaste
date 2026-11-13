// --- Canvas Setup ---
const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');

const charStateLabel = document.getElementById('char-state-label');
const oxygenStat = document.getElementById('oxygen-stat');
const debrisStat = document.getElementById('debris-stat');
const clickHint = document.getElementById('click-hint');

// --- World State ---
let world = {
  oxygen: 14, // percentage
  smogDensity: 85,
  debrisList: [
    { id: 1, x: 280, y: 440, type: 'bottle', collected: false },
    { id: 2, x: 420, y: 450, type: 'bag', collected: false },
    { id: 3, x: 550, y: 435, type: 'can', collected: false }
  ],
  particles: []
};

// --- Human Character State ---
// States: 'COUGHING', 'WALKING_TO_TRASH', 'BENDING', 'RETURNING', 'DELIVERING'
let human = {
  x: 120,
  y: 420,
  targetX: 120,
  state: 'COUGHING',
  breathTimer: 0,
  bendProgress: 0, // 0 to 1 for bending down
  carrying: null,
  coughParticles: []
};

// --- Smog Particles Background ---
for (let i = 0; i < 40; i++) {
  world.particles.push({
    x: Math.random() * canvas.width,
    y: Math.random() * 350,
    vx: (Math.random() - 0.5) * 0.6 - 0.3,
    size: Math.random() * 40 + 20,
    opacity: Math.random() * 0.25 + 0.1
  });
}

// --- Interaction / Click Handling ---
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  // Check if any uncollected debris was clicked
  world.debrisList.forEach(item => {
    if (!item.collected && Math.hypot(clickX - item.x, clickY - item.y) < 35) {
      // Send human to this trash
      human.targetX = item.x;
      human.state = 'WALKING_TO_TRASH';
      human.targetDebris = item;
      clickHint.style.display = 'none';
    }
  });
});

// --- Toolbar Buttons ---
document.getElementById('btn-spawn-trash').addEventListener('click', () => {
  const newX = 200 + Math.random() * 450;
  world.debrisList.push({
    id: Date.now(),
    x: newX,
    y: 430 + Math.random() * 30,
    type: Math.random() > 0.5 ? 'bottle' : 'bag',
    collected: false
  });
  updateStats();
});

document.getElementById('btn-toggle-smog').addEventListener('click', () => {
  world.smogDensity = world.smogDensity > 50 ? 20 : 90;
  updateStats();
});

document.getElementById('btn-reset-scene').addEventListener('click', () => {
  human.x = 120;
  human.targetX = 120;
  human.state = 'COUGHING';
  human.carrying = null;
});

// --- Main Animation & Render Loop ---
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Sky & Background Gradient (Polluted Orange/Grey/Purple)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, '#0a0d14');
  skyGrad.addColorStop(0.5, '#161c2d');
  skyGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw Factory Silhouette on the Right
  drawFactory(850, 220);

  // 3. Draw Road / Ground
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 430, canvas.width, 120);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 430);
  ctx.lineTo(canvas.width, 430);
  ctx.stroke();

  // Road grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < canvas.width; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 430);
    ctx.lineTo(i - 40, 550);
    ctx.stroke();
  }

  // 4. Update & Draw Smog Particles
  world.particles.forEach(p => {
    p.x += p.vx;
    if (p.x < -50) p.x = canvas.width + 50;
    if (p.x > canvas.width + 50) p.x = -50;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(148, 163, 184, ${p.opacity * (world.smogDensity / 100)})`;
    ctx.fill();
  });

  // 5. Draw Debris on Ground
  world.debrisList.forEach(item => {
    if (!item.collected) {
      drawTrashItem(item.x, item.y, item.type);
    }
  });

  // 6. Update & Draw Human Character
  updateHumanBehavior();
  drawHuman(human.x, human.y, human.state, human.bendProgress, human.carrying);

  requestAnimationFrame(animate);
}

// --- Character Logic & State Machine ---
function updateHumanBehavior() {
  const factoryX = 890;

  if (human.state === 'WALKING_TO_TRASH') {
    if (Math.abs(human.x - human.targetX) > 2) {
      human.x += human.x < human.targetX ? 2.5 : -2.5;
    } else {
      // Reached trash -> start bending down
      human.state = 'BENDING';
      human.bendProgress = 0;
    }
  } 
  else if (human.state === 'BENDING') {
    human.bendProgress += 0.04; // bending down speed
    if (human.bendProgress >= 1) {
      // Picked up!
      if (human.targetDebris) {
        human.targetDebris.collected = true;
        human.carrying = human.targetDebris.type;
      }
      human.state = 'RETURNING';
    }
  } 
  else if (human.state === 'RETURNING') {
    // Un-bend first while walking back or walk back carrying
    if (human.bendProgress > 0) human.bendProgress -= 0.04;

    // Walk towards factory (x = 850)
    if (Math.abs(human.x - factoryX) > 10) {
      human.x += human.x < factoryX ? 2.5 : -2.5;
    } else {
      // Reached factory -> deliver!
      human.state = 'DELIVERING';
      setTimeout(() => {
        human.carrying = null;
        world.oxygen = Math.min(100, world.oxygen + 30);
        world.smogDensity = Math.max(15, world.smogDensity - 20);
        updateStats();
        
        // Return to starting post
        human.targetX = 150;
        human.state = 'WALKING_HOME';
      }, 800);
    }
  }
  else if (human.state === 'WALKING_HOME') {
    if (Math.abs(human.x - human.targetX) > 2) {
      human.x += human.x < human.targetX ? -2.5 : 2.5;
    } else {
      human.state = 'COUGHING';
    }
  }
  else if (human.state === 'COUGHING') {
    human.breathTimer += 0.05;
    // Periodic subtle cough particles
    if (Math.random() < 0.03) {
      human.coughParticles.push({ x: human.x, y: human.y - 45, vx: Math.random() - 0.5, vy: -1, alpha: 0.8 });
    }
  }

  updateStats();
}

// --- Drawing Helpers ---
function drawFactory(fx, fy) {
  // Factory Structure
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(fx - 70, fy, 140, 210);

  // Chimney
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(fx + 20, fy - 60, 30, 70);

  // Plasma Core Window / Glow
  ctx.beginPath();
  ctx.arc(fx, fy + 70, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#00f0ff';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#fff';
  ctx.font = '11px JetBrains Mono';
  ctx.fillText('AEROWASTE', fx - 42, fy + 190);
  ctx.fillText('REFINERY', fx - 34, fy + 205);
}

function drawTrashItem(tx, ty, type) {
  ctx.save();
  ctx.translate(tx, ty);
  if (type === 'bottle') {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-4, -12, 8, 20);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-3, -16, 6, 4);
  } else {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHuman(hx, hy, state, bend, carrying) {
  ctx.save();
  ctx.translate(hx, hy);

  // Bending offset calculation
  const bendOffset = bend * 35;

  // Legs
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  if (state === 'BENDING') {
    // Bent knees
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-12, 25);
    ctx.lineTo(-4, 50);
    ctx.moveTo(6, 0);
    ctx.lineTo(12, 25);
    ctx.lineTo(4, 50);
    ctx.stroke();
  } else {
    // Standing / Walking legs
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-8, 50);
    ctx.moveTo(6, 0);
    ctx.lineTo(8, 50);
    ctx.stroke();
  }

  // Torso (tilts forward when bending)
  ctx.save();
  if (state === 'BENDING') {
    ctx.translate(0, 0);
    ctx.rotate(bend * 0.8); // bend forward
  }

  ctx.fillStyle = '#475569';
  ctx.fillRect(-10, -45 + (state === 'BENDING' ? bendOffset * 0.5 : 0), 20, 45);

  // Head
  ctx.beginPath();
  ctx.arc(0, -62 + (state === 'BENDING' ? bendOffset : 0), 10, 0, Math.PI * 2);
  ctx.fillStyle = '#f8fafc';
  ctx.fill();

  // Re-breather mask (showing struggling to breathe)
  ctx.fillStyle = '#ff0055';
  ctx.fillRect(-5, -60 + (state === 'BENDING' ? bendOffset : 0), 10, 6);

  // Arms & Carrying
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (state === 'BENDING') {
    // Arms reaching down to ground
    ctx.moveTo(-8, -30);
    ctx.lineTo(-2, 10);
  } else {
    // Normal arms
    ctx.moveTo(-8, -35);
    ctx.lineTo(-12, -5);
  }
  ctx.stroke();

  // Draw carrying trash if applicable
  if (carrying) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-18, -15, 6, 12);
  }

  ctx.restore();
  ctx.restore();
}

function updateStats() {
  const activeDebris = world.debrisList.filter(d => !d.collected).length;
  debrisStat.textContent = `${activeDebris} ITEMS`;
  oxygenStat.textContent = `${Math.round(world.oxygen)}%`;

  if (world.oxygen > 60) {
    oxygenStat.className = 'success';
    charStateLabel.textContent = 'HUMAN STATUS: BREATHING CLEAN AIR (RECOVERED)';
  } else {
    oxygenStat.className = 'danger';
    charStateLabel.textContent = 'HUMAN STATUS: STRUGGLING TO BREATHE (COUGHING)';
  }
}

// --- Initialize ---
updateStats();
animate();
