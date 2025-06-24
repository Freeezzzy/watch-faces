// Erweiterte Matter.js + p5.js Watchface mit Abstoßung und verbesserter Physik

const { Engine, World, Bodies, Body, Vector, Events, Runner } = Matter;
let engine, world, runner;
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
};

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Matter.js Engine Setup
  engine = Engine.create();
  world = engine.world;
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
}

function updateTimeShape() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
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
      break;
  }
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