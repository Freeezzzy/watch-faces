const { Engine, World, Bodies, Body, Composite } = Matter;

let engine, world;
let digits = [];

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("thecanvas");

  engine = Engine.create();
  world = engine.world;

  let cfgs = [
    { x: 150, y: 150, color: "#ffffff", digitColor: "#00ff00", digit: abstract2() },
    { x: 350, y: 150, color: "#00ff00", digitColor: "#ffffff", digit: abstract1() },
    { x: 150, y: 350, color: "#222222", digitColor: "#00ff00", digit: abstract3() },
    { x: 350, y: 350, color: "#222222", digitColor: "#ffffff", digit: abstract5() }
  ];

  for (let cfg of cfgs) {
    // Container walls
    let container = createWalls(cfg.x, cfg.y, 120, 120);

    // Digit group
    let parts = cfg.digit.map(p => {
      let b = Bodies.rectangle(cfg.x + p.x, cfg.y + p.y, p.w, p.h, {
        restitution: 1,
        frictionAir: 0.01
      });
      Body.setVelocity(b, { x: random(-2, 2), y: random(-2, 2) });
      return b;
    });

    digits.push({ parts, color: cfg.color, digitColor: cfg.digitColor, pos: { x: cfg.x, y: cfg.y } });

    World.add(world, [...parts, ...container]);
  }
}

function draw() {
  background(0);
  Engine.update(engine);

  for (let d of digits) {
    fill(d.color);
    noStroke();
    rectMode(CENTER);
    rect(d.pos.x, d.pos.y, 120, 120, 25);

    fill(d.digitColor);
    noStroke();
    for (let p of d.parts) {
      push();
      translate(p.position.x, p.position.y);
      rotate(p.angle);
      rectMode(CENTER);
      rect(0, 0, p.bounds.max.x - p.bounds.min.x, p.bounds.max.y - p.bounds.min.y, 5);
      pop();
    }
  }
}

// Digit as parts (approximation)
function abstract1() {
  return [{ x: 0, y: -10, w: 8, h: 30 }];
}

function abstract2() {
  return [
    { x: 0, y: -15, w: 6, h: 20 },
    { x: -10, y: 15, w: 20, h: 6 }
  ];
}

function abstract3() {
  return [
    { x: -6, y: -10, w: 12, h: 6 },
    { x: -6, y: 0, w: 12, h: 6 },
    { x: -6, y: 10, w: 12, h: 6 }
  ];
}

function abstract5() {
  return [
    { x: -10, y: -10, w: 6, h: 20 },
    { x: 10, y: 10, w: 6, h: 20 }
  ];
}

// Box with 4 inner walls
function createWalls(x, y, w, h, t = 10) {
  let hw = w / 2, hh = h / 2;
  return [
    Bodies.rectangle(x - hw, y, t, h, { isStatic: true }),
    Bodies.rectangle(x + hw, y, t, h, { isStatic: true }),
    Bodies.rectangle(x, y - hh, w, t, { isStatic: true }),
    Bodies.rectangle(x, y + hh, w, t, { isStatic: true })
  ];
}
