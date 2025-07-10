-----------------------------------------------------------------------------
// WatchFace - Abstrakte digitale Punktuhr für SmartWatch
// 960×960 px, Schwarz/Weiß/Blau
// Digitale Uhr aus 60-Punkt-Grid mit 240 Partikeln (Verbrauchssystem)
// Mit Pfeiltasten-Gravitationssteuerung für frei fliegende Partikel
// KORRIGIERT: m10=Minuten (0-59), m1=Sekunden (0-59), h=Stunden (0-23)
// FIXED: Doppelte Zählung behoben + korrekte Updates
// -----------------------------------------------------------------------------

const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body;

let engine, world;
let boundaries = [];

// Konstanten
const CANVAS_SIZE = 960;
const POINTS_PER_DIGIT = 60;
const COLORS = {
  background: 0,        // Schwarz
  static: 170,          // Grau für statische Punkte
  dynamic: [0, 100, 255] // Blau für fliegende/aktive Punkte
};
const RADIUS = 4;
const CAPTURE_DISTANCE = 12;

// Typography Layout
const DIGIT_WIDTH = 140;
const DIGIT_HEIGHT = 200;
const DIGIT_SPACING = 60;
const COLON_WIDTH = 30;

// Grid Layout für 60 Punkte (12×5)
const GRID_COLS = 12;
const GRID_ROWS = 5;
const POINT_SPACING_X = DIGIT_WIDTH / (GRID_COLS + 1);
const POINT_SPACING_Y = DIGIT_HEIGHT / (GRID_ROWS + 1);

const TOTAL_WIDTH = (4 * DIGIT_WIDTH) + (3 * DIGIT_SPACING) + COLON_WIDTH;
const START_X = (CANVAS_SIZE - TOTAL_WIDTH) / 2;
const BASELINE_Y = CANVAS_SIZE / 2;

// Partikel-Pools: 120 für Minuten + 120 für Stunden = 240 total
const MINUTE_PARTICLES = 120; // Für m10 (Minuten) und m1 (Sekunden)
const HOUR_PARTICLES = 120;   // Für h10 und h1 (Stunden)

// GEÄNDERT: Stärkere Gravitation und Anti-Clumping
const GRAVITY_FORCE = 0.0008; // Deutlich stärker (fast 3x)
const REPULSION_FORCE = 0.00004; // Schwache Abstoßung zwischen Partikeln
const REPULSION_DISTANCE = 25; // Abstand für Abstoßung

// NEU: Tastenstatus für dauerhafte Gravitation
let keys = {
  up: false,
  down: false,
  left: false,
  right: false
};

// Zeitvariablen
let h = 0, m = 0, s = 0;
let lastSecond = -1;
let lastMinute = -1;
let lastHour = -1;

// Digit-Daten
let digits = [];
let minuteParticles = []; // 120 Partikel für m10 (Minuten) und m1 (Sekunden)
let hourParticles = [];   // 120 Partikel für h10 und h1 (Stunden)

// 7-Segment Display Definitionen
const SEGMENT_PATTERNS = {
  0: [1,1,1,1,1,1,0], // a,b,c,d,e,f,g
  1: [0,1,1,0,0,0,0],
  2: [1,1,0,1,1,0,1],
  3: [1,1,1,1,0,0,1],
  4: [0,1,1,0,0,1,1],
  5: [1,0,1,1,0,1,1],
  6: [1,0,1,1,1,1,1],
  7: [1,1,1,0,0,0,0],
  8: [1,1,1,1,1,1,1],
  9: [1,1,1,1,0,1,1]
};

