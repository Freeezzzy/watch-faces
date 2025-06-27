Tobi
txby
Playing studying & working
•
TobiD

Tobi
[DXT]
 — 13/04/2025, 19:52
moin cosi
hast du eig. die Programmierhausaufgaben
cosi — 13/04/2025, 21:22
nopeee
Wollte ich jetzt gleich anfangen
Du?
Tobi
[DXT]
 — 13/04/2025, 21:24
ne, ich checks auch null
gebe nichts ab ig
cosi — 13/04/2025, 22:02
ich fang jz mal an
falls ich erfolgreicher bin melde ich mich
Tobi
[DXT]
 — 13/04/2025, 22:03
👍
Jetzt anfangen? Wir haben 22 Uhr
cosi — 13/04/2025, 22:06
ja und?
hast du ne Ahnung was überhaupt die Aufgabe is? also was soll das ergebnis sein? ich habs so verstanden das die bomben verdeckt sein sollen und man wenn man auf ein feld drückt 1. auf dem feld sieht ob da ne bombe war und 2. die felder drum herum aufgedeckt werden
stimmt des so?
Tobi
[DXT]
 — 13/04/2025, 22:08
Schau dir am besten so ein 5 Minuten Minesweeper Erklär Video an auf YouTube. Ich verstehe es selbst nicht so genau
Tobi
[DXT]
 — 13/04/2025, 22:08
Nicht bald ins Bett gehen?
cosi — 13/04/2025, 22:25
kuck ich mal spotan
Tobi
[DXT]
 — 23/04/2025, 10:39
🔧 Änderungen nur in draw() – ganz oben vor background(0); Das erste Background entfernen

// Arena-Hintergrund
background(10, 10, 30); // dunkleres Blau-Schwarz
stroke(255, 50); // leicht transparente Linien
strokeWeight(4);

// Mittellinie
for (let y = 0; y < height; y += 40) {
  line(width / 2, y, width / 2, y + 20);
}

// Spielfeldrahmen
noFill();
rect(0, 0, width, height);

// Mittelkreis
noFill();
ellipse(width / 2, height / 2, 150);
cosi — 23/04/2025, 10:41
// FANCY PONG
let ball;
let leftPaddle, rightPaddle;
let ballSpeed = 5;
let paddleHeight = 100;
let paddleWidth = 10;
Expand
message.txt
7 KB
Tobi
[DXT]
 — 23/04/2025, 10:55
Neues Spielfeld
// FANCY PONG
let ball;
let leftPaddle, rightPaddle;
let ballSpeed = 5;
let paddleHeight = 100;
let paddleWidth = 10;
Expand
message.txt
7 KB
cosi — 18:33
// watchface.js - Matter.js + p5.js Integration

// Voraussetzungen im HTML:
// <script src="https://cdn.jsdelivr.net/npm/p5@1.6.0/lib/p5.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.17.1/matter.min.js"></script>
// <script src="watchface.js"></script>
Expand
message.txt
9 KB
Tobi
[DXT]
 — 18:52
