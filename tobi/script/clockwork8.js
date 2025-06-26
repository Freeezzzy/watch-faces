let engine, world;
let staticDots = {
  tensHours: [],
  hours: [],
  tensMinutes: [],
  minutes: [],
  tensSeconds: [],
  seconds: []
};
let physicsDots = [];
let walls = [];

// Farben entsprechend den Vorgaben
const colors = {
  background: '#000000',
  gray: '#666666',
  accent: '#0080FF'
};

// 7-Segment Display Patterns (21 Punkte pro Ziffer)
const digitShapes = {
  0: [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // Segment: aaa,bbb,ccc,ddd,eee,fff,ggg
  1: [0,0,0,1,1,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
  2: [1,1,1,1,1,1,0,1,1,1,1,1,1,0,0,0,1,1,1,0,0],
  3: [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,0,0,1,1],
  4: [0,0,0,1,1,1,0,1,1,1,0,0,0,1,1,1,1,1,1,0,0],
  5: [1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  6: [1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  7: [1,1,1,1,1,1,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
  8: [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  9: [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0]
};

let previousDigits = [0,0,0,0,0,0]; // Für Änderungsdetektion

function setup() {
  let canvas = createCanvas(396, 484);
  canvas.parent('thecanvas');
  
  // Matter.js Engine setup
  engine = Matter.Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0.3;
  
  createStaticDots();
  createWalls();
}

function createStaticDots() {
  let centerX = width / 2;
  let centerY = height / 2;
  let digitWidth = 40;
  let digitHeight = 60;
  
  // 6 Positionen für HH:MM:SS
  let positions = [
    {x: centerX - 120, y: centerY - 20}, // 10er-Stunden
    {x: centerX - 80, y: centerY - 20},  // Stunden
    {x: centerX - 20, y: centerY - 20},  // 10er-Minuten
    {x: centerX + 20, y: centerY - 20},  // Minuten
    {x: centerX + 80, y: centerY - 20},  // 10er-Sekunden
    {x: centerX + 120, y: centerY - 20}  // Sekunden
  ];
  
  let dotArrays = [staticDots.tensHours, staticDots.hours, staticDots.tensMinutes, 
                   staticDots.minutes, staticDots.tensSeconds, staticDots.seconds];
  
  // Für jede Ziffer 21 Punkte erstellen (7-Segment mit je 3 Punkten)
  for (let i = 0; i < 6; i++) {
    createDigitShape(positions[i].x, positions[i].y, dotArrays[i], digitWidth, digitHeight);
  }
}

function createDigitShape(centerX, centerY, dotArray, width, height) {
  // 7-Segment Layout mit je 3 Punkten pro Segment = 21 Punkte
  let segments = [
    // Segment A (oben)
    [{x: centerX-12, y: centerY-25}, {x: centerX, y: centerY-25}, {x: centerX+12, y: centerY-25}],
    // Segment B (rechts oben)
    [{x: centerX+15, y: centerY-20}, {x: centerX+15, y: centerY-10}, {x: centerX+15, y: centerY-5}],
    // Segment C (rechts unten)
    [{x: centerX+15, y: centerY+5}, {x: centerX+15, y: centerY+10}, {x: centerX+15, y: centerY+20}],
    // Segment D (unten)
    [{x: centerX-12, y: centerY+25}, {x: centerX, y: centerY+25}, {x: centerX+12, y: centerY+25}],
    // Segment E (links unten)
    [{x: centerX-15, y: centerY+5}, {x: centerX-15, y: centerY+10}, {x: centerX-15, y: centerY+20}],
    // Segment F (links oben)
    [{x: centerX-15, y: centerY-20}, {x: centerX-15, y: centerY-10}, {x: centerX-15, y: centerY-5}],
    // Segment G (mitte)
    [{x: centerX-12, y: centerY}, {x: centerX, y: centerY}, {x: centerX+12, y: centerY}]
  ];
  
  // Alle Punkte zu dotArray hinzufügen
  for (let segment of segments) {
    for (let point of segment) {
      dotArray.push({x: point.x, y: point.y, radius: 2});
    }
  }
}

function createWalls() {
  // Wände für Physics Simulation
  walls.push(Matter.Bodies.rectangle(width/2, -10, width, 20, { isStatic: true })); // Oben
  walls.push(Matter.Bodies.rectangle(width/2, height+10, width, 20, { isStatic: true })); // Unten
  walls.push(Matter.Bodies.rectangle(-10, height/2, 20, height, { isStatic: true })); // Links
  walls.push(Matter.Bodies.rectangle(width+10, height/2, 20, height, { isStatic: true })); // Rechts
  
  for (let wall of walls) {
    Matter.World.add(world, wall);
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
  
  let currentDigits = [
    Math.floor(hours / 10),
    hours % 10,
    Math.floor(minutes / 10),
    minutes % 10,
    Math.floor(seconds / 10),
    seconds % 10
  ];
  
  // Prüfe auf Ziffernwechsel
  checkForDigitChanges(currentDigits);
  
  // Zeichne statische graue Punkte
  drawStaticDots(currentDigits);
  
  // Zeichne aktive blaue Physics-Punkte
  drawPhysicsDots();
  
  // Erstelle neue blaue Punkte für aktuelle Zeit
  createBlueDots(currentDigits);
  
  // Doppelpunkte zwischen den Ziffern
  drawColons(width/2);
  
  previousDigits = [...currentDigits];
}

function checkForDigitChanges(currentDigits) {
  for (let i = 0; i < 6; i++) {
    if (currentDigits[i] !== previousDigits[i]) {
      // Ziffer hat sich geändert - sprenge blaue Punkte weg!
      explodeBlueDots(i);
    }
  }
}

function explodeBlueDots(digitIndex) {
  // Finde alle blauen Punkte dieser Ziffer und gib ihnen explosive Geschwindigkeiten
  physicsDots.forEach(dot => {
    if (dot.digitIndex === digitIndex && !dot.exploded) {
      // ERST jetzt wird der Punkt dynamisch und explodiert!
      Matter.Body.setStatic(dot.body, false);
      
      let forceX = (Math.random() - 0.5) * 0.1;
      let forceY = (Math.random() - 0.5) * 0.1;
      Matter.Body.applyForce(dot.body, dot.body.position, {x: forceX, y: forceY});
      dot.exploded = true;
    }
  });
}

function drawStaticDots(currentDigits) {
  let dotArrays = [staticDots.tensHours, staticDots.hours, staticDots.tensMinutes, 
                   staticDots.minutes, staticDots.tensSeconds, staticDots.seconds];
  
  for (let digitIndex = 0; digitIndex < 6; digitIndex++) {
    let pattern = digitShapes[currentDigits[digitIndex]];
    let dots = dotArrays[digitIndex];
    
    for (let i = 0; i < dots.length; i++) {
      if (pattern[i] === 1) {
        fill(colors.gray);
        noStroke();
        circle(dots[i].x, dots[i].y, dots[i].radius * 2);
      }
    }
  }
}

function createBlueDots(currentDigits) {
  let dotArrays = [staticDots.tensHours, staticDots.hours, staticDots.tensMinutes, 
                   staticDots.minutes, staticDots.tensSeconds, staticDots.seconds];
  
  for (let digitIndex = 0; digitIndex < 6; digitIndex++) {
    let pattern = digitShapes[currentDigits[digitIndex]];
    let dots = dotArrays[digitIndex];
    
    for (let i = 0; i < dots.length; i++) {
      if (pattern[i] === 1) {
        // Prüfe ob bereits ein blauer Punkt an dieser Position existiert
        let existingDot = physicsDots.find(pd => 
          Math.abs(pd.targetX - dots[i].x) < 1 && 
          Math.abs(pd.targetY - dots[i].y) < 1 && 
          pd.digitIndex === digitIndex &&
          !pd.exploded
        );
        
        if (!existingDot) {
          // Erstelle neuen blauen Physics-Punkt - ABER STATISCH!
          let blueDot = Matter.Bodies.circle(dots[i].x, dots[i].y, 2, {
            isStatic: true,  // STATISCH bis zur Explosion
            restitution: 0.8,
            render: { fillStyle: colors.accent }
          });
          
          Matter.World.add(world, blueDot);
          
          physicsDots.push({
            body: blueDot,
            targetX: dots[i].x,
            targetY: dots[i].y,
            digitIndex: digitIndex,
            exploded: false
          });
        }
      }
    }
  }
}

function drawPhysicsDots() {
  // Entferne alte explodierte Punkte die außerhalb des Bildschirms sind
  physicsDots = physicsDots.filter(dot => {
    let pos = dot.body.position;
    if (dot.exploded && (pos.x < -50 || pos.x > width + 50 || pos.y < -50 || pos.y > height + 50)) {
      Matter.World.remove(world, dot.body);
      return false;
    }
    return true;
  });
  
  // Zeichne alle Physics-Punkte
  physicsDots.forEach(dot => {
    fill(colors.accent);
    noStroke();
    circle(dot.body.position.x, dot.body.position.y, 4);
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