function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  
  // Matter.js Setup
  engine = Engine.create();
  world = engine.world;
  
  // KORREKTUR: Keine Standard-Gravitation (Weltall-Physik)
  world.gravity.scale = 0;
  world.gravity.x = 0;
  world.gravity.y = 0;

  // Unsichtbare Wände - Border nicht sichtbar aber funktional
  let wallThickness = 30;
  boundaries = [
    Bodies.rectangle(width/2, -wallThickness/2, width, wallThickness, { isStatic: true }),
    Bodies.rectangle(width/2, height + wallThickness/2, width, wallThickness, { isStatic: true }),
    Bodies.rectangle(-wallThickness/2, height/2, wallThickness, height, { isStatic: true }),
    Bodies.rectangle(width + wallThickness/2, height/2, wallThickness, height, { isStatic: true })
  ];
  World.add(world, boundaries);

  // Digits erstellen - alle mit 60 Punkten im Grid
  digits = [
    { 
      id: 'h10', 
      x: START_X + DIGIT_WIDTH/2, 
      targets: [], 
      bluePoints: 0,
      targetBluePoints: 0
    },
    { 
      id: 'h1', 
      x: START_X + DIGIT_WIDTH + DIGIT_SPACING + DIGIT_WIDTH/2, 
      targets: [], 
      bluePoints: 0,
      targetBluePoints: 0
    },
    { 
      id: 'm10', // KORRIGIERT: Zeigt aktuelle Minuten (0-59), 1 Punkt pro Minute
      x: START_X + 2*DIGIT_WIDTH + 2*DIGIT_SPACING + COLON_WIDTH + DIGIT_WIDTH/2, 
      targets: [], 
      bluePoints: 0,
      targetBluePoints: 0
    },
    { 
      id: 'm1', // Zeigt aktuelle Sekunden (0-59), 1 Punkt pro Sekunde
      x: START_X + 3*DIGIT_WIDTH + 3*DIGIT_SPACING + COLON_WIDTH + DIGIT_WIDTH/2, 
      targets: [], 
      bluePoints: 0,
      targetBluePoints: 0
    }
  ];

  updateTime();
  generateAllDigitGrids();
  
  // Erstelle die beiden Partikel-Pools
  createParticlePools();
  
  // NEU: Sofortige Initialisierung für aktuelle Zeit
  initializeCurrentTime();
}

function draw() {
  background(COLORS.background);
  Engine.update(engine);

  updateTime();
  updateTargetBluePoints();
  
  // NEU: Dauerhafte Gravitationsanwendung
  applyContinuousGravity();
  
  updatePhysics();

  // Doppelpunkt zwischen Stunden und Minuten
  drawColon();
  
  // Alle Ziffern zeichnen
  digits.forEach(digit => {
    drawDigit(digit);
  });

  // Fliegende blaue Partikel
  drawFlyingParticles();

  // Debug Info
  drawDebugInfo();
}

function createParticlePools() {
  // Erstelle 120 Minuten-Partikel (für m10 Minuten + m1 Sekunden)
  for (let i = 0; i < MINUTE_PARTICLES; i++) {
    let body = Bodies.circle(
      random(50, width - 50),
      random(50, height - 50),
      RADIUS,
      {
        friction: 0.3,
        frictionAir: 0.03,
        restitution: 0.7,
        density: random(0.0008, 0.0012) // Unterschiedliche Masse
      }
    );
    
    Body.setVelocity(body, {
      x: random(-0.8, 0.8),
      y: random(-0.8, 0.8)
    });
    
    World.add(world, body);
    
    minuteParticles.push({
      body: body,
      target: null,
      digitId: null,
      isActive: false,
      isConsumed: false,
      // GEÄNDERT: Größere individuelle Unterschiede
      gravityMultiplier: random(0.3, 1.8), // Viel größere Variation
      speedMultiplier: random(0.5, 2.0), // Individuelle Geschwindigkeit
      driftAngle: random(TWO_PI), // Zufällige Drift-Richtung
      driftSpeed: random(0.0001, 0.0003), // Individuelle Drift-Geschwindigkeit
      angleChangeSpeed: random(0.01, 0.04) // Wie schnell sich Richtung ändert
    });
  }
  
  // Erstelle 120 Stunden-Partikel (für h10 + h1)
  for (let i = 0; i < HOUR_PARTICLES; i++) {
    let body = Bodies.circle(
      random(50, width - 50),
      random(50, height - 50),
      RADIUS,
      {
        friction: 0.3,
        frictionAir: 0.03,
        restitution: 0.7,
        density: random(0.0008, 0.0012) // Unterschiedliche Masse
      }
    );
    
    Body.setVelocity(body, {
      x: random(-0.8, 0.8),
      y: random(-0.8, 0.8)
    });
    
    World.add(world, body);
    
    hourParticles.push({
      body: body,
      target: null,
      digitId: null,
      isActive: false,
      isConsumed: false,
      // GEÄNDERT: Größere individuelle Unterschiede
      gravityMultiplier: random(0.3, 1.8), // Viel größere Variation
      speedMultiplier: random(0.5, 2.0), // Individuelle Geschwindigkeit
      driftAngle: random(TWO_PI), // Zufällige Drift-Richtung
      driftSpeed: random(0.0001, 0.0003), // Individuelle Drift-Geschwindigkeit
      angleChangeSpeed: random(0.01, 0.04) // Wie schnell sich Richtung ändert
    });
  }
}

