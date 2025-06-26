// -----------------------------------------------------------------------------
// WATCHFACE mit p5.js & Matter.js
// – 960×960 px, nur Schwarz/Weiß/Blau
// – Digitale Uhr aus Punkten mit Physics
// – Letzte Minutenziffer: 60 Punkte, 1 pro Sekunde
// – Zweite Stundenziffer füllt sich über die Stunde
// – Explosion bei Minutenwechsel
// – Sehr langsame Bewegung der blauen Punkte
// -----------------------------------------------------------------------------

const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Vector = Matter.Vector;

let engine, world;
let boundaries = [];

// Konstanten
const CANVAS_SIZE = 960;
const POINTS_PER_MINUTE_DIGIT = 60;
const COLORS = {
  background: 0,
  border: 255,
  static: 150,
  dynamic: [0, 100, 255]
};
const RADIUS = 6;
const LOCK_DISTANCE = 15;
const REPULSION_DISTANCE = 40;

// Typography Layout
const DIGIT_WIDTH = 160;
const DIGIT_HEIGHT = 240;
const DIGIT_SPACING = 80;
const COLON_WIDTH = 40;

const TOTAL_WIDTH = (4 * DIGIT_WIDTH) + (3 * DIGIT_SPACING) + COLON_WIDTH;
const START_X = (CANVAS_SIZE - TOTAL_WIDTH) / 2;
const BASELINE_Y = CANVAS_SIZE / 2;

// Zeitvariablen
let h = 0, m = 0, s = 0;
let lastMinute = -1;
let lastHour = -1;

// Digit-Daten
let digits = [];
let flyingBodies = [];

function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  
  // Matter.js Setup
  engine = Engine.create();
  world = engine.world;
  world.gravity.scale = 0.0001; // Noch geringere Gravitationsskala
  world.gravity.y = 0.02; // Minimale Gravitation

  // Unsichtbare Wände
  let wallThickness = 30;
  boundaries = [
    Bodies.rectangle(width/2, -wallThickness/2, width, wallThickness, { isStatic: true }),
    Bodies.rectangle(width/2, height + wallThickness/2, width, wallThickness, { isStatic: true }),
    Bodies.rectangle(-wallThickness/2, height/2, wallThickness, height, { isStatic: true }),
    Bodies.rectangle(width + wallThickness/2, height/2, wallThickness, height, { isStatic: true })
  ];
  World.add(world, boundaries);

  // Zeit initialisieren
  let now = new Date();
  h = now.getHours();
  m = now.getMinutes();
  s = now.getSeconds();

  // Digits erstellen
  digits = [
    { id: 'h10', x: START_X + DIGIT_WIDTH/2, targets: [], currentLabel: null, type: 'normal' },
    { id: 'h1',  x: START_X + DIGIT_WIDTH + DIGIT_SPACING + DIGIT_WIDTH/2, targets: [], currentLabel: null, type: 'hour_fill' },
    { id: 'm10', x: START_X + 2*DIGIT_WIDTH + 2*DIGIT_SPACING + COLON_WIDTH + DIGIT_WIDTH/2, targets: [], currentLabel: null, type: 'normal' },
    { id: 'm1',  x: START_X + 3*DIGIT_WIDTH + 3*DIGIT_SPACING + COLON_WIDTH + DIGIT_WIDTH/2, targets: [], currentLabel: null, type: 'minute_last' }
  ];

  updateTime();
}

function draw() {
  background(COLORS.background);
  Engine.update(engine);

  updateTime();
  updatePhysics();

  // Border
  drawBorder();
  
  // Doppelpunkt
  drawColon();
  
  // Statische Punkte zeichnen
  digits.forEach(digit => {
    drawStaticDigit(digit);
  });

  // Fliegende blaue Punkte
  drawFlyingBodies();

  // Debug
  drawDebugInfo();
}

function updateTime() {
  let now = new Date();
  h = now.getHours();
  m = now.getMinutes();
  s = now.getSeconds();

  // Bei neuer Minute: Explosion der letzten Minutenziffer
  if (m !== lastMinute && lastMinute !== -1) {
    explodeLastMinuteDigit();
  }
  lastMinute = m;

  // Bei neuer Stunde: Reset
  if (h !== lastHour && lastHour !== -1) {
    resetHourDigit();
  }
  lastHour = h;

  // Labels aktualisieren
  updateDigitLabel(digits[0], Math.floor(h/10).toString());
  updateDigitLabel(digits[1], (h%10).toString());
  updateDigitLabel(digits[2], Math.floor(m/10).toString());
  updateDigitLabel(digits[3], (m%10).toString());
}

