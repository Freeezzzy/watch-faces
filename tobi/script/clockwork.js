/* ===========================================================
   WATER-CLOCK 400 × 400
   p5.js  +  (optional) Matter.js   –   SINGLE WATER SURFACE
   -----------------------------------------------------------
   • Füllstand wächst linear über 24 h (00 : 00 → leer … 23 : 59 → voll)
   • Wasseroberfläche bleibt IMMER senkrecht zur Schwerkraft
     → kippt sofort, ohne Trägheit, wenn du das Handy neigst
   • KEINE Blasen, KEINE Partikel
   =========================================================== */

let minLvl, maxLvl;           // untere / obere Pegel-Grenze
let waveAmp = 18;             // Amplitude der Welle
let waveLen = 180;            // Wellenlänge   (px)
let waveSpd = 0.025;          // Wellen­geschw. (rad / Frame)

/* -----------------------------------------------------------
   p5 INITIALISIERUNG
----------------------------------------------------------- */
function setup() {
  createCanvas(400, 400);
  noStroke();
  minLvl = height * 0.96;     // fast ganz unten
  maxLvl = height * 0.04;     // fast ganz oben

  /* iOS-Permission für Motion-Sensor */
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    const b = createButton('🎛 Sensor aktivieren').position(10, 10);
    b.mousePressed(() =>
      DeviceOrientationEvent.requestPermission()
        .then(r => { if (r === 'granted') b.remove(); }));
  }
}

/* -----------------------------------------------------------
   p5 ZEICHEN-SCHLEIFE
----------------------------------------------------------- */
function draw() {
  background(255);

  /* 1 — AKTUELLE SCHWERKRAFT AUS GERÄTE-NEIGUNG
         rotationX … -180° (Kopf nach oben) → +180° (Kopf nach unten)
         rotationY …  -90° (rechts hoch)     →  +90° (links  hoch)
         Wir normalisieren auf -1 … +1                                    */
  const g = {
    x: constrain(rotationY / 45, -1, 1),    // links/rechts-Komponente
    y: constrain(rotationX / 45, -1, 1)     // oben/unten-Komponente
  };

  /* 2 — WASSER-FÜLLSTAND (24-h-Uhr)                                       */
  const now      = new Date();
  const seconds  = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
  const fillFrac = seconds / 86400;                 // 0 … 0.999 …
  const baseLvl  = lerp(minLvl, maxLvl, fillFrac);  // „ungekippter“ Pegel

  /* 3 — VERTIKALER SHIFT (Gerät nach vorn / hinten kippen)                */
  //  g.y  +1 → Schwerkraft zeigt nach unten (Wasser tiefer)
  //  g.y  -1 → Schwerkraft zeigt nach oben  (Wasser höher)
  const vShift   = g.y * height * 0.45;             // ±45 % der Höhe
  const lvl      = constrain(baseLvl + vShift, maxLvl, minLvl);

  /* 4 — SLOPE DER OBERFLÄCHE  (Gerät links/rechts kippen)                 */
  //  Wasseroberfläche steht LOTRECHT zur Schwerkraft → tan(φ) = -gx/gy
  //  Wenn gy ≈ 0 (Gerät senkrecht gehalten), zwingen wir max. Steigung.
  const eps   = 0.01;
  const slope = abs(g.y) < eps ? (g.x > 0 ? -5 : 5)   // fast vertikal
                               : (-g.x / g.y);        // physikalisch exakt

  /* 5 — WASSERFLÄCHE ZEICHNEN                                             */
  fill(0, 120, 255);
  beginShape();
  vertex(0, height);
  vertex(0, lvl);

  for (let x = 0; x <= width; x++) {
    const tilt = slope * (x - width / 2);            // lineare Neigung
    const wave = sin((x / waveLen) * TWO_PI + frameCount * waveSpd) * waveAmp;
    vertex(x, lvl + tilt + wave);
  }

  vertex(width, height);
  endShape(CLOSE);

  /* 6 — DEBUG-OVERLAY (optional auskommentieren)                           */
  /*
  fill(0);
  textSize(12);
  textAlign(LEFT, TOP);
  text(`rotX: ${nf(rotationX,2,1)}°\nrotY: ${nf(rotationY,2,1)}°\n`+
       `g.x : ${nf(g.x,1,2)}\n`+
       `g.y : ${nf(g.y,1,2)}\n`+
       `slope: ${nf(slope,1,2)}`, 10, 10);
  */
}
