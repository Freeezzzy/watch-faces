// watchface.js - Matter.js + p5.js Integration

// Voraussetzungen im HTML:
// <script src="https://cdn.jsdelivr.net/npm/p5@1.6.0/lib/p5.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.17.1/matter.min.js"></script>
// <script src="watchface.js"></script>

const Engine = Matter.Engine;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Vector = Matter.Vector;
const Events = Matter.Events;
const Runner = Matter.Runner;

let engine, world, runner;
let staticBodies = [];
let dynamicBodies = [];
let targets = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  engine = Engine.create();
  world = engine.world;
  // Runner statt Engine.run
  runner = Runner.create();
  Runner.run(runner, engine);

  updateTimeShape();
  setInterval(updateTimeShape, 60000);
  Events.on(engine, 'beforeUpdate', applyForces);
}

function draw() {
  background(255);
  noStroke();
  // statische Punkte in Grau
  fill('#bbbbbb');
  staticBodies.forEach(b => ellipse(b.position.x, b.position.y, b.circleRadius * 2));
  // dynamische Punkte in Blau
  fill('#0066cc');
  dynamicBodies.forEach(b => ellipse(b.position.x, b.position.y, b.circleRadius * 2));
}

function samplePointsFromText(text, fontSize, density) {
  const gfx = createGraphics(width, height);
  gfx.clear();
  gfx.textAlign(CENTER, CENTER);
  gfx.textSize(fontSize);
  gfx.noStroke();
  gfx.fill(255);
  gfx.text(text, width / 2, height / 2);
  gfx.loadPixels();
  const pts = [];
  for (let y = 0; y < height; y += density) {
    for (let x = 0; x < width; x += density) {
      const alpha = gfx.pixels[4 * (y * width + x) + 3];
      if (alpha > 128) {
        pts.push({ x: x, y: y });
      }
    }
  }
  return pts;
}

function updateTimeShape() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const timeText = `${h}:${m}`;

  targets = samplePointsFromText(timeText, 200, 12);

  // statische Bodies erneuern
  staticBodies.forEach(b => World.remove(world, b));
  staticBodies = targets.map(p => {
    const b = Bodies.circle(p.x, p.y, 3, { isStatic: true });
    World.add(world, b);
    return b;
  });

  // dynamische Bodies anpassen
  if (dynamicBodies.length > targets.length) {
    const extra = dynamicBodies.splice(targets.length);
    extra.forEach(b => World.remove(world, b));
  } else {
    for (let i = dynamicBodies.length; i < targets.length; i++) {
      const b = Bodies.circle(
        random(width),
        random(height),
        5,
        { restitution: 0.9, frictionAir: 0.02 }
      );
      World.add(world, b);
      dynamicBodies.push(b);
    }
  }

  dynamicBodies.forEach((b, i) => b.target = targets[i]);
}

function applyForces() {
  dynamicBodies.forEach(b => {
    const force = Vector.sub(b.target, b.position);
    const dir = Vector.normalise(force);
    Body.applyForce(b, b.position, Vector.mult(dir, 0.0002));
  });
}

// Gravitation über Tastatur
function keyPressed() {
  switch (keyCode) {
    case UP_ARROW:
      engine.gravity.x = 0;
      engine.gravity.y = -1;
      break;
    case DOWN_ARROW:
      engine.gravity.x = 0;
      engine.gravity.y = 1;
      break;
    case LEFT_ARROW:
      engine.gravity.x = -1;
      engine.gravity.y = 0;
      break;
    case RIGHT_ARROW:
      engine.gravity.x = 1;
      engine.gravity.y = 0;
      break;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
