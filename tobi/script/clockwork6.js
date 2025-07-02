// Erweiterte Matter.js + p5.js Watchface mit Abstoßung und verbesserter Physik

const { Engine, World, Bodies, Body, Vector, Events, Runner } = Matter;
let engine, world, runner;
<<<<<<< HEAD
let staticBodies = [];
let dynamicBodies = [];
let targets = [];
let gravityDirection = { x: 0, y: 0.001 };

// Farben
const COLORS = {
  background: '#ffffff',
  static: '#bbbbbb',
  dynamic: '#0066cc',
  black: '#000000'
=======
let digitBodies = {}; // Speichert Bodies für jede Ziffer
let currentTime = { h10: 0, h1: 0, m10: 0, m1: 0 };
let lastTime = { h10: -1, h1: -1, m10: -1, m1: -1 };

// Digit patterns (5x7 grid, 1 = Punkt, 0 = leer)
const digitPatterns = {
  0: [
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1]
  ],
  1: [
    [0,0,1,0,0],
    [0,1,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [1,1,1,1,1]
  ],
  2: [
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1]
  ],
  3: [
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,1]
  ],
  4: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [0,0,0,0,1]
  ],
  5: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,1]
  ],
  6: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1]
  ],
  7: [
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,1,0,0,0],
    [1,0,0,0,0]
  ],
  8: [
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1]
  ],
  9: [
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,1]
  ]
>>>>>>> a81d166d1ca6a1a7f649c84f275c2c08a0d67dd2
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Matter.js Engine Setup
  engine = Engine.create();
  world = engine.world;
<<<<<<< HEAD
  engine.world.gravity.y = gravityDirection.y;
  engine.world.gravity.x = gravityDirection.x;
  
  runner = Runner.create();
  Runner.run(runner, engine);

  // Initiale Zeitform erstellen
  updateTimeShape();
  
  // Jede Minute aktualisieren
  setInterval(updateTimeShape, 60000);

  // Physics Update Event
  Events.on(engine, 'beforeUpdate', () => {
    updatePhysics();
  });
}

function draw() {
  background(COLORS.background);
  noStroke();

  // Dynamische blaue Punkte zeichnen
  fill(COLORS.dynamic);
  dynamicBodies.forEach(body => {
    ellipse(body.position.x, body.position.y, body.circleRadius * 2);
  });

  // Statische graue Punkte nur bis Minute 59 anzeigen
  if (minute() !== 59) {
    fill(COLORS.static);
    staticBodies.forEach(body => {
      ellipse(body.position.x, body.position.y, body.circleRadius * 2);
    });
  }

  // Debug-Info (optional)
  drawDebugInfo();
}

function updatePhysics() {
  dynamicBodies.forEach((body, index) => {
    if (body.target) {
      // Kraft zum Ziel
      const targetForce = Vector.sub(body.target, body.position);
      const distance = Vector.magnitude(targetForce);
      
      if (distance > 5) {
        const direction = Vector.normalise(targetForce);
        const forceMagnitude = map(distance, 0, 200, 0.0001, 0.0008);
        Body.applyForce(body, body.position, Vector.mult(direction, forceMagnitude));
      }

      // Abstoßungskraft zwischen dynamischen Körpern
      dynamicBodies.forEach((otherBody, otherIndex) => {
        if (index !== otherIndex) {
          const repulsionForce = calculateRepulsion(body, otherBody);
          Body.applyForce(body, body.position, repulsionForce);
        }
      });

      // Abstoßung von statischen Körpern
      staticBodies.forEach(staticBody => {
        const repulsionForce = calculateRepulsion(body, staticBody, 0.5);
        Body.applyForce(body, body.position, repulsionForce);
      });
    }
  });
}

function calculateRepulsion(body1, body2, strength = 1) {
  const distance = Vector.sub(body1.position, body2.position);
  const magnitude = Vector.magnitude(distance);
  const minDistance = (body1.circleRadius + body2.circleRadius) * 2;
  
  if (magnitude < minDistance && magnitude > 0) {
    const direction = Vector.normalise(distance);
    const forceMagnitude = (minDistance - magnitude) * 0.00005 * strength;
    return Vector.mult(direction, forceMagnitude);
  }
  
  return { x: 0, y: 0 };
}

function samplePoints(text, fontSize, density) {
  const pg = createGraphics(width, height);
  pg.clear();
  pg.textAlign(CENTER, CENTER);
  pg.textSize(fontSize);
  pg.textFont('monospace');
  pg.fill(COLORS.black);
  pg.text(text, width / 2, height / 2);
  pg.loadPixels();
  
  const points = [];
  for (let y = 0; y < height; y += density) {
    for (let x = 0; x < width; x += density) {
      const pixelIndex = 4 * (y * width + x);
      if (pg.pixels[pixelIndex + 3] > 128) { // Alpha-Kanal prüfen
        points.push({ x, y });
      }
    }
  }
  
  return points;
=======
  engine.gravity.y = 0;
  
  runner = Runner.create();
  Runner.run(runner, engine);
  
  createTimeDisplay();
  setInterval(updateTime, 1000);
}

