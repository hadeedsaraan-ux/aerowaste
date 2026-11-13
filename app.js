// --- Step 1: Three.js 3D Dystopian City & Smog Engine ---

const btnEnter = document.getElementById('btn-enter-world');
const introScreen = document.getElementById('intro-screen');
const cityHud = document.getElementById('city-hud');
const btnBoardroom = document.getElementById('btn-goto-boardroom');

let scene, camera, renderer, buildings = [], smogParticles;

btnEnter.addEventListener('click', () => {
  // Fade out intro overlay
  introScreen.classList.add('fade-out');
  setTimeout(() => {
    cityHud.classList.remove('hidden');
  }, 1000);

  init3DWorld();
});

btnBoardroom.addEventListener('click', () => {
  alert('Step 1 complete! Next step mein hum Corporate Boardroom aur Funding Pitch design karenge.');
});

function init3DWorld() {
  const container = document.getElementById('canvas-container');

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020408);
  scene.fog = new THREE.FogExp2(0x090d16, 0.035);

  // Camera setup
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 15, 50);
  camera.lookAt(0, 0, 0);

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Lighting (Moody Dystopian Cyan & Red Glow)
  const ambientLight = new THREE.AmbientLight(0x111827, 1.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xff0055, 2);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  const cyanLight = new THREE.PointLight(0x00f0ff, 3, 50);
  cyanLight.position.set(0, 5, 0);
  scene.add(cyanLight);

  // Create Dystopian City Skyline (Procedural Grid of Buildings)
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
    metalness: 0.2
  });

  const wireframeMat = new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.4 });

  for (let x = -40; x <= 40; x += 6) {
    for (let z = -40; z <= 40; z += 6) {
      // Skip center road
      if (Math.abs(x) < 6 || Math.abs(z) < 6) continue;

      const height = Math.random() * 25 + 5;
      const geom = new THREE.BoxGeometry(4.5, height, 4.5);
      const mesh = new THREE.Mesh(geom, buildingMat);
      
      mesh.position.set(x, height / 2, z);
      scene.add(mesh);
      buildings.push(mesh);
    }
  }

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(120, 120);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x020408, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Smog / Toxic Particle Clouds
  const particleGeo = new THREE.BufferGeometry();
  const particleCount = 700;
  const posArray = new Float32Array(particleCount * 3);

  for(let i = 0; i < particleCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 90;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 1.8,
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending
  });

  smogParticles = new THREE.Points(particleGeo, particleMat);
  scene.add(smogParticles);

  // Window resize handler
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate3D();
}

let angle = 0;
function animate3D() {
  requestAnimationFrame(animate3D);

  // Slow Cinematic Camera Orbit around the City
  angle += 0.0015;
  camera.position.x = Math.cos(angle) * 45;
  camera.position.z = Math.sin(angle) * 45;
  camera.position.y = 18 + Math.sin(angle * 2) * 3;
  camera.lookAt(0, 5, 0);

  // Drift Smog particles
  if (smogParticles) {
    smogParticles.rotation.y += 0.0008;
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