// NEU: Initialisierung für aktuelle Zeit beim Start
function initializeCurrentTime() {
  console.log(`Initialisiere aktuelle Zeit: ${h}:${m}:${s}`);
  
  // Stunden-Partikel zuweisen (h10 + h1 bekommen jeweils h Partikel)
  for (let i = 0; i < h; i++) {
    // h10 (erste Stundenziffer)
    let availableHourParticles = hourParticles.filter(p => !p.isActive && !p.isConsumed);
    if (availableHourParticles.length > 0 && digits[0].targets.length > 0) {
      let particle = availableHourParticles[0];
      let targetIndex = digits[0].bluePoints;
      if (targetIndex < digits[0].targets.length) {
        particle.target = digits[0].targets[targetIndex];
        particle.digitId = 'h10';
        particle.isActive = true;
        digits[0].bluePoints++; // Sofort erhöhen für nächsten Partikel
      }
    }
    
    // h1 (zweite Stundenziffer)
    availableHourParticles = hourParticles.filter(p => !p.isActive && !p.isConsumed);
    if (availableHourParticles.length > 0 && digits[1].targets.length > 0) {
      let particle = availableHourParticles[0];
      let targetIndex = digits[1].bluePoints;
      if (targetIndex < digits[1].targets.length) {
        particle.target = digits[1].targets[targetIndex];
        particle.digitId = 'h1';
        particle.isActive = true;
        digits[1].bluePoints++; // Sofort erhöhen für nächsten Partikel
      }
    }
  }
  
  // Minuten-Partikel zuweisen (m10 bekommt m Partikel)
  for (let i = 0; i < m; i++) {
    let availableMinuteParticles = minuteParticles.filter(p => !p.isActive && !p.isConsumed);
    if (availableMinuteParticles.length > 0 && digits[2].targets.length > 0) {
      let particle = availableMinuteParticles[0];
      let targetIndex = digits[2].bluePoints;
      if (targetIndex < digits[2].targets.length) {
        particle.target = digits[2].targets[targetIndex];
        particle.digitId = 'm10';
        particle.isActive = true;
        digits[2].bluePoints++; // Sofort erhöhen für nächsten Partikel
      }
    }
  }
  
  // Sekunden-Partikel zuweisen (m1 bekommt s Partikel)
  for (let i = 0; i < s; i++) {
    let availableMinuteParticles = minuteParticles.filter(p => !p.isActive && !p.isConsumed);
    if (availableMinuteParticles.length > 0 && digits[3].targets.length > 0) {
      let particle = availableMinuteParticles[0];
      let targetIndex = digits[3].bluePoints;
      if (targetIndex < digits[3].targets.length) {
        particle.target = digits[3].targets[targetIndex];
        particle.digitId = 'm1';
        particle.isActive = true;
        digits[3].bluePoints++; // Sofort erhöhen für nächsten Partikel
      }
    }
  }
  
  console.log(`Initialisierung abgeschlossen. Partikel zugewiesen: h10=${digits[0].bluePoints}, h1=${digits[1].bluePoints}, m10=${digits[2].bluePoints}, m1=${digits[3].bluePoints}`);
}

function updateTime() {
  let now = new Date();
  h = now.getHours();
  m = now.getMinutes();
  s = now.getSeconds();

  // Bei neuer Sekunde: weise Partikel für m1 (Sekunden) zu
  if (s !== lastSecond) {
    assignParticlesForSecond();
    lastSecond = s;
  }

  // KORRIGIERT: Bei neuer Minute: weise Partikel für m10 (Minuten) zu + Reset m1
  if (m !== lastMinute && lastMinute !== -1) {
    assignParticlesForMinute(); // m10 bekommt +1 Punkt
    resetAndExplodeSecondsParticles(); // m1 (Sekunden) Reset
    lastMinute = m;
  } else if (lastMinute === -1) {
    lastMinute = m;
  }

  // Bei neuer Stunde: weise Partikel für Stunden zu + Reset m10
  if (h !== lastHour && lastHour !== -1) {
    assignParticlesForHour(); // h10, h1 bekommen +1 Punkt
    resetAndExplodeMinuteParticles(); // m10 (Minuten) Reset
    lastHour = h;
  } else if (lastHour === -1) {
    lastHour = h;
  }
}