Image
cosi — 21:59
bisher hab ich das
let engine, world;
let dots = {
  tensHours: [],
  hours: [],
  tensMinutes: [],
  minutes: [],
Expand
message.txt
6 KB
﻿
let engine, world;
let dots = {
  tensHours: [],
  hours: [],
  tensMinutes: [],
  minutes: [],
  tensSeconds: [],
  seconds: []
};

// Farben entsprechend den Vorgaben
const colors = {
  background: '#000000',
  gray: '#666666',
  accent: '#0080FF'  // Blau als Akzentfarbe
};

// Moderne LCD-Style Ziffern-Patterns (10 Punkte pro Ziffer)
const digitShapes = {
  0: [1,1,1,1,0,0,1,1,1,1], // Rechteck-Form
  1: [0,0,1,1,0,0,1,1,0,0], // Rechte Seite
  2: [1,1,1,0,1,1,0,1,1,1], // S-Form
  3: [1,1,1,0,1,1,1,1,1,0], // E-Form gespiegelt
  4: [1,0,1,1,1,1,1,1,0,0], // Offen unten links
  5: [1,1,0,1,1,1,1,0,1,1], // S-Form gespiegelt
  6: [1,1,0,1,1,1,1,1,1,1], // Fast 8 ohne rechts oben
  7: [1,1,1,1,0,0,1,0,0,0], // L-Form gedreht
  8: [1,1,1,1,1,1,1,1,1,1], // Vollständig
  9: [1,1,1,1,1,1,1,1,1,0]  // Fast 8 ohne links unten
};

function setup() {
  let canvas = createCanvas(396, 484);
  canvas.parent('thecanvas');
  
  // Matter.js Engine setup
  engine = Matter.Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0;
  
  createDotArrays();
}

function createDotArrays() {
  let centerX = width / 2;
  let centerY = height / 2;
  let digitWidth = 40;
  let digitHeight = 50;
  
  // 6 Positionen für HH:MM:SS
  let positions = [
    {x: centerX - 120, y: centerY - 20}, // 10er-Stunden
    {x: centerX - 80, y: centerY - 20},  // Stunden
    {x: centerX - 20, y: centerY - 20},  // 10er-Minuten
    {x: centerX + 20, y: centerY - 20},  // Minuten
    {x: centerX + 80, y: centerY - 20},  // 10er-Sekunden
    {x: centerX + 120, y: centerY - 20}  // Sekunden
  ];
  
  let dotArrays = [dots.tensHours, dots.hours, dots.tensMinutes, dots.minutes, dots.tensSeconds, dots.seconds];
  
  // Für jede Ziffer 10 Punkte erstellen
  for (let i = 0; i < 6; i++) {
    createDigitShape(positions[i].x, positions[i].y, dotArrays[i], digitWidth, digitHeight);
  }
}

function createDigitShape(centerX, centerY, dotArray, width, height) {
  let radius = 2;
  
  // 10 Punkte in LCD-Style anordnen (3x4 Grid mit 2 zusätzlichen)
  let positions = [
    // Obere Reihe (3 Punkte)
    {x: centerX - width/3, y: centerY - height/2},
    {x: centerX, y: centerY - height/2},
    {x: centerX + width/3, y: centerY - height/2},
    
    // Obere Mitte (2 Punkte)
    {x: centerX - width/3, y: centerY - height/4},
    {x: centerX + width/3, y: centerY - height/4},
    
    // Untere Mitte (2 Punkte)
    {x: centerX - width/3, y: centerY + height/4},
    {x: centerX + width/3, y: centerY + height/4},
    
    // Untere Reihe (3 Punkte)
    {x: centerX - width/3, y: centerY + height/2},
    {x: centerX, y: centerY + height/2},
    {x: centerX + width/3, y: centerY + height/2}
  ];
  
  for (let i = 0; i < 10; i++) {
    let dot = Matter.Bodies.circle(positions[i].x, positions[i].y, radius, { 
      isStatic: true,
      render: { fillStyle: colors.gray }
    });
    Matter.World.add(world, dot);
    dotArray.push(dot);
  }
}

function draw() {
  background(colors.background);
  
  // Matter.js Engine update
  Matter.Engine.update(engine);
  
  // Aktuelle Zeit holen
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  
  // Punkte entsprechend der Zeit einfärben
  updateDots(hours, minutes, seconds);
  
  // Alle Punkte zeichnen
  drawDots();
  
  // Doppelpunkte zwischen den Ziffern
  drawColons(width/2);
}

function updateDots(hours, minutes, seconds) {
  // Alle Punkte zurücksetzen
  resetAllDots();
  
  // Aktuelle Ziffern anzeigen
  let tensHoursDigit = Math.floor(hours / 10);
  let hoursDigit = hours % 10;
  let tensMinutesDigit = Math.floor(minutes / 10);
  let minutesDigit = minutes % 10;
  let tensSecondsDigit = Math.floor(seconds / 10);
  let secondsDigit = seconds % 10;
  
  // Progressive Färbung basierend auf Zeit
  updateDigitProgressive(dots.tensHours, tensHoursDigit, hours, 24); // 24 Stunden
  updateDigitProgressive(dots.hours, hoursDigit, hours % 10, 10);
  updateDigitProgressive(dots.tensMinutes, tensMinutesDigit, minutes, 60); // 60 Minuten
  updateDigitProgressive(dots.minutes, minutesDigit, minutes % 10, 10);
  updateDigitProgressive(dots.tensSeconds, tensSecondsDigit, seconds, 60); // 60 Sekunden
  updateDigitProgressive(dots.seconds, secondsDigit, seconds % 10, 10);
}

function updateDigitProgressive(dotArray, currentDigit, currentValue, maxValue) {
  // Zuerst die Form der aktuellen Ziffer anzeigen
  let pattern = digitShapes[currentDigit];
  
  // Dann progressive Färbung basierend auf Zeit
  let progress = currentValue / maxValue;
  let dotsToFill = Math.floor(progress * dotArray.length);
  
  for (let i = 0; i < dotArray.length; i++) {
    if (i < dotsToFill && pattern[i] === 1) {
      dotArray[i].render.fillStyle = colors.accent;
    } else if (pattern[i] === 1) {
      dotArray[i].render.fillStyle = colors.gray;
    } else {
      dotArray[i].render.fillStyle = colors.background; // Unsichtbar
    }
  }
}

function resetAllDots() {
  Object.values(dots).forEach(dotArray => {
    dotArray.forEach(dot => {
      dot.render.fillStyle = colors.gray;
    });
  });
}

function drawDots() {
  Object.values(dots).forEach(dotArray => {
    dotArray.forEach(dot => {
      if (dot.render.fillStyle !== colors.background) {
        fill(dot.render.fillStyle);
        noStroke();
        circle(dot.position.x, dot.position.y, dot.circleRadius * 2);
      }
    });
  });
}

function drawColons(centerX) {
  fill(colors.gray);
  noStroke();
  // Doppelpunkte zwischen HH:MM:SS
  circle(centerX - 50, height/2 - 10, 3);
  circle(centerX - 50, height/2 + 10, 3);
  circle(centerX + 50, height/2 - 10, 3);
  circle(centerX + 50, height/2 + 10, 3);
}