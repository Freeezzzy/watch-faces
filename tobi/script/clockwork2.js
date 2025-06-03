let waveAmplitude;
let waveLength = 300;
let waveSpeed;
let waterLevel;
let maxWaterLevel;
let minWaterLevel;

let splashes = [];
let bubbles = [];

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

  // Wasserstand an Minuten koppeln
  waterLevel = map(m, 0, 59, minWaterLevel, maxWaterLevel);

  // Wellenamplitude leicht variieren
  waveAmplitude = 15 + 5 * sin(frameCount * 0.02);

  waveSpeed = 0.03;

  drawWaterWithHourWaves(waterLevel, h);

  updateAndShowBubbles(h);

  updateAndShowSplashes();
}

function drawWaterWithHourWaves(level, hours) {
  fill(0, 100, 255);
  beginShape();

  vertex(0, height);
  vertex(0, level);

  // Große Grundwelle (Basis)
  for (let x = 0; x <= width; x++) {
    let baseWave = sin((x / waveLength) * TWO_PI + frameCount * waveSpeed) * waveAmplitude;
    
    // Kleine Wellen für jede Stunde
    let hourWaves = 0;
    let hourWaveCount = constrain(hours, 0, 23);
    for (let i = 0; i < hourWaveCount; i++) {
      // Verteile die kleinen Wellen gleichmäßig über die Breite
      let wavePos = map(i, 0, hourWaveCount - 1, 0, width);
      let distance = abs(x - wavePos);
      let maxDist = width / hourWaveCount / 2;
      if (distance < maxDist) {
        // Kleine Welle ist eine Sinuswelle mit kleiner Amplitude, „lokal“ begrenzt
        let localX = map(distance, maxDist, 0, 0, PI);
        hourWaves += sin(localX) * 8;
      }
    }

    let y = level + baseWave + hourWaves;
    vertex(x, y);
  }

  vertex(width, height);
  endShape(CLOSE);
}

// Kleine weiße Blasen als optisches Detail
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

function updateAndShowBubbles(h) {
  for (let i = bubbles.length - 1; i >= 0; i--) {
    bubbles[i].update();
    bubbles[i].show();
    if (bubbles[i].isDone()) bubbles.splice(i, 1);
  }
  if (frameCount % 30 === 0 && bubbles.length < h) {
    let x = random(width * 0.1, width * 0.9);
    let y = random(waterLevel + 10, height - 10);
    bubbles.push(new Bubble(x, y));
  }
}

// Splash Klasse (weiße Spritzer)
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
    fill(255, 255, 255, 200);
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