function updateTargetBluePoints() {
  // Berechne aktuelle Ziffern
  let h10 = Math.floor(h / 10);
  let h1 = h % 10;
  let m10 = Math.floor(m / 10);
  let m1 = Math.floor(s / 10); // Zeigt Zehner der Sekunden
  
  // Setze Ziel-Werte basierend auf aktueller Ziffer
  digits[0].targetBluePoints = getPointsForDigit(h10); // h10
  digits[1].targetBluePoints = getPointsForDigit(h1);  // h1
  digits[2].targetBluePoints = getPointsForDigit(m10); // m10
  digits[3].targetBluePoints = getPointsForDigit(m1);  // m1 (Sekunden-Zehner)
}

// Neue Funktion: Berechne Anzahl Punkte für eine Ziffer
function getPointsForDigit(digit) {
  if (digit < 0 || digit > 9) return 0;
  
  const pattern = SEGMENT_PATTERNS[digit];
  let activeSegments = pattern.reduce((sum, active) => sum + active, 0);
  
  // 8 Punkte pro aktivem Segment + ein paar extra für bessere Lesbarkeit
  return Math.min(activeSegments * 8 + 4, 60);
}

// FIXED: Weise Partikel für Sekunden zu (m1) - bluePoints wird SOFORT erhöht
function assignParticlesForSecond() {
  // Für m1 (Sekunden) - 1 Partikel pro Sekunde
  if (digits[3].bluePoints < s) {
    let availableParticles = minuteParticles.filter(p => !p.isActive && !p.isConsumed);
    if (availableParticles.length > 0 && digits[3].targets.length > 0) {
      let particle = availableParticles[0];
      let targetIndex = digits[3].bluePoints;
      if (targetIndex < digits[3].targets.length) {
        particle.target = digits[3].targets[targetIndex];
        particle.digitId = 'm1';
        particle.isActive = true;
        digits[3].bluePoints++; // KORREKTUR: Sofort erhöhen!
      }
    }
  }
}

// FIXED: Weise Partikel für Minuten zu (m10) - bluePoints wird SOFORT erhöht
function assignParticlesForMinute() {
  // Für m10 (Minuten) - 1 Partikel pro Minute
  if (digits[2].bluePoints < m) {
    let availableParticles = minuteParticles.filter(p => !p.isActive && !p.isConsumed);
    if (availableParticles.length > 0 && digits[2].targets.length > 0) {
      let particle = availableParticles[0];
      let targetIndex = digits[2].bluePoints;
      if (targetIndex < digits[2].targets.length) {
        particle.target = digits[2].targets[targetIndex];
        particle.digitId = 'm10';
        particle.isActive = true;
        digits[2].bluePoints++; // KORREKTUR: Sofort erhöhen!
      }
    }
  }
}

// FIXED: Weise Partikel für Stunden zu (h10, h1) - bluePoints wird SOFORT erhöht
function assignParticlesForHour() {
  // Für h10 (erste Stundenziffer)
  if (digits[0].bluePoints < h) {
    let availableParticles = hourParticles.filter(p => !p.isActive && !p.isConsumed);
    if (availableParticles.length > 0 && digits[0].targets.length > 0) {
      let particle = availableParticles[0];
      let targetIndex = digits[0].bluePoints;
      if (targetIndex < digits[0].targets.length) {
        particle.target = digits[0].targets[targetIndex];
        particle.digitId = 'h10';
        particle.isActive = true;
        digits[0].bluePoints++; // KORREKTUR: Sofort erhöhen!
      }
    }
  }
  
  // Für h1 (letzte Stundenziffer)
  if (digits[1].bluePoints < h) {
    let availableParticles = hourParticles.filter(p => !p.isActive && !p.isConsumed);
    if (availableParticles.length > 0 && digits[1].targets.length > 0) {
      let particle = availableParticles[0];
      let targetIndex = digits[1].bluePoints;
      if (targetIndex < digits[1].targets.length) {
        particle.target = digits[1].targets[targetIndex];
        particle.digitId = 'h1';
        particle.isActive = true;
        digits[1].bluePoints++; // KORREKTUR: Sofort erhöhen!
      }
    }
  }
}

