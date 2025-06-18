let Engine = Matter.Engine,
    World = Matter.World,
    Bodies = Matter.Bodies,
    Constraint = Matter.Constraint;

let engine, world;
let particles = [];
let constraints = [];

const cols = 60;
const spacing = 10;
const waterHeight = 300;

function setup() {
  createCanvas(windowWidth, windowHeight);
  engine = Engine.create();
  world = engine.world;
  world.gravity.scale = 0.005; // stronger gravity scale for visual effect

  let startX = 0;
  let y = waterHeight;

  for (let i = 0; i < cols; i++) {
    let x = startX + i * spacing;
    let fixed = (i === 0 || i === cols - 1);

    let particle = Bodies.circle(x, y, 5, {
      isStatic: fixed,
      friction: 0.05,
      restitution: 1.2,
      density: 0.001
    });

    particles.push(particle);
    World.add(world, particle);

    if (i > 0) {
      let constraint = Constraint.create({
        bodyA: particles[i - 1],
        bodyB: particles[i],
        length: spacing,
        stiffness: 0.4,
        damping: 0.1
      });
      constraints.push(constraint);
      World.add(world, constraint);
    }
  }
}

function draw() {
  background(255);

  // Tilt-based gravity with REDUCED sensitivity
  const tiltSensitivity = 0.03; // ⬅️ Lower = less sensitive
  const g = {
    x: constrain(rotationY * tiltSensitivity, -1, 1),
    y: constrain(rotationX * tiltSensitivity, -1, 1)
  };

  world.gravity.x = g.x;
  world.gravity.y = g.y;

  // Update physics
  for (let i = 0; i < 2; i++) {
    Engine.update(engine);
  }

  // Draw water shape
  noStroke();
  fill(30, 144, 255, 180);
  beginShape();
  vertex(0, height);
  for (let p of particles) {
    vertex(p.position.x, p.position.y);
  }
  vertex(width, height);
  endShape(CLOSE);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// iOS permission
function touchStarted() {
  if (typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          // motion allowed
        }
      })
      .catch(console.error);
  }
}
