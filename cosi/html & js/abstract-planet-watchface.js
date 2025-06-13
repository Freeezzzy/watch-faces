// Matter.js Module
// const Matter = require('matter-js');
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Body = Matter.Body;

// Globale Variablen
const CANVAS_WIDTH = 396;  // Apple Watch Breite
const CANVAS_HEIGHT = 484; // Apple Watch Höhe
let orbitRadii = [150, 120, 90, 60]; // [m2, m1, h2, h1] - kleinere Radien
const SECONDS_RADIUS = 180; // Outer ring for seconds
let orbits = [];
let orbitSpeed = 0.005;
let minOrbitSpeed = 0.002;
let centerX = CANVAS_WIDTH / 2, centerY = CANVAS_HEIGHT / 2;
let freedPlanets = [];
let freedOrbits = [];
let particles = [];
let physicalParticles = [];
let currentSecond = 0;
let engine;
let render;
let physicalOrbits = [];

function setup() {
    createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    angleMode(RADIANS);
    frameRate(60);
    
    centerX = width / 2;
    centerY = height / 2;

    // Matter.js setup
    engine = Engine.create({
        gravity: { x: 0, y: 0 }
    });
    
    // Create physical orbits
    for (let i = 0; i < 4; i++) {
        orbits.push({ count: 0, angles: [], offset: random(TWO_PI) });
        const orbit = createPhysicalOrbit(orbitRadii[i], i);
        physicalOrbits.push(orbit);
        World.add(engine.world, orbit);
    }

    // Create walls
    const walls = [
        Bodies.rectangle(width/2, 0, width, 20, { isStatic: true }),
        Bodies.rectangle(width/2, height, width, 20, { isStatic: true }),
        Bodies.rectangle(0, height/2, 20, height, { isStatic: true }),
        Bodies.rectangle(width, height/2, 20, height, { isStatic: true })
    ];
    World.add(engine.world, walls);

    updateTime();
    setInterval(updateTime, 1000);
}

function createPhysicalOrbit(radius, index) {
  return Bodies.circle(centerX, centerY, radius, {
    isStatic: true,
    render: {
      fillStyle: 'transparent',
      strokeStyle: '#646464',
      lineWidth: 1
    },
    id: index,
    friction: 0.1,
    restitution: 0.6,
    collisionFilter: {
      category: 0x0002,
      mask: 0x0001
    }
  });
}

function createPhysicalParticle(x, y, vx, vy) {
    return Bodies.circle(x, y, 1, {
        restitution: 0.8,
        friction: 0.1,
        mass: 0.1, // Light particles
        render: {
            fillStyle: '#FFFF64',
            opacity: 0.8
        }
    });
}

function createPhysicalPlanet(x, y, vx, vy) {
    const planet = Bodies.circle(x, y, 4, {
        restitution: 0.8,
        friction: 0.1,
        mass: 1
    });
    Body.setVelocity(planet, { x: vx, y: vy });
    World.add(engine.world, planet);
    return planet;
}

function handleInput() {
    if (keyIsDown(87)) { // W key
        orbitSpeed += 0.0004;
        // Release orbits at high speed
        if (abs(orbitSpeed) > 0.13 && freedOrbits.length === 0) {
            for (let i = 0; i < orbitRadii.length; i++) {
                let angle = random(TWO_PI);
                freedOrbits.push({
                    id: i,
                    x: centerX,
                    y: centerY,
                    r: orbitRadii[i],
                    vx: cos(angle) * 3,
                    vy: sin(angle) * 3
                });
                
                // Create physical planets when breaking free
                let currentPlanet = createPhysicalPlanet(
                    centerX + cos(angle) * orbitRadii[i],
                    centerY + sin(angle) * orbitRadii[i],
                    cos(angle) * 3,
                    sin(angle) * 3
                );
                freedPlanets.push({ body: currentPlanet, life: 255 });
            }
        }
    }
    if (keyIsDown(83)) { // S key
        orbitSpeed -= 0.0004;
    }
}

function applyInertia() {
    if (!keyIsDown(87) && !keyIsDown(83)) {
        if (orbitSpeed > minOrbitSpeed) {
            orbitSpeed -= 0.0003;
        } else if (orbitSpeed < -minOrbitSpeed) {
            orbitSpeed += 0.0003;
        }
    }
}

function updateTime() {
  let h = hour();
  let m = minute();
  let s = second();
  currentSecond = s;

  // Reihenfolge der Digits: m2, m1, h2, h1 (außen nach innen)
  let digits = [
    m % 10,      
    int(m / 10), 
    h % 10,      
    int(h / 10)  
  ];

  for (let i = 0; i < 4; i++) {
    let count = digits[i];
    orbits[i].count = count;

    let angleStep = TWO_PI / max(count, 1);

    if (orbits[i].angles.length < count) {
      for (let j = orbits[i].angles.length; j < count; j++) {
        orbits[i].angles.push(j * angleStep);
      }
    } else if (orbits[i].angles.length > count) {
      orbits[i].angles.splice(count);
    }
  }
}