// NEU: Reset Sekunden bei neuer Minute
function resetAndExplodeSecondsParticles() {
  // Reset der Sekunden-Ziffer
  digits[3].bluePoints = 0; // m1 (Sekunden)
  
  // Alle Sekunden-Partikel "explodieren" und recyceln
  minuteParticles.forEach(particle => {
    if (particle.isConsumed && particle.digitId === 'm1') {
      // Partikel wieder verfügbar machen
      particle.isConsumed = false;
      particle.isActive = false;
      particle.target = null;
      particle.digitId = null;
      
      // Sanfte Explosion mit individueller Variation
      let angle = random(TWO_PI);
      let force = random(0.4, 1.0) * particle.speedMultiplier;
      Body.setVelocity(particle.body, {
        x: cos(angle) * force,
        y: sin(angle) * force
      });
    }
  });
}

// KORRIGIERT: Reset Minuten bei neuer Stunde
function resetAndExplodeMinuteParticles() {
  // Reset der Minuten-Ziffer
  digits[2].bluePoints = 0; // m10 (Minuten)
  
  // Alle Minuten-Partikel "explodieren" und recyceln
  minuteParticles.forEach(particle => {
    if (particle.isConsumed && particle.digitId === 'm10') {
      // Partikel wieder verfügbar machen
      particle.isConsumed = false;
      particle.isActive = false;
      particle.target = null;
      particle.digitId = null;
      
      // Sanfte Explosion mit individueller Variation
      let angle = random(TWO_PI);
      let force = random(0.4, 1.0) * particle.speedMultiplier;
      Body.setVelocity(particle.body, {
        x: cos(angle) * force,
        y: sin(angle) * force
      });
    }
  });
}

// KORRIGIERT: Reset Stunden bei neuem Tag (falls gewünscht)
function resetAndExplodeHourParticles() {
  // Reset der Stundenziffern
  digits[0].bluePoints = 0; // h10
  digits[1].bluePoints = 0; // h1
  
  // Alle Stunden-Partikel "explodieren" und recyceln
  hourParticles.forEach(particle => {
    if (particle.isConsumed) {
      // Partikel wieder verfügbar machen
      particle.isConsumed = false;
      particle.isActive = false;
      particle.target = null;
      particle.digitId = null;
      
      // Sanfte Explosion mit individueller Variation
      let angle = random(TWO_PI);
      let force = random(0.4, 1.0) * particle.speedMultiplier;
      Body.setVelocity(particle.body, {
        x: cos(angle) * force,
        y: sin(angle) * force
      });
    }
  });
}

function generateDigitGrid(centerX, centerY) {
  // Erstelle 7-Segment Display Layout für 60 Punkte
  let points = [];
  
  // Segment-Dimensionen
  const segmentLength = 80;
  const segmentWidth = 16;
  const pointsPerSegment = 8; // 8 Punkte pro Segment
  const extraPoints = 4; // 4 zusätzliche Punkte für Dekoration
  
  // Segment-Positionen (7-Segment Display)
  const segments = {
    a: { x: centerX, y: centerY - 60, horizontal: true },      // oben
    b: { x: centerX + 35, y: centerY - 30, horizontal: false }, // oben rechts
    c: { x: centerX + 35, y: centerY + 30, horizontal: false }, // unten rechts
    d: { x: centerX, y: centerY + 60, horizontal: true },       // unten
    e: { x: centerX - 35, y: centerY + 30, horizontal: false }, // unten links
    f: { x: centerX - 35, y: centerY - 30, horizontal: false }, // oben links
    g: { x: centerX, y: centerY, horizontal: true }             // mitte
  };
  
  // Erstelle Punkte für jedes Segment
  Object.keys(segments).forEach(segmentKey => {
    const segment = segments[segmentKey];
    
    for (let i = 0; i < pointsPerSegment; i++) {
      let x, y;
      
      if (segment.horizontal) {
        // Horizontales Segment
        x = segment.x - segmentLength/2 + (i * segmentLength/(pointsPerSegment-1));
        y = segment.y + random(-segmentWidth/4, segmentWidth/4);
      } else {
        // Vertikales Segment
        x = segment.x + random(-segmentWidth/4, segmentWidth/4);
        y = segment.y - segmentLength/4 + (i * segmentLength/2/(pointsPerSegment-1));
      }
      
      points.push({ 
        x: x, 
        y: y, 
        segment: segmentKey,
        segmentIndex: i 
      });
    }
  });
  
  // Füge 4 zusätzliche Dekorationspunkte hinzu
  for (let i = 0; i < extraPoints; i++) {
    points.push({
      x: centerX + random(-50, 50),
      y: centerY + random(-70, 70),
      segment: 'decoration',
      segmentIndex: i
    });
  }
  
  // Sortiere Punkte von unten nach oben für Füllung
  points.sort((a, b) => b.y - a.y);
  
  return points;
}

