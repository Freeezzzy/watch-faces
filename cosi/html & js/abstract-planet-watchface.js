// Globale Variablen
let orbitRadii = [150, 120, 90, 60];
let orbits = [];
let orbitSpeed = 0.005;
let minOrbitSpeed = 0.002;
let centerX = 0, centerY = 0;
let freedPlanets = [];
let freedOrbits = [];
let particles = [];
let currentSecond = 0;
const CANVAS_SIZE = 400;

function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  angleMode(RADIANS);
  frameRate(60);

  // Orbits initialisieren
  for (let i = 0; i < 4; i++) {
    orbits.push({ count: 0, angles: [], offset: random(TWO_PI) });
  }

  updateTime();
  setInterval(updateTime, 1000);
}

function draw() {
  background(0);
  handleInput();
  applyInertia();

  // Orbits "befreien" bei hoher Geschwindigkeit
  if (abs(orbitSpeed) > 0.13 && freedOrbits.length === 0) {
    for (let i = 0; i < orbitRadii.length; i++) {
      let angle = random(TWO_PI);
      freedOrbits.push({
        x: width / 2,
        y: height / 2,
        r: orbitRadii[i],
        vx: cos(angle) * 3,
        vy: sin(angle) * 3,
        id: i
      });
    }
  }

  updateFreedOrbits();
  translate(centerX, centerY);

  drawOrbits();
  drawPlanets();
  updateFreedPlanets();
  updateParticles();
  drawSeconds();
}

function handleInput() {
  if (keyIsDown(87)) orbitSpeed += 0.0004; // W-Taste
  if (keyIsDown(83)) orbitSpeed -= 0.0004; // S-Taste
}

function applyInertia() {
  if (!keyIsDown(87) && !keyIsDown(83)) {
    if (orbitSpeed > minOrbitSpeed) orbitSpeed -= 0.0003;
    else if (orbitSpeed < -minOrbitSpeed) orbitSpeed += 0.0003;
  }
}

function updateTime() {
  let h = hour();
  let m = minute();
  let s = second();
  currentSecond = s;

  let digits = [int(h / 10), h % 10, int(m / 10), m % 10];

  for (let i = 0; i < 4; i++) {
    let count = digits[i];
    orbits[i].count = count;

    let angleStep = TWO_PI / max(count, 1);

    if (orbits[i].angles.length < count) {
      for (let j = orbits[i].angles.length; j < count; j++) {
        orbits[i].angles.push(j * angleStep);
      }
    } else if (orbits[i].angles.length > count) {
      orbits[i].angles.splice(count);
    }
  }
}

function drawOrbits() {
  noFill();
  stroke(100);
  strokeWeight(1);
  if (freedOrbits.length === 0) {
    for (let i = 0; i < orbitRadii.length; i++) {
      ellipse(width / 2, height / 2, orbitRadii[i] * 2);
    }
  } else {
    for (let o of freedOrbits) {
      ellipse(o.x, o.y, o.r * 2);
    }
  }
}

function drawPlanets() {
  noStroke();
  for (let i = 0; i < 4; i++) {
    let orbit = orbits[i];
    let base = freedOrbits.find(o => o.id === i) || { x: width / 2, y: height / 2, r: orbitRadii[i] };

    for (let j = 0; j < orbit.count; j++) {
      let angle = orbit.angles[j];
      let x = base.x + cos(angle + orbit.offset) * base.r;
      let y = base.y + sin(angle + orbit.offset) * base.r;

      if (abs(orbitSpeed) > 0.13) {
        let vx = cos(angle + orbit.offset) * orbitSpeed * 30;
        let vy = sin(angle + orbit.offset) * orbitSpeed * 30;
        freedPlanets.push({ x, y, vx, vy, life: 255 });
        continue;
      }

      if (abs(orbitSpeed) > 0.08) {
        fill(255, 255, 100);
        ellipse(x, y, 8);
        for (let k = 0; k < 5; k++) {
          particles.push({
            x: x,
            y: y,
            vx: random(-1, 1),
            vy: random(-1, 1),
            alpha: 255
          });
        }
      } else {
        fill(255);
        ellipse(x, y, 8);
      }

      orbit.angles[j] += orbitSpeed;
    }
  }
}

function updateFreedPlanets() {
  for (let i = freedPlanets.length - 1; i >= 0; i--) {
    let p = freedPlanets[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > width) {
      p.vx *= -0.9;
      p.x = constrain(p.x, 0, width);
    }
    if (p.y < 0 || p.y > height) {
      p.vy *= -0.9;
      p.y = constrain(p.y, 0, height);
    }

    fill(255, 255, 100, p.life);
    ellipse(p.x, p.y, 6);
    p.life -= 3;

    if (p.life <= 0) freedPlanets.splice(i, 1);
  }
}

function updateFreedOrbits() {
  for (let i = 0; i < freedOrbits.length; i++) {
    let o = freedOrbits[i];
    o.x += o.vx;
    o.y += o.vy;

    if (o.x - o.r < 0 || o.x + o.r > width) {
      o.vx *= -0.8;
      o.x = constrain(o.x, o.r, width - o.r);
    }
    if (o.y - o.r < 0 || o.y + o.r > height) {
      o.vy *= -0.8;
      o.y = constrain(o.y, o.r, height - o.r);
    }
  }

  if (abs(orbitSpeed) < 0.05 && freedOrbits.length > 0) {
    freedOrbits = [];
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 5;

    fill(255, 255, 100, p.alpha);
    ellipse(p.x, p.y, 2);

    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawSeconds() {
  let radius = orbitRadii[0] + 30;
  let cx = width / 2;
  let cy = height / 2;

  for (let i = 0; i < 60; i++) {
    let angle = TWO_PI * (i / 60) - HALF_PI;
    let x = cx + cos(angle) * radius;
    let y = cy + sin(angle) * radius;

    let pulse = 1.5 + sin(frameCount * 0.1 + i) * 1.5;

    if (i === currentSecond) {
      fill(255, 255, 100);
      ellipse(x, y, 5 + pulse);
    } else {
      fill(120);
      ellipse(x, y, 3 + pulse * 0.5);
    }
  }
}

//test test