function draw() {
  background(0);
  noStroke();
  
  // Zeichne alle Bodies
  world.bodies.forEach(body => {
    if (body.render && body.render.fillStyle) {
      fill(body.render.fillStyle);
      ellipse(body.position.x, body.position.y, body.circleRadius * 2);
    }
  });
}

function createTimeDisplay() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = now.getSeconds();
  
  currentTime = {
    h10: parseInt(hours[0]),
    h1: parseInt(hours[1]),
    m10: parseInt(minutes[0]),
    m1: parseInt(minutes[1])
  };
  
  // Erstelle Ziffern mit Progress
  const h10Progress = Math.floor(minutes[1] / 10); // 0-2 für 10er-Stunden (0-2)
  const h1Progress = Math.floor(seconds / 6); // 0-9 für 1er-Stunden  
  const m10Progress = Math.floor(seconds / 10); // 0-5 für 10er-Minuten
  const m1Progress = seconds; // 0-59 für 1er-Minuten, aber begrenzt auf Anzahl Punkte in Ziffer
  
  createDigit('h10', currentTime.h10, 0, h10Progress);
  createDigit('h1', currentTime.h1, 1, h1Progress);
  createDigit('m10', currentTime.m10, 2, m10Progress);
  createDigit('m1', currentTime.m1, 3, m1Progress);
  
  lastTime = { ...currentTime };
}

function createDigit(digitId, digitValue, position, progress) {
  const pattern = digitPatterns[digitValue];
  const digitSize = 15;
  const spacing = 120;
  const startX = width/2 - (1.5 * spacing) + (position * spacing);
  const startY = height/2 - (pattern.length * digitSize / 2);
  
  // Entferne alte Bodies
  if (digitBodies[digitId]) {
    digitBodies[digitId].forEach(body => World.remove(world, body));
  }
  
  digitBodies[digitId] = [];
  let dotIndex = 0;
  
  // Erstelle Ziffer-Punkte
  for (let row = 0; row < pattern.length; row++) {
    for (let col = 0; col < pattern[row].length; col++) {
      if (pattern[row][col] === 1) {
        const x = startX + col * digitSize;
        const y = startY + row * digitSize;
        
        // Farbe basierend auf Progress
        let color = '#bbbbbb'; // Grau (Standard)
        if (dotIndex < progress) {
          color = '#0066cc'; // Blau (gefüllt)
        }
        
        const body = Bodies.circle(x, y, 6, {
          isStatic: true,
          render: { fillStyle: color }
        });
        
        World.add(world, body);
        digitBodies[digitId].push(body);
        dotIndex++;
      }
    }
  }
>>>>>>> a81d166d1ca6a1a7f649c84f275c2c08a0d67dd2
}

function updateTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
<<<<<<< HEAD
  const timeString = `${hours}:${minutes}`;
  
  // Neue Zielpunkte basierend auf aktueller Zeit
  targets = samplePoints(timeString, Math.min(width, height) * 0.2, 8);
  
  // Statische graue Körper entfernen und neu erstellen
  staticBodies.forEach(body => World.remove(world, body));
  staticBodies = [];
  
  targets.forEach(point => {
    const staticBody = Bodies.circle(point.x, point.y, 3, { 
      isStatic: true,
      render: { fillStyle: COLORS.static }
    });
    World.add(world, staticBody);
    staticBodies.push(staticBody);
  });

  // Dynamische Körper anpassen
  adjustDynamicBodies();
}

function adjustDynamicBodies() {
  const targetCount = targets.length;
  
  // Zu wenige dynamische Körper? Neue hinzufügen
  while (dynamicBodies.length < targetCount) {
    const newBody = Bodies.circle(
      random(width * 0.1, width * 0.9),
      random(height * 0.1, height * 0.9),
      4,
      {
        restitution: 0.8,
        frictionAir: 0.03,
        density: 0.001,
        render: { fillStyle: COLORS.dynamic }
      }
    );
    
    World.add(world, newBody);
    dynamicBodies.push(newBody);
  }
  
  // Zu viele dynamische Körper? Überschüssige entfernen
  while (dynamicBodies.length > targetCount) {
    const bodyToRemove = dynamicBodies.pop();
    World.remove(world, bodyToRemove);
  }
  
  // Ziele zuweisen
  dynamicBodies.forEach((body, index) => {
    body.target = targets[index];
  });
}