function generateAllDigitGrids() {
  digits[0].targets = generateDigitGrid(digits[0].x, BASELINE_Y);
  digits[1].targets = generateDigitGrid(digits[1].x, BASELINE_Y);
  digits[2].targets = generateDigitGrid(digits[2].x, BASELINE_Y);
  digits[3].targets = generateDigitGrid(digits[3].x, BASELINE_Y);
}

function updatePhysics() {
  // Prüfe Minuten-Partikel (m10 + m1)
  minuteParticles.forEach(particle => {
    if (particle.isActive && !particle.isConsumed && checkParticleCapture(particle)) {
      // Partikel hat sein Ziel erreicht - ist jetzt verbraucht
      particle.target = null;
      particle.digitId = null;
      particle.isActive = false;
      particle.isConsumed = true; // Partikel ist verbraucht
      
    } else if (particle.isActive && particle.target && !particle.isConsumed) {
      // Führe aktive Partikel zum Ziel (ignoriert Gravitation)
      guideParticleToTarget(particle);
    }
    
    // Geschwindigkeitsbegrenzung mit individueller Geschwindigkeit
    limitParticleSpeed(particle.body, particle.speedMultiplier);
  });
  
  // Prüfe Stunden-Partikel (h10 + h1)
  hourParticles.forEach(particle => {
    if (particle.isActive && !particle.isConsumed && checkParticleCapture(particle)) {
      // Partikel hat sein Ziel erreicht - ist jetzt verbraucht
      particle.target = null;
      particle.digitId = null;
      particle.isActive = false;
      particle.isConsumed = true; // Partikel ist verbraucht
      
    } else if (particle.isActive && particle.target && !particle.isConsumed) {
      // Führe aktive Partikel zum Ziel (ignoriert Gravitation)
      guideParticleToTarget(particle);
    }
    
    // Geschwindigkeitsbegrenzung mit individueller Geschwindigkeit
    limitParticleSpeed(particle.body, particle.speedMultiplier);
  });
}

// FIXED: Keine doppelte Zählung mehr - digit.bluePoints wird NICHT mehr hier erhöht
function checkParticleCapture(particle) {
  if (!particle.target || !particle.digitId) return false;
  
  let digit = digits.find(d => d.id === particle.digitId);
  if (!digit) return false;
  
  let distance = dist(
    particle.body.position.x, 
    particle.body.position.y, 
    particle.target.x, 
    particle.target.y
  );
  
  if (distance < CAPTURE_DISTANCE) {
    // KORREKTUR: Nur return true, KEINE doppelte Zählung mehr!
    return true;
  }
  
  return false;
}

function guideParticleToTarget(particle) {
  if (!particle.target) return;
  
  // Sehr schwache Führungskraft für langsame Bewegung
  let force = 0.00003;
  let dx = particle.target.x - particle.body.position.x;
  let dy = particle.target.y - particle.body.position.y;
  
  Body.applyForce(particle.body, particle.body.position, {
    x: dx * force,
    y: dy * force
  });
}

function limitParticleSpeed(body, speedMultiplier = 1.0) {
  // Individuelle Geschwindigkeitsbegrenzung
  let maxSpeed = 1.2 * speedMultiplier;
  let vx = body.velocity.x;
  let vy = body.velocity.y;
  
  if (Math.abs(vx) > maxSpeed || Math.abs(vy) > maxSpeed) {
    let speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > maxSpeed) {
      Body.setVelocity(body, {
        x: (vx / speed) * maxSpeed,
        y: (vy / speed) * maxSpeed
      });
    }
  }
}

