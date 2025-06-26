// Constants organization
const WATCH = {
    WIDTH: 396,
    HEIGHT: 484,
    ORBIT_RADII: [150, 120, 90, 60],
    SECONDS_RADIUS: 180,
    ORBIT_SPEED: {
        MIN: 0.002,
        INITIAL: 0.019,
        INCREMENT: 0.001,
        MAX: 0.25,
        YELLOW_THRESHOLD: 0.15,    
        BREAKAWAY_THRESHOLD: 0.22  
    },
    // Neue Murmel-Konstanten
    MARBLE_SIZE: 12,        
    TRACK_WIDTH: 20,        
    TRACK_BORDER: 2         
};

// Matter.js Module aliases
const { Engine, Render, World, Bodies, Body, Constraint } = Matter;

// State variables
let engine;
let orbits = [];
let orbitSpeed = WATCH.ORBIT_SPEED.INITIAL;
let centerX, centerY;
let freedPlanets = [];
let particles = [];
let planetBodies = []; 
let constraints = []; 
let centerBody; 
let currentSecond = 0;
let currentStage = 1; 

// Time override variables
let useCustomTime = false;
let customHour = 12;
let customMinute = 0;
let customSecond = 0;

// UI Elements
let hourInput, minuteInput, secondInput;
let setTimeButton, resetTimeButton;

