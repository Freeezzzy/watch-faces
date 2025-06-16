// Constants organization
const WATCH = {
    WIDTH: 396,
    HEIGHT: 484,
    ORBIT_RADII: [150, 120, 90, 60],
    SECONDS_RADIUS: 180,
    ORBIT_SPEED: {
        MIN: 0.002,
        INITIAL: 0.005,
        INCREMENT: 0.0004,
        BREAKAWAY: 0.13
    }
};

// Matter.js Module aliases
const { Engine, Render, World, Bodies, Body } = Matter;

// State variables
let engine;
let orbits = [];
let orbitSpeed = WATCH.ORBIT_SPEED.INITIAL;
let centerX, centerY;
let freedPlanets = [];
let freedOrbits = [];
let particles = [];
let physicalOrbits = [];
let currentSecond = 0;

function setup() {
    try {
        const canvas = createCanvas(WATCH.WIDTH, WATCH.HEIGHT);
        if (!canvas) throw new Error('Failed to create canvas');
        
        angleMode(RADIANS);
        frameRate(60);
        
        centerX = width / 2;
        centerY = height / 2;

        initializePhysics();
        updateTime();
        setInterval(updateTime, 1000);
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

function initializePhysics() {
    // Clean up existing engine if it exists
    if (engine) {
        World.clear(engine.world);
        Engine.clear(engine);
    }

    engine = Engine.create({
        gravity: { x: 0, y: 0 }
    });
    
    // Create physical orbits
    for (let i = 0; i < 4; i++) {
        orbits.push({ 
            count: 0, 
            angles: [], 
            offset: random(TWO_PI) 
        });
        const orbit = createPhysicalOrbit(WATCH.ORBIT_RADII[i], i);
        physicalOrbits.push(orbit);
        World.add(engine.world, orbit);
    }

    // Create boundary walls
    const walls = createBoundaryWalls();
    World.add(engine.world, walls);
}

function createBoundaryWalls() {
    return [
        Bodies.rectangle(width/2, 0, width, 20, { isStatic: true }),
        Bodies.rectangle(width/2, height, width, 20, { isStatic: true }),
        Bodies.rectangle(0, height/2, 20, height, { isStatic: true }),
        Bodies.rectangle(width, height/2, 20, height, { isStatic: true })
    ];
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
    // Adjust coordinates to account for translation
    const planet = Bodies.circle(x, y, 4, {
        restitution: 0.8,
        friction: 0.1,
        mass: 1,
        collisionFilter: {
            category: 0x0001,
            mask: 0x0002
        }
    });
    Body.setVelocity(planet, { x: vx, y: vy });
    World.add(engine.world, planet);
    return planet;
}

function handleInput() {
    if (keyIsDown(87)) { // W key
        orbitSpeed += WATCH.ORBIT_SPEED.INCREMENT;
    }
    if (keyIsDown(83)) { // S key
        orbitSpeed -= WATCH.ORBIT_SPEED.INCREMENT;
    }
}

function applyInertia() {
    if (!keyIsDown(87) && !keyIsDown(83)) {
        if (orbitSpeed > WATCH.ORBIT_SPEED.MIN) {
            orbitSpeed -= 0.0003;
        } else if (orbitSpeed < -WATCH.ORBIT_SPEED.MIN) {
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
    // Only draw the orbit circles
    for (let i = 0; i < WATCH.ORBIT_RADII.length; i++) {
        ellipse(0, 0, WATCH.ORBIT_RADII[i] * 2);
    }
}

function drawPlanets() {
    noStroke();
    for (let i = 0; i < 4; i++) {
        let orbit = orbits[i];
        
        for (let j = 0; j < orbit.count; j++) {
            let angle = orbit.angles[j];
            let x = cos(angle + orbit.offset) * WATCH.ORBIT_RADII[i];
            let y = sin(angle + orbit.offset) * WATCH.ORBIT_RADII[i];

            if (abs(orbitSpeed) > 0.08) {
                fill(255, 255, 100);
                ellipse(x, y, 8);
                // Create visual particles
                for (let k = 0; k < 3; k++) {
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
    for (let i = freedPlanets.length - 1; i >= 0; i--) {
        let p = freedPlanets[i];
        const pos = p.body.position;
        
        // Remove planets that go too far off screen
        if (pos.x < -width || pos.x > width * 2 || 
            pos.y < -height || pos.y > height * 2) {
            World.remove(engine.world, p.body);
            freedPlanets.splice(i, 1);
            continue;
        }
        
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
        // Clear all existing physical planets
        freedPlanets.forEach(planet => {
            World.remove(engine.world, planet.body);
        });
        freedPlanets = [];
        
        // Reset orbits
        physicalOrbits.forEach(orbit => {
            Body.setStatic(orbit, true);
            Body.setPosition(orbit, { 
                x: centerX, 
                y: centerY 
            });
            Body.setVelocity(orbit, { x: 0, y: 0 });
        });
        
        freedOrbits = [];
        orbitSpeed = WATCH.ORBIT_SPEED.INITIAL;
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
    let radius = WATCH.SECONDS_RADIUS;
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

// Add cleanup function
function cleanup() {
    if (engine) {
        World.clear(engine.world);
        Engine.clear(engine);
    }
    particles = [];
    freedPlanets = [];
    freedOrbits = [];
}

// Modified draw function with error handling
function draw() {
    try {
        background(0);
        
        handleInput();
        applyInertia();

        push();
        translate(centerX, centerY);
        
        drawOrbits();
        drawPlanets();
        updateParticles();
        drawSeconds();
        
        pop();
        
        drawWatchFrame(); // This should be last
    } catch (error) {
        console.error('Draw cycle error:', error);
    }
}

// Add window event listener for cleanup
window.addEventListener('beforeunload', cleanup);