// NEU: Verbesserte Gravitations- und Bewegungsfunktion
function applyContinuousGravity() {
  // Berechne Gravitationskraft basierend auf gedrückten Tasten
  let gravityX = 0;
  let gravityY = 0;
  
  if (keys.left) gravityX -= GRAVITY_FORCE;
  if (keys.right) gravityX += GRAVITY_FORCE;
  if (keys.up) gravityY -= GRAVITY_FORCE;
  if (keys.down) gravityY += GRAVITY_FORCE;
  
  let hasGravity = gravityX !== 0 || gravityY !== 0;
  
  // Minuten-Partikel
  minuteParticles.forEach(particle => {
    if (!particle.isActive && !particle.isConsumed) {
      
      if (hasGravity) {
        // Gravitation anwenden mit individuellen Unterschieden
        let forceX = gravityX * particle.gravityMultiplier;
        let forceY = gravityY * particle.gravityMultiplier;
        
        Body.applyForce(particle.body, particle.body.position, {
          x: forceX,
          y: forceY
        });
      } else {
        // NEU: Freie Bewegung ohne Gravitation - sanfte Drift
        applyFreeDrift(particle);
      }
      
      // NEU: Anti-Clumping - Abstoßung zwischen nahen Partikeln
      applyParticleRepulsion(particle, minuteParticles);
      applyParticleRepulsion(particle, hourParticles);
    }
  });
  
  // Stunden-Partikel
  hourParticles.forEach(particle => {
    if (!particle.isActive && !particle.isConsumed) {
      
      if (hasGravity) {
        // Gravitation anwenden mit individuellen Unterschieden
        let forceX = gravityX * particle.gravityMultiplier;
        let forceY = gravityY * particle.gravityMultiplier;
        
        Body.applyForce(particle.body, particle.body.position, {
          x: forceX,
          y: forceY
        });
      } else {
        // NEU: Freie Bewegung ohne Gravitation - sanfte Drift
        applyFreeDrift(particle);
      }
      
      // NEU: Anti-Clumping - Abstoßung zwischen nahen Partikeln
      applyParticleRepulsion(particle, minuteParticles);
      applyParticleRepulsion(particle, hourParticles);
    }
  });
}

// NEU: Sanfte Drift-Bewegung ohne Gravitation
function applyFreeDrift(particle) {
  // Langsame, zufällige Richtungsänderung für jeden Partikel
  particle.driftAngle += random(-particle.angleChangeSpeed, particle.angleChangeSpeed);
  
  // Sanfte Drift-Bewegung in die aktuelle Richtung
  let forceX = cos(particle.driftAngle) * particle.driftSpeed;
  let forceY = sin(particle.driftAngle) * particle.driftSpeed;
  
  Body.applyForce(particle.body, particle.body.position, {
    x: forceX,
    y: forceY
  });
}

// NEU: Abstoßung zwischen nahen Partikeln (Anti-Clumping)
function applyParticleRepulsion(particle, otherParticles) {
  otherParticles.forEach(other => {
    if (particle === other || other.isActive || other.isConsumed) return;
    
    let dx = particle.body.position.x - other.body.position.x;
    let dy = particle.body.position.y - other.body.position.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < REPULSION_DISTANCE && distance > 0) {
      // Quadratisch abnehmende Abstoßung
      let force = REPULSION_FORCE / (distance * distance);
      let forceX = (dx / distance) * force;
      let forceY = (dy / distance) * force;
      
      Body.applyForce(particle.body, particle.body.position, {
        x: forceX,
        y: forceY
      });
    }
  });
}

// GEÄNDERT: Tastenstatus verwalten für dauerhafte Gravitation
function keyPressed() {
  if (keyCode === UP_ARROW) {
    keys.up = true;
  } else if (keyCode === DOWN_ARROW) {
    keys.down = true;
  } else if (keyCode === LEFT_ARROW) {
    keys.left = true;
  } else if (keyCode === RIGHT_ARROW) {
    keys.right = true;
  }
}

function keyReleased() {
  if (keyCode === UP_ARROW) {
    keys.up = false;
  } else if (keyCode === DOWN_ARROW) {
    keys.down = false;
  } else if (keyCode === LEFT_ARROW) {
    keys.left = false;
  } else if (keyCode === RIGHT_ARROW) {
    keys.right = false;
  }
}