function drawOrbits() {
  noFill();
  stroke(100);
  strokeWeight(1);
  if (freedOrbits.length === 0) {
    for (let i = 0; i < orbitRadii.length; i++) {
      ellipse(0, 0, orbitRadii[i] * 2); // Zentriert um 0,0 wegen translate
    }
  } else {
    for (let o of freedOrbits) {
      ellipse(o.x - width / 2, o.y - height / 2, o.r * 2);
    }
  }
}

function drawPlanets() {
    noStroke();
    for (let i = 0; i < 4; i++) {
        let orbit = orbits[i];
        let base = freedOrbits.find(o => o.id === i) || { 
            x: 0, 
            y: 0, 
            r: orbitRadii[i] 
        };

        for (let j = 0; j < orbit.count; j++) {
            let angle = orbit.angles[j];
            let x = base.x + cos(angle + orbit.offset) * base.r;
            let y = base.y + sin(angle + orbit.offset) * base.r;

            if (abs(orbitSpeed) > 0.13) {
                let vx = cos(angle + orbit.offset) * orbitSpeed * 30;
                let vy = sin(angle + orbit.offset) * orbitSpeed * 30;
                // Create physical planet instead of visual one
                const physicalPlanet = createPhysicalPlanet(x + centerX, y + centerY, vx, vy);
                freedPlanets.push({ body: physicalPlanet, life: 255 });
                continue;
            }

            if (abs(orbitSpeed) > 0.08) {
                fill(255, 255, 100);
                ellipse(x, y, 8);
                // Create visual particles instead of physical ones
                for (let k = 0; k < 5; k++) {
                    particles.push({
                        x: x,
                        y: y,
                        vx: random(-1, 1),
                        vy: random(-1, 1),
                        alpha: 255
                    });
                }
            } else {
                fill(255);
                ellipse(x, y, 8);
            }

            orbit.angles[j] += orbitSpeed;
        }
    }
}

function updateFreedPlanets() {
    Engine.update(engine);
    
    for (let i = freedPlanets.length - 1; i >= 0; i--) {
        let p = freedPlanets[i];
        const pos = p.body.position;
        
        fill(255, 255, 100, p.life);
        ellipse(pos.x - centerX, pos.y - centerY, 6);
        p.life -= 3;

        if (p.life <= 0) {
            World.remove(engine.world, p.body);
            freedPlanets.splice(i, 1);
        }
    }
}

function updateFreedOrbits() {
    if (abs(orbitSpeed) < 0.05 && freedOrbits.length > 0) {
        physicalOrbits.forEach(orbit => {
            Body.setStatic(orbit, true);
            Body.setPosition(orbit, { 
                x: centerX, 
                y: centerY 
            });
            Body.setVelocity(orbit, { x: 0, y: 0 });
        });
        freedOrbits = []; // Clear freed orbits when resetting
    }
}

// Update updateParticles() to handle visual particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 5;

        fill(255, 255, 100, p.alpha);
        ellipse(p.x, p.y, 2);

        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function drawSeconds() {
    // Move seconds ring outside
    let radius = SECONDS_RADIUS;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < 60; i++) {
        let angle = TWO_PI * (i / 60) - HALF_PI;
        let x = cx + cos(angle) * radius;
        let y = cy + sin(angle) * radius;

        let pulse = 1.5 + sin(frameCount * 0.1 + i) * 1.5;

        if (i === currentSecond) {
            fill(255, 255, 100);
            ellipse(x, y, 5 + pulse);
        } else {
            fill(120);
            ellipse(x, y, 3 + pulse * 0.5);
        }
    }
}

// Neue Funktion für den Watch-Rahmen
function drawWatchFrame() {
  // Äußerer Rahmen
  noFill();
  stroke(80);
  strokeWeight(3);
  rect(0, 0, width, height, 90); // Abgerundete Ecken

  // Digital Crown Andeutung
  fill(80);
  noStroke();
  rect(width - 8, height / 2 - 20, 8, 40, 5, 0, 0, 5);
  
  // Seitentaste
  rect(width - 8, height / 2 + 40, 8, 30, 5, 0, 0, 5);
}

function draw() {
    background(0);
    
    handleInput();
    applyInertia();
    Engine.update(engine);

    push();
    translate(centerX, centerY);
    
    drawOrbits();
    drawPlanets();
    updateFreedPlanets();
    updateParticles();
    drawSeconds();
    
    pop();
    
    drawWatchFrame();
}