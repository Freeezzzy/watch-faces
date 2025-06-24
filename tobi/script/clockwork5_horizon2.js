let Engine         = Matter.Engine,
    World          = Matter.World,
    Bodies         = Matter.Bodies,
    Body           = Matter.Body,
    Events         = Matter.Events;

let engine, world;
let minutePoints    = [];
let secondParticles = [];
let sekundenProSekunde = 6;
let lastSecond      = -1;

const MIN_HOUR_R     = 10;
const MAX_HOUR_R     = 60;

function setup() {
  createCanvas(960, 960);
  engine = Engine.create();
  world  = engine.world;

  // Start ohne Gravitation
  world.gravity.x = 0;
  world.gravity.y = 0;

  // unsichtbare Wände am Rand
  let wallOpts = { isStatic: true, restitution: 1.5, friction: 0, label: 'wall' };
  World.add(world, [
    Bodies.rectangle(width/2,    -1,        width, 2,    wallOpts),
    Bodies.rectangle(width/2,    height+1,  width, 2,    wallOpts),
    Bodies.rectangle(-1,         height/2,  2,     height, wallOpts),
    Bodies.rectangle(width+1,    height/2,  2,     height, wallOpts)
  ]);

  generateMinutePoints(minute());
}

function draw() {
  background(0);
  Engine.update(engine);

  let H = hour(),
      M = minute(),
      S = second();

  // Sext spawn verteilt über die Sekunde
  if (S !== lastSecond) {
    let t0 = millis();
    for (let i = 0; i < sekundenProSekunde; i++) {
      setTimeout(spawnSecondParticle, i * (1000 / sekundenProSekunde));
    }
    lastSecond = S;
  }

  updateMinuteMovement(M, S);
  updateSecondParticles();
  drawMinutePoints();

  // Stundenkreis (statische Größe, kein Puls)
  let r = map(H, 0, 23, MIN_HOUR_R, MAX_HOUR_R);
  noStroke();
  fill('#FF4444');
  ellipse(width/2, height/2, r * 2);

  drawSecondParticles();
}

function keyPressed() {
  if (keyCode === UP_ARROW) {
    world.gravity.x = 0;
    world.gravity.y = -1;
  } else if (keyCode === DOWN_ARROW) {
    world.gravity.x = 0;
    world.gravity.y = 1;
  } else if (keyCode === LEFT_ARROW) {
    world.gravity.x = -1;
    world.gravity.y = 0;
  } else if (keyCode === RIGHT_ARROW) {
    world.gravity.x = 1;
    world.gravity.y = 0;
  }
}

function generateMinutePoints(curM = 0) {
  // statisch: Minutenpunkte bewegen sich nicht unter Gravitation
  minutePoints = [];
  for (let i = 0; i < 60; i++) {
    let angle = random(TWO_PI),
        distR = random(200, 350);
    let x = width/2 + cos(angle) * distR,
        y = height/2 + sin(angle) * distR;
    let mp = Bodies.circle(x, y, 8, {
      isStatic: true,
      label: 'minute'
    });
    mp.original = { x, y };
    mp.arrived = i < curM;
    if (!mp.arrived) World.add(world, mp);
    minutePoints.push(mp);
  }
}

function updateMinuteMovement(m, s) {
  let mp = minutePoints[m];
  if (!mp || mp.arrived) return;
  let p = constrain(s / 59, 0, 1);
  Body.setPosition(mp, {
    x: lerp(mp.original.x, width/2, p),
    y: lerp(mp.original.y, height/2, p)
  });
  let r = map(hour(), 0, 23, MIN_HOUR_R, MAX_HOUR_R);
  if (dist(mp.position.x, mp.position.y, width/2, height/2) <= r + 8) {
    mp.arrived = true;
    World.remove(world, mp);
  }
}

function spawnSecondParticle() {
  let free = minutePoints.filter(mp => mp && !mp.arrived && !mp.busy);
  if (!free.length) return;
  let target = random(free);
  target.busy = true;

  let angle = random(TWO_PI),
      distR = random(300, 400);
  let x0 = width/2 + cos(angle) * distR,
      y0 = height/2 + sin(angle) * distR;
  let p = Bodies.circle(x0, y0, 6, {
    restitution: 1.5,
    frictionAir: 0.005,
    label: 'second'
  });
  p.origin = { x: x0, y: y0 };
  p.target = target;
  p.spawn  = millis();
  p.life   = 1000;
  secondParticles.push(p);
  World.add(world, p);
}

function updateSecondParticles() {
  let now = millis();
  for (let i = secondParticles.length - 1; i >= 0; i--) {
    let p = secondParticles[i],
        t = (now - p.spawn) / p.life;
    if (t >= 1) {
      World.remove(world, p);
      p.target.busy = false;
      secondParticles.splice(i, 1);
    } else {
      Body.setPosition(p, {
        x: lerp(p.origin.x, p.target.position.x, t),
        y: lerp(p.origin.y, p.target.position.y, t)
      });
    }
  }
}

function drawMinutePoints() {
  fill(180);
  noStroke();
  for (let mp of minutePoints) {
    if (mp && !mp.arrived) {
      ellipse(mp.position.x, mp.position.y, 16);
    }
  }
}

function drawSecondParticles() {
  fill(220);
  noStroke();
  for (let p of secondParticles) {
    ellipse(p.position.x, p.position.y, 8);
  }
}