function drawDigit(digit) {
  if (digit.targets.length === 0) return;
  
  // Berechne aktuelle Ziffer basierend auf digit.id
  let currentDigit = getCurrentDigitValue(digit.id);
  let pattern = SEGMENT_PATTERNS[currentDigit];
  
  noStroke();
  
  digit.targets.forEach((target, index) => {
    let shouldBeActive = false;
    
    // Prüfe ob dieser Punkt in einem aktiven Segment liegt
    if (target.segment && target.segment !== 'decoration') {
      let segmentIndex = ['a','b','c','d','e','f','g'].indexOf(target.segment);
      shouldBeActive = pattern[segmentIndex] === 1;
    }
    
    // Färbung basierend auf Aktivierung und Füllung
    if (shouldBeActive && index < digit.bluePoints) {
      // Aktiver Punkt in aktivem Segment - BLAU
      fill(...COLORS.dynamic);
    } else if (shouldBeActive) {
      // Aktiver Punkt, aber noch nicht gefüllt - HELL GRAU
      fill(100);
    } else {
      // Inaktiver Punkt - DUNKEL GRAU
      fill(40);
    }
    
    ellipse(target.x, target.y, RADIUS * 2);
  });
}

// Neue Hilfsfunktion: Ermittle aktuelle Ziffer für digit.id
function getCurrentDigitValue(digitId) {
  switch(digitId) {
    case 'h10': return Math.floor(h / 10);
    case 'h1': return h % 10;
    case 'm10': return Math.floor(m / 10);
    case 'm1': return Math.floor(s / 10); // Zehner der Sekunden
    default: return 0;
  }
}

function drawFlyingParticles() {
  noStroke();
  fill(...COLORS.dynamic);
  
  // Zeichne nur nicht-verbrauchte Partikel
  minuteParticles.forEach(particle => {
    if (!particle.isConsumed) {
      ellipse(particle.body.position.x, particle.body.position.y, RADIUS * 2);
    }
  });
  
  hourParticles.forEach(particle => {
    if (!particle.isConsumed) {
      ellipse(particle.body.position.x, particle.body.position.y, RADIUS * 2);
    }
  });
}

function drawColon() {
  // Berechne die exakte Mitte zwischen den Stunden- und Minutenziffern
  let hourEnd = START_X + 2 * DIGIT_WIDTH + DIGIT_SPACING;
  let minuteStart = START_X + 2 * DIGIT_WIDTH + 2 * DIGIT_SPACING + COLON_WIDTH;
  let colonX = hourEnd + (minuteStart - hourEnd) / 2;
  
  noStroke();
  fill(COLORS.static);
  ellipse(colonX, BASELINE_Y - 20, RADIUS * 2);
  ellipse(colonX, BASELINE_Y + 20, RADIUS * 2);
}

function drawDebugInfo() {
  fill(255);
  textAlign(LEFT);
  textSize(12);
  textFont('monospace');
  
  let minuteActive = minuteParticles.filter(p => p.isActive).length;
  let minuteConsumed = minuteParticles.filter(p => p.isConsumed).length;
  let minuteFree = minuteParticles.filter(p => !p.isActive && !p.isConsumed).length;
  
  let hourActive = hourParticles.filter(p => p.isActive).length;
  let hourConsumed = hourParticles.filter(p => p.isConsumed).length;
  let hourFree = hourParticles.filter(p => !p.isActive && !p.isConsumed).length;
  
  text(`FIXED: ${nf(h,2)}:${nf(m,2)}:${nf(s,2)}`, 20, 30);
  text(`Minuten-Partikel: Aktiv:${minuteActive} Verbraucht:${minuteConsumed} Frei:${minuteFree}`, 20, 50);
  text(`Stunden-Partikel: Aktiv:${hourActive} Verbraucht:${hourConsumed} Frei:${hourFree}`, 20, 70);
  text(`h10: ${digits[0].bluePoints}/${digits[0].targetBluePoints} (Stunden-Zehner)`, 20, 90);
  text(`h1:  ${digits[1].bluePoints}/${digits[1].targetBluePoints} (Stunden-Einer)`, 20, 110);
  text(`m10: ${digits[2].bluePoints}/${digits[2].targetBluePoints} (Minuten-Zehner)`, 20, 130);
  text(`m1:  ${digits[3].bluePoints}/${digits[3].targetBluePoints} (Sekunden-Zehner)`, 20, 150);
  text(`Steuerung: ↑↓←→ (dauerhafte Gravitation)`, 20, 180);
  
  // Zeige aktive Tasten
  let activeTasten = [];
  if (keys.up) activeTasten.push('↑');
  if (keys.down) activeTasten.push('↓');
  if (keys.left) activeTasten.push('←');
  if (keys.right) activeTasten.push('→');
  text(`Aktive Tasten: ${activeTasten.join(' + ') || 'keine'}`, 20, 200);
}
