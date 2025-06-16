// === Magnetic Dots Watch Face (mit Orbit, Farbe & Dynamik) ===
// Benötigt p5.js + matter.js

let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Vector = Matter.Vector;

let engine;
let world;

let hourDots = [];
let minuteDots = [];
let secondDots = [];

let hourTarget, minuteTarget, secondTarget;
let lastSecond = -1;

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0;

  hourTarget = createVector(160, 300);
  minuteTarget = createVector(800, 300);
  secondTarget = createVector(480, 800);

  let now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();

  for (let i = 0; i < h; i++) addDot(hourDots, hourTarget, 48);
  for (let i = 0; i < m; i++) addDot(minuteDots, minuteTarget, 32);
}

function draw() {
  background(255);
  Engine.update(engine);

  let now = new Date();
  let currentSecond = now.getSeconds();

  if (currentSecond !== lastSecond) {
    addDot(secondDots, secondTarget, 20);
    lastSecond = currentSecond;
  }

  noStroke();
  fill(0);
  ellipse(hourTarget.x, hourTarget.y, 200);
  ellipse(minuteTarget.x, minuteTarget.y, 10);
  ellipse(secondTarget.x, secondTarget.y, 10);

  drawDots(hourDots, hourTarget, color(0));             // Stunde: Schwarz
  drawDots(minuteDots, minuteTarget, color(80));        // Minute: Dunkelgrau
  drawDots(secondDots, secondTarget, color(0, 180, 255)); // Sekunde: Highlight
}

function addDot(array, target, r) {
  let angle = random(TWO_PI);
  let radius = random(40, 100);
  let x = target.x + cos(angle) * radius;
  let y = target.y + sin(angle) * radius;
  let dot = Bodies.circle(x, y, r, {
    restitution: 0.9,
    friction: 0,
    frictionAir: 0.01,
    inertia: Infinity,
    collisionFilter: { group: -1 } // Gruppenabstoßung
  });
  World.add(world, dot);
  array.push({ body: dot, r: r });
}

function drawDots(array, target, col) {
  fill(col);
  noStroke();
  for (let obj of array) {
    let b = obj.body;
    ellipse(b.position.x, b.position.y, obj.r * 2);

    // Orbit-Style Ziel mit Zittern
    let offset = p5.Vector.random2D().mult(random(0.5, 1.5));
    let targetOffset = createVector(target.x + offset.x, target.y + offset.y);

    let dir = Vector.sub(targetOffset, b.position);
    dir = Vector.normalise(dir);
    let force = Vector.mult(dir, 0.0007);
    Body.applyForce(b, b.position, force);
  }
}