function updateDigitLabel(digit, newLabel) {
  if (digit.currentLabel !== newLabel) {
    digit.currentLabel = newLabel;
    
    if (digit.type === 'minute_last') {
      // Letzte Minutenziffer: immer 60 Punkte
      digit.targets = generateTargetPoints(newLabel, digit.x, BASELINE_Y, POINTS_PER_MINUTE_DIGIT);
    } else {
      // Andere Ziffern: normale Punktverteilung
      digit.targets = generateTargetPoints(newLabel, digit.x, BASELINE_Y, 50);
    }
  }
}

function generateTargetPoints(label, centerX, centerY, pointCount) {
  // Text rendern mit besserer Auflösung
  let pg = createGraphics(DIGIT_WIDTH * 3, DIGIT_HEIGHT * 3);
  pg.background(0);
  pg.fill(255);
  pg.textAlign(CENTER, CENTER);
  pg.textSize(DIGIT_HEIGHT * 1.2);
  pg.textFont('monospace');
  pg.textStyle(BOLD);
  pg.text(label, pg.width/2, pg.height/2);
  pg.loadPixels();

  // Pixel sampeln mit höherer Dichte
  let points = [];
  let step = 2;
  
  for (let x = 0; x < pg.width; x += step) {
    for (let y = 0; y < pg.height; y += step) {
      let index = (x + y * pg.width) * 4;
      if (pg.pixels[index] > 128) {
        let worldX = centerX - pg.width/2 + x;
        let worldY = centerY - pg.height/2 + y;
        points.push({ x: worldX, y: worldY });
      }
    }
  }

  // Auf gewünschte Anzahl bringen
  while (points.length < pointCount) {
    if (points.length === 0) {
      points.push({ x: centerX, y: centerY });
    } else {
      points.push(...points.slice(0, Math.min(points.length, pointCount - points.length)));
    }
  }

  // Mischen für gleichmäßige Füllung
  for (let i = points.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }

  return points.slice(0, pointCount);
}

function updatePhysics() {
  // Fliegende Körper zu ihren Zielen bewegen
  flyingBodies.forEach((body, index) => {
    if (body.target) {
      let distance = dist(body.position.x, body.position.y, body.target.x, body.target.y);
      
      if (distance < LOCK_DISTANCE) {
        // Angekommen - Body entfernen
        World.remove(world, body);
        flyingBodies.splice(index, 1);
        return;
      }
      
      // Sehr langsame Bewegung zum Ziel
      let force = 0.00005; // Extrem reduzierte Kraft
      Body.applyForce(body, body.position, {
        x: (body.target.x - body.position.x) * force,
        y: (body.target.y - body.position.y) * force
      });
    }

    // Abstoßung von fremden Ziffern
    applyRepulsionForces(body);
    
    // Sehr niedrige Geschwindigkeitsbegrenzung
    let maxSpeed = 0.8; // Deutlich reduziert von 3 auf 0.8
    if (body.velocity.x > maxSpeed) Body.setVelocity(body, { x: maxSpeed, y: body.velocity.y });
    if (body.velocity.x < -maxSpeed) Body.setVelocity(body, { x: -maxSpeed, y: body.velocity.y });
    if (body.velocity.y > maxSpeed) Body.setVelocity(body, { x: body.velocity.x, y: maxSpeed });
    if (body.velocity.y < -maxSpeed) Body.setVelocity(body, { x: body.velocity.x, y: -maxSpeed });
  });

  // Neue fliegende Körper für letzte Minutenziffer (1 pro Sekunde)
  let lastDigit = digits[3];
  let currentFlying = flyingBodies.filter(b => b.digitId === 'm1').length;
  let neededTotal = s;
  
  if (currentFlying < neededTotal && lastDigit.targets.length > 0) {
    let targetIndex = currentFlying;
    if (targetIndex < lastDigit.targets.length) {
      createFlyingBody('m1', lastDigit.targets[targetIndex]);
    }
  }
}

function applyRepulsionForces(body) {
  digits.forEach(digit => {
    // Nur von fremden Ziffern abstoßen
    if (digit.id !== body.digitId && digit.targets.length > 0) {
      digit.targets.forEach(target => {
        let distance = dist(body.position.x, body.position.y, target.x, target.y);
        
        if (distance < REPULSION_DISTANCE && distance > 0) {
          // Sehr schwache Abstoßungskraft
          let repulsionForce = 0.00002 * (REPULSION_DISTANCE - distance) / distance; // Reduziert von 0.0001
          let dx = body.position.x - target.x;
          let dy = body.position.y - target.y;
          
          Body.applyForce(body, body.position, {
            x: dx * repulsionForce,
            y: dy * repulsionForce
          });
        }
      });
    }
  });
}