function setup() {
    try {
        const canvas = createCanvas(WATCH.WIDTH, WATCH.HEIGHT);
        if (!canvas) throw new Error('Failed to create canvas');
        
        angleMode(RADIANS);
        frameRate(60);
        
        centerX = width / 2;
        centerY = height / 2;

        createTimeControls();
        initializePhysics();
        updateTime();
        setInterval(updateTime, 1000);
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

function createTimeControls() {
    // Container für die Controls
    const controlsDiv = createDiv('');
    controlsDiv.style('position', 'fixed');
    controlsDiv.style('top', '10px');
    controlsDiv.style('right', '10px');
    controlsDiv.style('background', 'rgba(0, 0, 0, 0.8)');
    controlsDiv.style('padding', '15px');
    controlsDiv.style('border-radius', '10px');
    controlsDiv.style('color', 'white');
    controlsDiv.style('font-family', 'Arial, sans-serif');
    controlsDiv.style('z-index', '1000');

    // Titel
    const title = createP('Manual Time Control');
    title.style('margin', '0 0 10px 0');
    title.style('font-weight', 'bold');
    title.style('color', '#ffffff');
    title.parent(controlsDiv);

    // Stunden Input
    const hourLabel = createP('Hour (0-23):');
    hourLabel.style('margin', '5px 0 2px 0');
    hourLabel.style('font-size', '12px');
    hourLabel.parent(controlsDiv);
    
    hourInput = createInput('12', 'number');
    hourInput.attribute('min', '0');
    hourInput.attribute('max', '23');
    hourInput.style('width', '60px');
    hourInput.style('margin-bottom', '5px');
    hourInput.parent(controlsDiv);

    // Minuten Input
    const minuteLabel = createP('Minute (0-59):');
    minuteLabel.style('margin', '5px 0 2px 0');
    minuteLabel.style('font-size', '12px');
    minuteLabel.parent(controlsDiv);
    
    minuteInput = createInput('0', 'number');
    minuteInput.attribute('min', '0');
    minuteInput.attribute('max', '59');
    minuteInput.style('width', '60px');
    minuteInput.style('margin-bottom', '5px');
    minuteInput.parent(controlsDiv);

    // Sekunden Input
    const secondLabel = createP('Second (0-59):');
    secondLabel.style('margin', '5px 0 2px 0');
    secondLabel.style('font-size', '12px');
    secondLabel.parent(controlsDiv);
    
    secondInput = createInput('0', 'number');
    secondInput.attribute('min', '0');
    secondInput.attribute('max', '59');
    secondInput.style('width', '60px');
    secondInput.style('margin-bottom', '10px');
    secondInput.parent(controlsDiv);

    // Set Time Button
    setTimeButton = createButton('Set Custom Time');
    setTimeButton.style('background', '#4CAF50');
    setTimeButton.style('color', 'white');
    setTimeButton.style('border', 'none');
    setTimeButton.style('padding', '8px 12px');
    setTimeButton.style('border-radius', '5px');
    setTimeButton.style('cursor', 'pointer');
    setTimeButton.style('margin-right', '5px');
    setTimeButton.style('margin-bottom', '5px');
    setTimeButton.mousePressed(setCustomTime);
    setTimeButton.parent(controlsDiv);

    // Reset Button
    resetTimeButton = createButton('Reset to Real Time');
    resetTimeButton.style('background', '#f44336');
    resetTimeButton.style('color', 'white');
    resetTimeButton.style('border', 'none');
    resetTimeButton.style('padding', '8px 12px');
    resetTimeButton.style('border-radius', '5px');
    resetTimeButton.style('cursor', 'pointer');
    resetTimeButton.mousePressed(resetToRealTime);
    resetTimeButton.parent(controlsDiv);

    // Status Display
    const statusP = createP('Status: Real Time');
    statusP.id('timeStatus');
    statusP.style('margin', '10px 0 0 0');
    statusP.style('font-size', '12px');
    statusP.style('color', '#cccccc');
    statusP.parent(controlsDiv);
}

function setCustomTime() {
    const h = parseInt(hourInput.value());
    const m = parseInt(minuteInput.value());
    const s = parseInt(secondInput.value());

    // Validate inputs
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
        customHour = h;
        customMinute = m;
        customSecond = s;
        useCustomTime = true;
        
        // Update display immediately
        updateTime();
        
        // Update status
        select('#timeStatus').html(`Status: Custom Time (${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')})`);
        
        console.log(`Custom time set to: ${h}:${m}:${s}`);
    } else {
        alert('Please enter valid time values:\nHour: 0-23\nMinute: 0-59\nSecond: 0-59');
    }
}

function resetToRealTime() {
    useCustomTime = false;
    updateTime();
    
    // Update status
    select('#timeStatus').html('Status: Real Time');
    
    console.log('Reset to real time');
}

function getCurrentTime() {
    if (useCustomTime) {
        return {
            h: customHour,
            m: customMinute,
            s: customSecond
        };
    } else {
        return {
            h: hour(),
            m: minute(),
            s: second()
        };
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
    
    // Create center anchor point
    centerBody = Bodies.circle(centerX, centerY, 1, { 
        isStatic: true,
        render: { visible: false }
    });
    World.add(engine.world, centerBody);

    // Initialize orbit arrays
    for (let i = 0; i < 4; i++) {
        orbits.push({ 
            count: 0, 
            angles: [], 
            offset: random(TWO_PI) 
        });
        planetBodies.push([]);
        constraints.push([]);
    }

    // Create boundary walls
    const walls = createBoundaryWalls();
    World.add(engine.world, walls);
}

function createBoundaryWalls() {
    const wallThickness = 20; // Increased from 10 for stronger containment
    const cornerRadius = 90;
    
    // Create stronger walls that contain planets better
    return [
        // Top wall
        Bodies.rectangle(width/2, wallThickness/2, width - cornerRadius, wallThickness, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8 // Bouncy walls
        }),
        
        // Bottom wall  
        Bodies.rectangle(width/2, height - wallThickness/2, width - cornerRadius, wallThickness, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        // Left wall
        Bodies.rectangle(wallThickness/2, height/2, wallThickness, height - cornerRadius, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        // Right wall (accounting for Digital Crown space)
        Bodies.rectangle(width - wallThickness/2 - 8, height/2, wallThickness, height - cornerRadius, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        // Corner pieces for rounded corners - made larger
        Bodies.circle(cornerRadius/2, cornerRadius/2, cornerRadius/3, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        Bodies.circle(width - cornerRadius/2, cornerRadius/2, cornerRadius/3, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        Bodies.circle(cornerRadius/2, height - cornerRadius/2, cornerRadius/3, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        Bodies.circle(width - cornerRadius/2, height - cornerRadius/2, cornerRadius/3, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        })
    ];
}

function createPlanetAtOrbit(orbitIndex, angle) {
    const radius = WATCH.ORBIT_RADII[orbitIndex];
    const x = centerX + cos(angle) * radius;
    const y = centerY + sin(angle) * radius;
    
    // Größere Murmeln mit mehr Masse
    const planet = Bodies.circle(x, y, WATCH.MARBLE_SIZE / 2, {
        restitution: 0.9,   // Etwas weniger Bounce für realistischeres Verhalten
        friction: 0.05,     // Etwas mehr Reibung für Rolleffekt
        frictionAir: 0.01,  
        mass: 2,            // Mehr Masse für Murmeln
        render: { fillStyle: '#ffffff' }
    });
    
    // Create constraint to keep planet at exact distance from center
    const constraint = Constraint.create({
        bodyA: centerBody,
        bodyB: planet,
        length: radius,
        stiffness: 1.0,
        damping: 0.02  
    });
    
    World.add(engine.world, [planet, constraint]);
    
    return { planet, constraint };
}

function handleInput() {
    if (keyIsDown(87)) { // W key
        orbitSpeed += WATCH.ORBIT_SPEED.INCREMENT;
        // Cap the maximum speed
        if (orbitSpeed > WATCH.ORBIT_SPEED.MAX) {
            orbitSpeed = WATCH.ORBIT_SPEED.MAX;
        }
    }
    if (keyIsDown(83)) { // S key
        orbitSpeed -= WATCH.ORBIT_SPEED.INCREMENT;
        // Cap the maximum negative speed
        if (orbitSpeed < -WATCH.ORBIT_SPEED.MAX) {
            orbitSpeed = -WATCH.ORBIT_SPEED.MAX;
        }
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
    const time = getCurrentTime();
    let h = time.h;
    let m = time.m;
    let s = time.s;
    
    currentSecond = s;

    // 24-Stunden-Format beibehalten - keine Konvertierung
    // Reihenfolge der Digits: m2, m1, h2, h1 (außen nach innen)
    let digits = [
        m % 10,      
        int(m / 10), 
        h % 10,      
        int(h / 10)  
    ];

    for (let i = 0; i < 4; i++) {
        let count = digits[i];
        let prevCount = orbits[i].count;
        orbits[i].count = count;

        // Add new planets if count increased
        if (count > prevCount) {
            for (let j = prevCount; j < count; j++) {
                let angle = (TWO_PI / max(count, 1)) * j + orbits[i].offset;
                let planetData = createPlanetAtOrbit(i, angle);
                planetBodies[i].push(planetData.planet);
                constraints[i].push(planetData.constraint);
            }
        }
        // Remove planets if count decreased
        else if (count < prevCount) {
            for (let j = prevCount - 1; j >= count; j--) {
                if (planetBodies[i][j]) {
                    // Break constraint and let planet fly free
                    World.remove(engine.world, constraints[i][j]);
                    freedPlanets.push({
                        body: planetBodies[i][j],
                        life: 255
                    });
                    planetBodies[i].splice(j, 1);
                    constraints[i].splice(j, 1);
                }
            }
        }
    }

    // Update custom time if using it (simulate time passing)
    if (useCustomTime) {
        customSecond++;
        if (customSecond >= 60) {
            customSecond = 0;
            customMinute++;
            if (customMinute >= 60) {
                customMinute = 0;
                customHour++;
                if (customHour >= 24) {
                    customHour = 0;
                }
            }
        }
        
        // Update status display
        select('#timeStatus').html(`Status: Custom Time (${String(customHour).padStart(2, '0')}:${String(customMinute).padStart(2, '0')}:${String(customSecond).padStart(2, '0')})`);
    }
}

function updatePlanetPositions() {
    // Determine current stage
    if (abs(orbitSpeed) > WATCH.ORBIT_SPEED.BREAKAWAY_THRESHOLD) {
        if (currentStage !== 3) {
            // Transition to stage 3: Break all constraints
            breakAllConstraints();
            currentStage = 3;
        }
        // In stage 3, apply forces to free-floating planets
        applyBreakawayForces();
    } else if (abs(orbitSpeed) > WATCH.ORBIT_SPEED.YELLOW_THRESHOLD) {
        if (currentStage === 3) {
            // Transition from stage 3 back to stage 2: Recreate constraints
            recreateConstraints();
            currentStage = 2;
        } else {
            currentStage = 2;
        }
        // Normal stage 2 behavior
        applyConstrainedForces();
    } else {
        if (currentStage === 3) {
            // Transition from stage 3 back to stage 1: Recreate constraints
            recreateConstraints();
            currentStage = 1;
        } else {
            currentStage = 1;
        }
        // Normal stage 1 behavior
        applyConstrainedForces();
    }
}

function breakAllConstraints() {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < constraints[i].length; j++) {
            if (constraints[i][j]) {
                World.remove(engine.world, constraints[i][j]);
                constraints[i][j] = null; // Mark as broken
            }
        }
    }
}

function recreateConstraints() {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < planetBodies[i].length; j++) {
            if (planetBodies[i][j] && !constraints[i][j]) {
                // Recreate constraint
                const radius = WATCH.ORBIT_RADII[i];
                const constraint = Constraint.create({
                    bodyA: centerBody,
                    bodyB: planetBodies[i][j],
                    length: radius,
                    stiffness: 1.0,
                    damping: 0.02
                });
                World.add(engine.world, constraint);
                constraints[i][j] = constraint;
            }
        }
    }
}

function applyConstrainedForces() {
    for (let i = 0; i < 4; i++) {
        let orbit = orbits[i];
        
        for (let j = 0; j < orbit.count; j++) {
            if (planetBodies[i][j] && constraints[i][j]) {
                let currentPos = planetBodies[i][j].position;
                
                // Calculate the tangential direction (perpendicular to radius)
                let radiusX = currentPos.x - centerX;
                let radiusY = currentPos.y - centerY;
                let radiusLength = sqrt(radiusX * radiusX + radiusY * radiusY);
                
                // Tangent vector (90 degrees to radius)
                let tangentX = -radiusY / radiusLength;
                let tangentY = radiusX / radiusLength;
                
                // In yellow stage, add slight random variation to create collisions
                let baseForce = orbitSpeed * 0.003;
                let randomVariation = 1.0;
                
                if (currentStage === 2) {
                    // Each planet gets a slightly different speed variation
                    randomVariation = 0.7 + (j * 0.15) + sin(frameCount * 0.08 + j) * 0.3;
                    
                    // Add post-collision separation forces
                    applyPostCollisionSeparation(i, j, currentPos);
                } else {
                    // When in normal stage, add spacing forces to prevent clustering
                    applySpacingForces(i, j, currentPos);
                }
                
                let forceMultiplier = baseForce * randomVariation;
                
                Body.applyForce(planetBodies[i][j], currentPos, {
                    x: tangentX * forceMultiplier,
                    y: tangentY * forceMultiplier
                });
            }
        }
    }
}

function applyPostCollisionSeparation(orbitIndex, planetIndex, currentPos) {
    const collisionDistance = WATCH.MARBLE_SIZE * 2; // Kollisionsdistanz basierend auf Murmelgröße
    const separationForce = 0.002;
    const currentVel = planetBodies[orbitIndex][planetIndex].velocity;
    const currentSpeed = sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
    
    // Check distance to other planets on the same orbit
    for (let k = 0; k < planetBodies[orbitIndex].length; k++) {
        if (k !== planetIndex && planetBodies[orbitIndex][k]) {
            let otherPos = planetBodies[orbitIndex][k].position;
            let otherVel = planetBodies[orbitIndex][k].velocity;
            let dx = currentPos.x - otherPos.x;
            let dy = currentPos.y - otherPos.y;
            let distance = sqrt(dx * dx + dy * dy);
            
            if (distance < collisionDistance && distance > 0) {
                // Check if planets are moving toward each other (indicates recent collision)
                let relativeVelX = currentVel.x - otherVel.x;
                let relativeVelY = currentVel.y - otherVel.y;
                let approachingSpeed = (relativeVelX * dx + relativeVelY * dy) / distance;
                
                // If they're moving apart slowly or toward each other, apply separation
                if (approachingSpeed > -2) { // Adjust this threshold
                    let separationStrength = separationForce * (collisionDistance - distance) / collisionDistance;
                    let forceX = (dx / distance) * separationStrength;
                    let forceY = (dy / distance) * separationStrength;
                    
                    // Apply stronger separation force
                    Body.applyForce(planetBodies[orbitIndex][planetIndex], currentPos, {
                        x: forceX * 2, // Extra strong separation
                        y: forceY * 2
                    });
                    
                    // Also apply a small tangential "spin" force to help them separate
                    let tangentForceX = -forceY * 0.5;
                    let tangentForceY = forceX * 0.5;
                    
                    Body.applyForce(planetBodies[orbitIndex][planetIndex], currentPos, {
                        x: tangentForceX,
                        y: tangentForceY
                    });
                }
            }
        }
    }
}

function applyBreakawayForces() {
    // Apply forces to all planets based on orbitSpeed
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < planetBodies[i].length; j++) {
            if (planetBodies[i][j]) {
                let currentPos = planetBodies[i][j].position;
                let currentVel = planetBodies[i][j].velocity;
                
                // Check if planet is getting too close to edges and apply containment force
                let containmentForce = calculateContainmentForce(currentPos);
                
                // Apply acceleration force in current direction of movement
                let speed = sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
                let accelerationForce = { x: 0, y: 0 };
                
                if (speed > 0.1) {
                    // Accelerate in current direction but reduce force near walls
                    let forceMultiplier = orbitSpeed * 0.003; // Reduced force
                    accelerationForce.x = (currentVel.x / speed) * forceMultiplier;
                    accelerationForce.y = (currentVel.y / speed) * forceMultiplier;
                } else {
                    // If not moving, apply random force toward center
                    let angle = atan2(centerY - currentPos.y, centerX - currentPos.x) + random(-PI/4, PI/4);
                    accelerationForce.x = cos(angle) * orbitSpeed * 0.002;
                    accelerationForce.y = sin(angle) * orbitSpeed * 0.002;
                }
                
                // Combine forces with containment having priority
                Body.applyForce(planetBodies[i][j], currentPos, {
                    x: accelerationForce.x + containmentForce.x,
                    y: accelerationForce.y + containmentForce.y
                });
            }
        }
    }
}

function calculateContainmentForce(pos) {
    const margin = 50; // Distance from edge where containment force starts
    const maxForce = 0.002; // Maximum containment force
    let forceX = 0, forceY = 0;
    
    // Left edge
    if (pos.x < margin) {
        forceX += (margin - pos.x) / margin * maxForce;
    }
    // Right edge
    if (pos.x > width - margin) {
        forceX -= (pos.x - (width - margin)) / margin * maxForce;
    }
    // Top edge
    if (pos.y < margin) {
        forceY += (margin - pos.y) / margin * maxForce;
    }
    // Bottom edge
    if (pos.y > height - margin) {
        forceY -= (pos.y - (height - margin)) / margin * maxForce;
    }
    
    return { x: forceX, y: forceY };
}

function applySpacingForces(orbitIndex, planetIndex, currentPos) {
    const minDistance = WATCH.MARBLE_SIZE * 3; // Abstand basierend auf Murmelgröße
    const spacingForce = 0.001;
    
    // Check distance to other planets on the same orbit
    for (let k = 0; k < planetBodies[orbitIndex].length; k++) {
        if (k !== planetIndex && planetBodies[orbitIndex][k]) {
            let otherPos = planetBodies[orbitIndex][k].position;
            let dx = currentPos.x - otherPos.x;
            let dy = currentPos.y - otherPos.y;
            let distance = sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance && distance > 0) {
                let forceStrength = spacingForce * (minDistance - distance) / minDistance;
                let forceX = (dx / distance) * forceStrength;
                let forceY = (dy / distance) * forceStrength;
                
                Body.applyForce(planetBodies[orbitIndex][planetIndex], currentPos, {
                    x: forceX,
                    y: forceY
                });
            }
        }
    }
}

