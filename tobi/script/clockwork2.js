let waveAmplitude;
let waveLength = 300;
let waveSpeed;
let waterLevel;
let maxWaterLevel;
let minWaterLevel;

let splashes = [];
let bubbles = [];
let lastSecond = -1;

function setup() {
  createCanvas(400, 400);
  noStroke();
  minWaterLevel = height * 0.95;
  maxWaterLevel = height * 0.05;
}

function draw() {
  background(255);

  let h = hour();
  let m = minute();
  let s = second();

  // Test: feste Zeit simulieren
  // let h = 11;
  // let m = 59;xx

  waterLevel = map(m, 0, 59, minWaterLevel, maxWaterLevel);
  waveAmplitude = 15 + 5 * sin(frameCount * 0.02);
  waveSpeed = 0.03;

  drawWaterWithHourWaves(waterLevel, h);
  updateAndShowBubbles(h, m);
  updateAndShowSplashes();

  // Splash jede Sekunde
  if (s !== lastSecond) {
    lastSecond = s;
    let x = random(width * 0.1, width * 0.9);
    let y = random(waterLevel - waveAmplitude / 2, waterLevel + 10);
    splashes.push(new Splash(x, y));
  }
}

function drawWaterWithHourWaves(level, hours) {
  fill(0, 100, 255);
  beginShape();

  vertex(0, height);
  vertex(0, level);

  let hourWaveCount = constrain(hours, 1, 23);

  for (let x = 0; x <= width; x++) {
    let baseWave = sin((x / waveLength) * TWO_PI + frameCount * waveSpeed) * waveAmplitude;
    let zackenAmplitude = 8;
    let zackenWave = sin((x / width) * hourWaveCount * TWO_PI) * zackenAmplitude;
    let y = level + baseWave + zackenWave;
    vertex(x, y);
  }

  vertex(width, height);
  endShape(CLOSE);
}

class Bubble {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.size = random(4, 10);
    this.speed = random(0.2, 0.6);
    this.alpha = 120;
  }

  update() {
    this.pos.y -= this.speed;
    this.alpha -= 0.4;
    if (this.alpha < 0) this.alpha = 0;
  }

  show() {
    noStroke();
    fill(255, 255, 255, this.alpha * 0.7);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDone() {
    return this.alpha <= 0 || this.pos.y < waterLevel;
  }
}

function updateAndShowBubbles(h, m) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    bubbles[i].update();
    bubbles[i].show();
    if (bubbles[i].isDone()) bubbles.splice(i, 1);
  }

  if (frameCount % 3 === 0 && bubbles.length < m) {
    let x = random(width * 0.1, width * 0.9);
    let y = random(waterLevel + 10, height - 10);
    bubbles.push(new Bubble(x, y));
  }
}

class Splash {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.particles = [];
    this.life = 30;

    let count = floor(random(6, 12));
    for (let i = 0; i < count; i++) {
      this.particles.push({
        pos: createVector(x, y),
        vel: p5.Vector.random2D().mult(random(1.5, 4)),
        size: random(2, 5),
        alpha: 255,
      });
    }
  }

  update() {
    this.life--;
    for (let p of this.particles) {
      p.pos.add(p.vel);
      p.vel.y += 0.15;
      p.alpha -= 9;
      p.size *= 0.93;
    }
  }

  show() {
    noStroke();
    for (let p of this.particles) {
      fill(255, 255, 255, p.alpha);
      ellipse(p.pos.x, p.pos.y, p.size);
    }
  }

  isDone() {
    return this.life <= 0;
  }
}

function updateAndShowSplashes() {
  for (let i = splashes.length - 1; i >= 0; i--) {
    splashes[i].update();
    splashes[i].show();
    if (splashes[i].isDone()) splashes.splice(i, 1);
  }
}

function mouseDragged() {
  if (mouseY >= waterLevel - waveAmplitude) {
    splashes.push(new Splash(mouseX, mouseY));
  }
}

function mouseMoved() {
  if (mouseY >= waterLevel - waveAmplitude && frameCount % 7 === 0) {
    splashes.push(new Splash(mouseX, mouseY));
  }
}