function createFlyingBody(digitId, target) {
  // Zufällige Startposition im ganzen Canvas
  let body = Bodies.circle(
    random(50, width-50),
    random(50, height-50),
    RADIUS,
    {
      friction: 0.8,        // Viel mehr Reibung (war 0.3)
      frictionAir: 0.15,    // Viel mehr Luftwiderstand (war 0.05)
      restitution: 0.3,     // Noch weniger Sprungkraft (war 0.6)
      density: 0.0005       // Leichter
    }
  );
  
  body.target = target;
  body.digitId = digitId;
  
  // Minimale zufällige Anfangsgeschwindigkeit
  Body.setVelocity(body, {
    x: random(-0.2, 0.2), // Reduziert von -1,1 auf -0.2,0.2
    y: random(-0.2, 0.2)
  });
  
  World.add(world, body);
  flyingBodies.push(body);
}

function explodeLastMinuteDigit() {
  // Alle fliegenden Punkte der letzten Minutenziffer explodieren
  flyingBodies.forEach(body => {
    if (body.digitId === 'm1') {
      let angle = random(TWO_PI);
      let force = random(0.002, 0.005); // Deutlich reduzierte Explosionskraft (war 0.005-0.015)
      Body.applyForce(body, body.position, {
        x: cos(angle) * force,
        y: sin(angle) * force
      });
    }
  });

  // Nach 2 Sekunden alle m1-Körper entfernen
  setTimeout(() => {
    flyingBodies = flyingBodies.filter(body => {
      if (body.digitId === 'm1') {
        World.remove(world, body);
        return false;
      }
      return true;
    });
  }, 2000);
}

function resetHourDigit() {
  // Stundenziffer-Reset bei neuer Stunde
  // Hier könnte man die Füllung zurücksetzen falls gewünscht
}

function drawStaticDigit(digit) {
  if (digit.targets.length === 0) return;
  
  noStroke();
  
  digit.targets.forEach((target, index) => {
    let shouldDraw = true;
    let isBlue = false;
    
    if (digit.type === 'hour_fill' && digit.id === 'h1') {
      // Stundenziffer: füllt sich über 60 Minuten
      isBlue = index < m;
    } else if (digit.type === 'minute_last') {
      // Letzte Minutenziffer: nur graue Punkte zeigen, die noch nicht geflogen sind
      shouldDraw = index >= s;
      isBlue = false;
    }
    
    if (shouldDraw) {
      if (isBlue) {
        fill(...COLORS.dynamic);
      } else {
        fill(COLORS.static);
      }
      ellipse(target.x, target.y, RADIUS * 2);
    }
  });
}

function drawFlyingBodies() {
  noStroke();
  fill(...COLORS.dynamic);
  
  flyingBodies.forEach(body => {
    ellipse(body.position.x, body.position.y, RADIUS * 2);
  });
}

function drawBorder() {
  noFill();
  stroke(COLORS.border);
  strokeWeight(8);
  rect(4, 4, width-8, height-8);
}

function drawColon() {
  let colonX = START_X + 2*DIGIT_WIDTH + DIGIT_SPACING + COLON_WIDTH/2;
  noStroke();
  fill(COLORS.static);
  ellipse(colonX, BASELINE_Y - 35, RADIUS * 2);
  ellipse(colonX, BASELINE_Y + 35, RADIUS * 2);
}

function drawDebugInfo() {
  fill(255);
  textAlign(LEFT);
  textSize(14);
  text(`Zeit: ${nf(h,2)}:${nf(m,2)}:${nf(s,2)}`, 20, 30);
  text(`Fliegende Punkte: ${flyingBodies.length}`, 20, 50);
  text(`Stundenziffer (h1) gefüllt: ${m}/60`, 20, 70);
  text(`Minutenziffer Sekunden: ${s}/60`, 20, 90);
  text(`Pfeiltasten: Gravitation`, 20, 110);
}

// Pfeiltasten für Gravitation
function keyPressed() {
  let gravity = 0.1; // Deutlich reduzierte Gravitationsstärke (war 0.3)
  switch(keyCode) {
    case UP_ARROW:
      world.gravity.x = 0;
      world.gravity.y = -gravity;
      break;
    case DOWN_ARROW:
      world.gravity.x = 0;
      world.gravity.y = gravity;
      break;
    case LEFT_ARROW:
      world.gravity.x = -gravity;
      world.gravity.y = 0;
      break;
    case RIGHT_ARROW:
      world.gravity.x = gravity;
      world.gravity.y = 0;
      break;
  }
}

function keyReleased() {
  world.gravity.x = 0;
  world.gravity.y = 0.02; // Minimale Standard-Gravitation (war 0.1)
}