function drawOrbits() {
    // Zeichne die Bahnen als ausgefüllte Rinnen mit Grautönen
    for (let i = 0; i < WATCH.ORBIT_RADII.length; i++) {
        let radius = WATCH.ORBIT_RADII[i];
        let outerRadius = radius + WATCH.TRACK_WIDTH/2;
        let innerRadius = radius - WATCH.TRACK_WIDTH/2;
        
        // Bahnfläche (dunkler Grauton für die Rinne)
        fill(60, 60, 60);
        noStroke();
        ellipse(0, 0, outerRadius * 2);
        
        // Inneren Bereich wieder ausschneiden (schwarzer Hintergrund)
        fill(0);
        ellipse(0, 0, innerRadius * 2);
        
        // Äußerer Rand der Bahn (heller für 3D-Effekt)
        noFill();
        stroke(120);
        strokeWeight(2);
        ellipse(0, 0, outerRadius * 2);
        
        // Innerer Rand der Bahn (dunkler für Tiefe)
        stroke(40);
        strokeWeight(2);
        ellipse(0, 0, innerRadius * 2);
        
        // Mittellinie für bessere Orientierung (optional)
        stroke(80);
        strokeWeight(1);
        ellipse(0, 0, radius * 2);
    }
}

function drawPlanets() {
    noStroke();
    
    // Draw planets with stage-appropriate colors
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < planetBodies[i].length; j++) {
            if (planetBodies[i][j]) {
                let pos = planetBodies[i][j].position;
                let x = pos.x - centerX;
                let y = pos.y - centerY;
                
                // Murmel-Effekt mit Glanz
                push();
                translate(x, y);
                
                // Schatten der Murmel
                fill(0, 0, 0, 50);
                ellipse(2, 2, WATCH.MARBLE_SIZE);
                
                // Hauptkörper der Murmel
                if (currentStage === 3) {
                    fill(255, 255, 100); // Gelb wenn losgelöst
                } else if (currentStage === 2) {
                    fill(255, 255, 100); // Gelb wenn schnell
                } else {
                    fill(255); // Weiß bei normaler Geschwindigkeit
                }
                ellipse(0, 0, WATCH.MARBLE_SIZE);
                
                // Glanzeffekt auf der Murmel
                fill(255, 255, 255, 150);
                ellipse(-WATCH.MARBLE_SIZE/4, -WATCH.MARBLE_SIZE/4, WATCH.MARBLE_SIZE/3);
                
                // Kleiner Glanzpunkt
                fill(255, 255, 255, 200);
                ellipse(-WATCH.MARBLE_SIZE/3, -WATCH.MARBLE_SIZE/3, WATCH.MARBLE_SIZE/6);
                
                pop();
                
                // Funken für schnelle Bewegung
                if (currentStage === 3) {
                    if (random() < 0.35) {
                        for (let k = 0; k < 4; k++) {
                            particles.push({
                                x: x + random(-8, 8),
                                y: y + random(-8, 8),
                                vx: random(-5, 5),
                                vy: random(-5, 5),
                                alpha: 255,
                                life: 20 + random(30),
                                color: [255, 255, 100]
                            });
                        }
                    }
                } else if (currentStage === 2) {
                    if (random() < 0.25) {
                        for (let k = 0; k < 3; k++) {
                            particles.push({
                                x: x + random(-6, 6),
                                y: y + random(-6, 6),
                                vx: random(-4, 4),
                                vy: random(-4, 4),
                                alpha: 255,
                                life: 25 + random(25),
                                color: [255, 255, 100]
                            });
                        }
                    }
                }
            }
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

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life--;
        p.alpha = map(p.life, 0, 50, 0, 255);

        // Use particle color if available, otherwise default to yellow
        let color = p.color || [255, 255, 150];
        fill(color[0], color[1], color[2], p.alpha);
        noStroke();
        ellipse(p.x, p.y, 3);

        // Glow effect
        fill(color[0], color[1], color[2], p.alpha * 0.3);
        ellipse(p.x, p.y, 6);

        if (p.life <= 0 || p.alpha <= 0) {
            particles.splice(i, 1);
        }
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

function cleanup() {
    if (engine) {
        World.clear(engine.world);
        Engine.clear(engine);
    }
    particles = [];
    freedPlanets = [];
    planetBodies = [];
    constraints = [];
}

function draw() {
    try {
        background(0);
        
        // Update Matter.js physics
        Engine.update(engine);
        
        handleInput();
        applyInertia();
        updatePlanetPositions();

        push();
        translate(centerX, centerY);
        
        drawOrbits();
        drawPlanets();
        updateFreedPlanets(); // Keep this for any existing freed planets
        updateParticles(); // Keep this but it won't create new particles
        drawSeconds();
        
        pop();
        
        drawWatchFrame();
    } catch (error) {
        console.error('Draw cycle error:', error);
    }
}

// Add window event listener for cleanup
window.addEventListener('beforeunload', cleanup);