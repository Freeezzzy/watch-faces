let engine, world;
let staticDots = {
  tensHours: [],
  hours: [],
  tensMinutes: [],
  minutes: []
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
  0: [1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
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

let previousDigits = [0,0,0,0];

function setup() {
  let canvas = createCanvas(396, 484);
  canvas.parent('thecanvas');
  
  engine = Matter.Engine.create();
  world = engine.world;
  engine.world.gravity.y = 0.3;
  
  createStaticDots();
  createWalls();
}

function createStaticDots() {
  let centerX = width / 2;
  let centerY = height / 2;
  
  let positions = [
    {x: centerX - 90, y: centerY - 20},
    {x: centerX - 30, y: centerY - 20},
    {x: centerX + 30, y: centerY - 20},
    {x: centerX + 90, y: centerY - 20}
  ];
  
  let dotArrays = [staticDots.tensHours, staticDots.hours, staticDots.tensMinutes, staticDots.minutes];
  
  for (let i = 0; i < 4; i++) {
    createDigitShape(positions[i].x, positions[i].y, dotArrays[i]);
  }
}

function createDigitShape(centerX, centerY, dotArray) {
  let segments = [
    [{x: centerX-12, y: centerY-25}, {x: centerX, y: centerY-25}, {x: centerX+12, y: centerY-25}],
    [{x: centerX+15, y: centerY-20}, {x: centerX+15, y: centerY-10}, {x: centerX+15, y: centerY-5}],
    [{x: centerX+15, y: centerY+5}, {x: centerX+15, y: centerY+10}, {x: centerX+15, y: centerY+20}],
    [{x: centerX-12, y: centerY+25}, {x: centerX, y: centerY+25}, {x: centerX+12, y: centerY+25}],
    [{x: centerX-15, y: centerY+5}, {x: centerX-15, y: centerY+10}, {x: centerX-15, y: centerY+20}],
    [{x: centerX-15, y: centerY-20}, {x: centerX-15, y: centerY-10}, {x: centerX-15, y: centerY-5}],
    [{x: centerX-12, y: centerY}, {x: centerX, y: centerY}, {x: centerX+12, y: centerY}]
  ];
  
  for (let segment of segments) {
    for (let point of segment) {
      dotArray.push({x: point.x, y: point.y, radius: 2});
    }
  }
}

function createWalls() {
  walls.push(Matter.Bodies.rectangle(width/2, -10, width, 20, { isStatic: true }));
  walls.push(Matter.Bodies.rectangle(width/2, height+10, width, 20, { isStatic: true }));
  walls.push(Matter.Bodies.rectangle(-10, height/2, 20, height, { isStatic: true }));
  walls.push(Matter.Bodies.rectangle(width+10, height/2, 20, height, { isStatic: true }));
  
  for (let wall of walls) {
    Matter.World.add(world, wall);
  }
}

function draw() {
  background(colors.background);
  Matter.Engine.update(engine);
  
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  let seconds = now.getSeconds();
  
  let currentDigits = [
    Math.floor(hours / 10),
    hours % 10,
    Math.floor(minutes / 10),
    minutes % 10
  ];
  
  checkForDigitChanges(currentDigits);
  
  drawStaticDots(currentDigits);
  drawPhysicsDots();
  createBlueDots(currentDigits, seconds);
  drawColons(width / 2);
  
  previousDigits = [...currentDigits];
}

function checkForDigitChanges(currentDigits) {
  for (let i = 0; i < 4; i++) {
    if (currentDigits[i] !== previousDigits[i]) {
      explodeBlueDots(i);
    }
  }
}

function explodeBlueDots(digitIndex) {
  physicsDots.forEach(dot => {
    if (dot.digitIndex === digitIndex && !dot.exploded) {
      Matter.Body.setStatic(dot.body, false);
      
      let forceX = (Math.random() - 0.5) * 0.1;
      let forceY = (Math.random() - 0.5) * 0.1;
      Matter.Body.applyForce(dot.body, dot.body.position, {x: forceX, y: forceY});
      dot.exploded = true;
    }
  });
}

function drawStaticDots(currentDigits) {
  let dotArrays = [staticDots.tensHours, staticDots.hours, staticDots.tensMinutes, staticDots.minutes];
  
  for (let digitIndex = 0; digitIndex < 4; digitIndex++) {
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

function createBlueDots(currentDigits, seconds) {
  let dotArrays = [staticDots.tensHours, staticDots.hours, staticDots.tensMinutes, staticDots.minutes];
  
  for (let digitIndex = 0; digitIndex < 4; digitIndex++) {
    let pattern = digitShapes[currentDigits[digitIndex]];
    let dots = dotArrays[digitIndex];
    
    // Progressive Färbung nur für Minuten-Ziffern basierend auf Sekunden
    let shouldFillProgressively = (digitIndex === 2 || digitIndex === 3);
    let progressPercent = shouldFillProgressively ? seconds / 60.0 : 1.0;
    
    let activeDots = [];
    for (let i = 0; i < dots.length; i++) {
      if (pattern[i] === 1) {
        activeDots.push(i);
      }
    }
    
    let dotsToFill = shouldFillProgressively ? 
      Math.floor(activeDots.length * progressPercent) : 
      activeDots.length;
    
    for (let j = 0; j < dotsToFill && j < activeDots.length; j++) {
      let i = activeDots[j];
      
      let existingDot = physicsDots.find(pd => 
        Math.abs(pd.targetX - dots[i].x) < 1 && 
        Math.abs(pd.targetY - dots[i].y) < 1 && 
        pd.digitIndex === digitIndex &&
        !pd.exploded
      );
      
      if (!existingDot) {
        let blueDot = Matter.Bodies.circle(dots[i].x, dots[i].y, 2, {
          isStatic: true,
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

function drawPhysicsDots() {
  physicsDots = physicsDots.filter(dot => {
    let pos = dot.body.position;
    if (dot.exploded && (pos.x < -50 || pos.x > width + 50 || pos.y < -50 || pos.y > height + 50)) {
      Matter.World.remove(world, dot.body);
      return false;
    }
    return true;
  });
  
  physicsDots.forEach(dot => {
    fill(colors.accent);
    noStroke();
    circle(dot.body.position.x, dot.body.position.y, 4);
  });
}

function drawColons(centerX) {
  fill(colors.gray);
  noStroke();
  circle(centerX, height / 2 - 10, 3);
  circle(centerX, height / 2 + 10, 3);
}