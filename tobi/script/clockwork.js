/*  Watch‑Face “Fleet” – Stunden‑ & Minuten‑Schiffe  */
/*  große = Stunden, kleine = Minuten                */

let waveOffset = 0;
let targetWaterLevel;
let currentWaterLevel;

function setup() {
  createCanvas(960, 960);
  textFont('monospace');
  textSize(48);
  textAlign(CENTER, CENTER);

  // Anfangs­wasserstand setzen
  targetWaterLevel = calcWaterLevel(minute());
  currentWaterLevel = targetWaterLevel;
}

function draw() {
  background(0);

  // Echtzeit‑Werte
  const h  = hour();
  const m  = minute();
  const ms = millis() % 60000;          // 0 – 59999
  const t  = ms / 60000;                // Fortschritt innerhalb der Minute (0‑1)

  /* ---------- Wasserstand & Welle ---------- */
  targetWaterLevel  = calcWaterLevel(m);
  currentWaterLevel = lerp(currentWaterLevel, targetWaterLevel, 0.05);

  const waveHeight  = 25;
  const waveLength  = 180;

  // Welle zeichnen (weiß)
  fill(255);
  noStroke();
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width; x += 10) {
    const y = currentWaterLevel + sin((x + waveOffset) / waveLength) * waveHeight;
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);

  waveOffset += 1.5;

  /* ---------- Uhrzeit‑Text ---------- */
  fill(255);
  text(nf(h, 2) + ':' + nf(m, 2), width / 2, height / 2);

  /* ---------- Schiffs‑Flotte ---------- */
  drawFleet(h,  60, 1.4, t);   // große Schiffe (Stunden)
  drawFleet(m,  24, 0.8, t);   // kleine Schiffe (Minuten)
}

/* ===== Hilfsfunktionen ===== */

function calcWaterLevel(minuteValue) {
  // 0 min = voll, 59 min = fast leer
  return map(minuteValue, 0, 59, height * 0.95, height * 0.15);
}

/**
 * Zeichnet n Schiffe mit bestimmtem Abstand & Größe.
 * spacing    – horizontaler Abstand zwischen Schiffen
 * sizeFactor – Skalierung des Schiffs (1 = Basisgröße)
 * t          – Fortschritt innerhalb der Minute (0‑1)
 */
function drawFleet(n, spacing, sizeFactor, t) {
  if (n === 0) return;

  const totalWidth = width + 200 + (n - 1) * spacing;  // Flugbahn­länge
  for (let i = 0; i < n; i++) {
    const startX = -100 - i * spacing;                 // Startpunkt links
    const x      = startX + t * totalWidth;            // lin. Bewegung
    const yWave  = currentWaterLevel +
                   sin((x + waveOffset) / 180) * 25;   // auf Welle sitzen
    drawShip(x, yWave, sizeFactor);
  }
}

/**
 * Einfaches Segelschiff
 * sizeFactor steuert gesamte Größe
 */
function drawShip(cx, cy, sizeFactor = 1) {
  push();
  translate(cx, cy);
  scale(sizeFactor);
  fill('#A4DDED');
  stroke('#A4DDED');
  strokeWeight(2);

  // Rumpf
  noStroke();
  beginShape();
  vertex(-20, 0);
  vertex( 20, 0);
  vertex( 10, 10);
  vertex(-10, 10);
  endShape(CLOSE);

  // Mast & Segel
  stroke('#A4DDED');
  line(0, 0, 0, -20);
  noStroke();
  triangle(0, -20, 0, 0, 12, -10);
  pop();
}