function keyPressed() {
  const gravityStrength = 0.5;
  
  switch(keyCode) {
    case UP_ARROW:
      engine.world.gravity.x = 0;
      engine.world.gravity.y = -gravityStrength;
      break;
    case DOWN_ARROW:
      engine.world.gravity.x = 0;
      engine.world.gravity.y = gravityStrength;
      break;
    case LEFT_ARROW:
      engine.world.gravity.x = -gravityStrength;
      engine.world.gravity.y = 0;
      break;
    case RIGHT_ARROW:
      engine.world.gravity.x = gravityStrength;
      engine.world.gravity.y = 0;
      break;
    case 32: // Spacebar - Reset gravity
      engine.world.gravity.x = 0;
      engine.world.gravity.y = 0.001;
=======
  const seconds = now.getSeconds();
  
  const newTime = {
    h10: parseInt(hours[0]),
    h1: parseInt(hours[1]),
    m10: parseInt(minutes[0]),
    m1: parseInt(minutes[1])
  };
  
  // Explodiere und erstelle neue Ziffern bei Änderung
  if (newTime.h10 !== lastTime.h10) explodeAndRecreate('h10', newTime.h10, 0);
  if (newTime.h1 !== lastTime.h1) explodeAndRecreate('h1', newTime.h1, 1);
  if (newTime.m10 !== lastTime.m10) explodeAndRecreate('m10', newTime.m10, 2);
  if (newTime.m1 !== lastTime.m1) explodeAndRecreate('m1', newTime.m1, 3);
  
  // Update Progress für bestehende Ziffern
  if (newTime.h10 === lastTime.h10) {
    const h10Progress = Math.floor(minutes[1] / 10);
    updateDigitProgress('h10', h10Progress);
  }
  
  if (newTime.h1 === lastTime.h1) {
    const h1Progress = Math.floor(seconds / 6);
    updateDigitProgress('h1', h1Progress);
  }
  
  if (newTime.m10 === lastTime.m10) {
    const m10Progress = Math.floor(seconds / 10);
    updateDigitProgress('m10', m10Progress);
  }
  
  if (newTime.m1 === lastTime.m1) {
    const m1Progress = Math.floor(seconds / 2); // Anpassung für bessere Sichtbarkeit
    updateDigitProgress('m1', m1Progress);
  }
  
  currentTime = newTime;
  lastTime = { ...newTime };
}

function explodeAndRecreate(digitId, newDigitValue, position) {
  // Explodiere alte Ziffer
  if (digitBodies[digitId]) {
    digitBodies[digitId].forEach(body => {
      Body.setStatic(body, false);
      const force = Vector.create(random(-0.03, 0.03), random(-0.03, 0.03));
      Body.applyForce(body, body.position, force);
      body.render.fillStyle = '#0066cc'; // Blau beim Explodieren
    });
    
    // Entferne nach 3 Sekunden
    setTimeout(() => {
      digitBodies[digitId].forEach(body => World.remove(world, body));
      digitBodies[digitId] = [];
    }, 3000);
  }
  
  // Erstelle neue Ziffer nach Verzögerung
  setTimeout(() => {
    createDigit(digitId, newDigitValue, position, 0); // Startet mit 0 Progress
  }, 800);
}

function updateDigitProgress(digitId, progress) {
  if (!digitBodies[digitId]) return;
  
  digitBodies[digitId].forEach((body, index) => {
    if (index < progress) {
      body.render.fillStyle = '#0066cc'; // Blau
    } else {
      body.render.fillStyle = '#bbbbbb'; // Grau
    }
  });
}

// Schütteln mit WASD
function keyPressed() {
  const shakeForce = 0.008;
  let gravity = { x: 0, y: 0 };
  
  switch (key.toLowerCase()) {
    case 'w':
      gravity.y = -1;
      break;
    case 's':
      gravity.y = 1;
      break;
    case 'a':
      gravity.x = -1;
      break;
    case 'd':
      gravity.x = 1;
>>>>>>> a81d166d1ca6a1a7f649c84f275c2c08a0d67dd2
      break;
  }
  
  engine.gravity.x = gravity.x;
  engine.gravity.y = gravity.y;
  
  // Kraft auf nicht-statische Bodies
  world.bodies.forEach(body => {
    if (!body.isStatic) {
      const force = Vector.create(
        gravity.x * shakeForce + random(-shakeForce/2, shakeForce/2),
        gravity.y * shakeForce + random(-shakeForce/2, shakeForce/2)
      );
      Body.applyForce(body, body.position, force);
    }
  });
}

function keyReleased() {
  engine.gravity.x = 0;
  engine.gravity.y = 0;
}

function drawDebugInfo() {
  fill(COLORS.black);
  textAlign(LEFT);
  textSize(12);
  text(`Dynamic Bodies: ${dynamicBodies.length}`, 10, 20);
  text(`Static Bodies: ${staticBodies.length}`, 10, 35);
  text(`Gravity: x=${engine.world.gravity.x.toFixed(3)}, y=${engine.world.gravity.y.toFixed(3)}`, 10, 50);
  text(`Controls: Arrow keys for gravity, Space to reset`, 10, 65);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateTimeShape(); // Zeit-Form bei Größenänderung neu berechnen
}

// Cleanup-Funktion für bessere Performance
function cleanup() {
  if (engine) {
    Engine.clear(engine);
    World.clear(world);
    Runner.stop(runner);
  }
}