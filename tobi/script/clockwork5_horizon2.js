let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Vector = Matter.Vector;

let engine, world;
let hourCenter;
let minutePoints = [];
let secondParticles = [];

let sekundenPartikelProSekunde = 3;
let lastSecond = -1;
let lastMinute = -1;
let activeMinuteIndex = -1;

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;

  createHourCenter(hour());
generateMinutePoints(minute());

}

function draw() {
  background(0);
  Engine.update(engine);

  let h = hour();
  let m = minute();
  let s = second();

  drawHourCenter();

  // Neue Sekundenpartikel pro Sekunde erzeugen
  if (s !== lastSecond) {
    for (let i = 0; i < sekundenPartikelProSekunde; i++) {
      spawnSecondParticle();
    }
    lastSecond = s;
  }

  updateMinuteMovement(m, s);
  updateSecondParticles();

  drawMinutePoints();
  drawSecondParticles();

  if (m === 59 && s === 59) {
    handleHourTransition((h + 1) % 24);
  }

  drawDebugInfo(); // 🟡 Anzeige der aktuellen Partikel
}

// Stunde erzeugen / aktualisieren
function createHourCenter(h) {
  if (hourCenter) World.remove(world, hourCenter);
  let r = map(h, 0, 23, 10, 60);
  hourCenter = Bodies.circle(width / 2, height / 2, r, { isStatic: true });
  hourCenter.radius = r;
  hourCenter.totalGrowth = 0;
  World.add(world, hourCenter);
}

function drawHourCenter() {
  fill('#FF4444');
  noStroke();
  ellipse(hourCenter.position.x, hourCenter.position.y, hourCenter.radius * 2);
}

// Minutenpunkte erzeugen
function generateMinutePoints(currentMinute = 0) {
  minutePoints = [];
  for (let i = 0; i < 60; i++) {
    let pos = randomPointAwayFromCenter(hourCenter.position, 200);
    let b = Bodies.circle(pos.x, pos.y, 8, { frictionAir: 0.05 });

    b.originalPosition = { x: pos.x, y: pos.y };
    b.active = false;
    b.assignedSecond = null;

    // Alles vor der aktuellen Minute ist bereits verschluckt
    if (i < currentMinute) {
      b.targetReached = true;
      // NICHT zum World hinzufügen!
    } else {
      b.targetReached = false;
      World.add(world, b);
    }

    minutePoints.push(b);
  }
  activeMinuteIndex = currentMinute;
}



// Minutenpunkt → Stundenpunkt Bewegung
function updateMinuteMovement(m, s) {
  if (m !== lastMinute) {
    activeMinuteIndex = m;
    lastMinute = m;
  }

  for (let i = 0; i < minutePoints.length; i++) {
    let mp = minutePoints[i];
    if (mp.targetReached) continue;

    if (i === activeMinuteIndex) {
      let progress = constrain(s / 59, 0, 1);
      let target = hourCenter.position;
      let origin = mp.originalPosition;
      let newX = lerp(origin.x, target.x, progress);
      let newY = lerp(origin.y, target.y, progress);
      Body.setPosition(mp, { x: newX, y: newY });

      if (s === 59) {
        World.remove(world, mp);
        mp.targetReached = true;
        hourCenter.totalGrowth += 1;
        hourCenter.radius += map(1, 0, 59, 0, 1);
      }
    }
  }
}

function drawMinutePoints() {
  fill(180);
  for (let mp of minutePoints) {
    if (!mp.targetReached) {
      ellipse(mp.position.x, mp.position.y, 16);
    }
  }
}

// Sekundenpartikel erzeugen
function spawnSecondParticle() {
  let target = getClosestFreeMinutePoint();
  if (!target) return;

  target.assignedSecond = true;

  let pos = randomPointAwayFromCenter(hourCenter.position, 300);
  let b = Bodies.circle(pos.x, pos.y, 4, { frictionAir: 0.02 });
  b.origin = { x: pos.x, y: pos.y };
  b.target = target;
  b.spawnTime = millis();
  b.lifetime = 1000; // 1 Sekunde Bewegung
  secondParticles.push(b);
  World.add(world, b);
}

// Sekundenpartikel Bewegung & Verschluckung
function updateSecondParticles() {
  let now = millis();
  for (let i = secondParticles.length - 1; i >= 0; i--) {
    let sp = secondParticles[i];
    let t = (now - sp.spawnTime) / sp.lifetime;
    if (t >= 1) {
      World.remove(world, sp);
      sp.target.assignedSecond = null;
      secondParticles.splice(i, 1);
    } else {
      let newX = lerp(sp.origin.x, sp.target.position.x, t);
      let newY = lerp(sp.origin.y, sp.target.position.y, t);
      Body.setPosition(sp, { x: newX, y: newY });
    }
  }
}

function drawSecondParticles() {
  fill(220);
  for (let sp of secondParticles) {
    ellipse(sp.position.x, sp.position.y, 6);
  }
}

// Stunde beenden und neu starten
function handleHourTransition(nextHour) {
  if (minutePoints.some(mp => !mp.targetReached)) return;
  if (secondParticles.length > 0) return;

  createHourCenter(nextHour);
  generateMinutePoints();
  secondParticles = [];
}

// Hilfsfunktionen
function randomPointAwayFromCenter(center, minDist) {
  let angle = random(TWO_PI);
  let radius = random(minDist, minDist + 200);
  return {
    x: center.x + cos(angle) * radius,
    y: center.y + sin(angle) * radius
  };
}

function getClosestFreeMinutePoint() {
  let available = minutePoints.filter(mp => !mp.targetReached && !mp.assignedSecond);
  if (available.length === 0) return null;

  let closest = null;
  let minDist = Infinity;
  for (let mp of available) {
    let d = dist(mp.position.x, mp.position.y, width / 2, height / 2);
    if (d < minDist) {
      minDist = d;
      closest = mp;
    }
  }
  return closest;
}

// 🟡 Anzeige: Punkt-Zähler
function drawDebugInfo() {
  fill(255);
  noStroke();
  textSize(16);
  textAlign(LEFT, TOP);

  let minutenAktiv = minutePoints.filter(mp => !mp.targetReached).length;
  let sekundenAktiv = secondParticles.length;
  let stundenAktiv = hourCenter ? 1 : 0;

  let info = `🕓 Stundenpunkt: ${stundenAktiv}
🕑 Minutenpunkte: ${minutenAktiv}
⏱ Sekundenpunkte: ${sekundenAktiv}`;

  text(info, 10, 10);
}
