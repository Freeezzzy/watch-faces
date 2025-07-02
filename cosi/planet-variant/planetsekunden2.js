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
        BLUE_THRESHOLD: 0.15,
        BREAKAWAY_THRESHOLD: 0.22
    }
};

// Neue Hintergrund-Konstanten für Sterne
const BACKGROUND = {
    STAR_COUNT: 80,
    TWINKLE_SPEED: 0.03,
    STAR_MIN_SIZE: 1,
    STAR_MAX_SIZE: 3,
    SHOOTING_STAR_CHANCE: 0.003,
    SHOOTING_STAR_DURATION: 60
};

// Definiere die exakte 4-Farben-Palette
const COLORS = {
    BLACK: 0,
    WHITE: 255,
    GRAY: 100,  // Der EINE Grauton
    BLUE: [100, 150, 255]  // Das EINE Blau (schönes helles Blau)
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
let planetBodies = []; // Array of arrays - planetBodies[orbitIndex][planetIndex]
let constraints = []; // Array of arrays - constraints[orbitIndex][planetIndex]
let centerBody; // Static body at center for constraints
let currentSecond = 0;
let currentStage = 1; // 1 = white, 2 = blue, 3 = breakaway

// Seconds planet tracking
let secondsPlanet = null;
let secondsConstraint = null;
let prevSecond = -1;

// Sterne-Array
let stars = [];
let shootingStars = [];

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

        initializeStars();
        createTimeControls();
        initializePhysics();
        updateTime();
        setInterval(updateTime, 1000);
    } catch (error) {
        console.error('Setup failed:', error);
    }
}

function initializeStars() {
    stars = [];
    for (let i = 0; i < BACKGROUND.STAR_COUNT; i++) {
        stars.push({
            x: random(0, width),
            y: random(0, height),
            size: random(BACKGROUND.STAR_MIN_SIZE, BACKGROUND.STAR_MAX_SIZE),
            baseBrightness: random(0.4, 0.9),
            twinkleOffset: random(0, TWO_PI),
            twinkleSpeed: random(0.01, 0.03),
            twinkleIntensity: random(0.2, 0.4)
        });
    }
    shootingStars = [];
}

function drawBackground() {
    drawTwinklingStars();
    drawShootingStars();
    drawCenterRings();
}

function drawTwinklingStars() {
    noStroke();
    
    for (let i = 0; i < stars.length; i++) {
        let star = stars[i];
        
        let twinkle1 = sin(frameCount * star.twinkleSpeed + star.twinkleOffset);
        let twinkle2 = cos(frameCount * star.twinkleSpeed * 0.7 + star.twinkleOffset * 1.3);
        let combinedTwinkle = (twinkle1 + twinkle2 * 0.5) / 1.5;
        
        let currentBrightness = star.baseBrightness + combinedTwinkle * star.twinkleIntensity;
        currentBrightness = constrain(currentBrightness, 0.2, 1.0);
        
        let alpha = map(currentBrightness, 0.2, 1.0, 80, 255);
        fill(COLORS.GRAY, alpha);
        
        let currentSize = star.size * (0.8 + currentBrightness * 0.2);
        
        ellipse(star.x, star.y, currentSize);
        
        if (currentBrightness > 0.75) {
            fill(COLORS.GRAY, alpha * 0.4);
            ellipse(star.x, star.y, currentSize * 1.8);
        }
    }
}

function createShootingStar() {
    let startX, startY, vx, vy;
    
    let edge = int(random(4));
    switch(edge) {
        case 0:
            startX = random(width);
            startY = -10;
            vx = random(-3, 3);
            vy = random(2, 6);
            break;
        case 1:
            startX = width + 10;
            startY = random(height);
            vx = random(-6, -2);
            vy = random(-3, 3);
            break;
        case 2:
            startX = random(width);
            startY = height + 10;
            vx = random(-3, 3);
            vy = random(-6, -2);
            break;
        case 3:
            startX = -10;
            startY = random(height);
            vx = random(2, 6);
            vy = random(-3, 3);
            break;
    }
    
    shootingStars.push({
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        life: BACKGROUND.SHOOTING_STAR_DURATION
    });
}

function drawShootingStars() {
    if (currentStage === 1 && random() < BACKGROUND.SHOOTING_STAR_CHANCE) {
        createShootingStar();
    }
    
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        let meteor = shootingStars[i];
        
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        meteor.life--;
        
        let alpha = map(meteor.life, 0, BACKGROUND.SHOOTING_STAR_DURATION, 0, 200);
        alpha = constrain(alpha, 0, 200);
        
        stroke(180, alpha);
        strokeWeight(2);
        
        line(meteor.x, meteor.y, 
             meteor.x - meteor.vx * 8, meteor.y - meteor.vy * 8);
        
        for (let j = 1; j <= 3; j++) {
            let trailAlpha = alpha * (1 - j * 0.3);
            stroke(180, trailAlpha);
            strokeWeight(2 - j * 0.5);
            line(meteor.x - meteor.vx * j * 3, meteor.y - meteor.vy * j * 3,
                 meteor.x - meteor.vx * (j + 3) * 3, meteor.y - meteor.vy * (j + 3) * 3);
        }
        
        fill(200, alpha);
        noStroke();
        ellipse(meteor.x, meteor.y, 3);
        
        if (meteor.life <= 0 || meteor.x < -50 || meteor.x > width + 50 || 
            meteor.y < -50 || meteor.y > height + 50) {
            shootingStars.splice(i, 1);
        }
    }
}

function drawCenterRings() {
    push();
    translate(centerX, centerY);
    noFill();
    
    for (let i = 1; i <= 3; i++) {
        let radius = i * 70;
        let alpha = map(i, 1, 3, 30, 10);
        
        stroke(COLORS.GRAY, alpha);
        strokeWeight(0.5);
        ellipse(0, 0, radius * 2);
    }
    pop();
}

function createTimeControls() {
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

    const title = createP('Manual Time Control');
    title.style('margin', '0 0 10px 0');
    title.style('font-weight', 'bold');
    title.style('color', '#ffffff');
    title.parent(controlsDiv);

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

    resetTimeButton = createButton('Reset to Real Time');
    resetTimeButton.style('background', '#f44336');
    resetTimeButton.style('color', 'white');
    resetTimeButton.style('border', 'none');
    resetTimeButton.style('padding', '8px 12px');
    resetTimeButton.style('border-radius', '5px');
    resetTimeButton.style('cursor', 'pointer');
    resetTimeButton.mousePressed(resetToRealTime);
    resetTimeButton.parent(controlsDiv);

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

    if (h >= 0 && h <= 23 && m >= 0 && m <= 59 && s >= 0 && s <= 59) {
        customHour = h;
        customMinute = m;
        customSecond = s;
        useCustomTime = true;
        
        updateTime();
        
        select('#timeStatus').html(`Status: Custom Time (${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')})`);
        
        console.log(`Custom time set to: ${h}:${m}:${s}`);
    } else {
        alert('Please enter valid time values:\nHour: 0-23\nMinute: 0-59\nSecond: 0-59');
    }
}

function resetToRealTime() {
    useCustomTime = false;
    updateTime();
    
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
    if (engine) {
        World.clear(engine.world);
        Engine.clear(engine);
    }

    engine = Engine.create({
        gravity: { x: 0, y: 0 }
    });
    
    centerBody = Bodies.circle(centerX, centerY, 1, { 
        isStatic: true,
        render: { visible: false }
    });
    World.add(engine.world, centerBody);

    for (let i = 0; i < 4; i++) {
        orbits.push({ 
            count: 0, 
            angles: [], 
            offset: random(TWO_PI) 
        });
        planetBodies.push([]);
        constraints.push([]);
    }

    const walls = createBoundaryWalls();
    World.add(engine.world, walls);
    
    createSecondsPlanet(getCurrentTime().s);
}

function createBoundaryWalls() {
    const wallThickness = 20;
    const cornerRadius = 90;
    
    return [
        Bodies.rectangle(width/2, wallThickness/2, width - cornerRadius, wallThickness, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        Bodies.rectangle(width/2, height - wallThickness/2, width - cornerRadius, wallThickness, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        Bodies.rectangle(wallThickness/2, height/2, wallThickness, height - cornerRadius, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
        Bodies.rectangle(width - wallThickness/2 - 8, height/2, wallThickness, height - cornerRadius, { 
            isStatic: true,
            render: { fillStyle: 'transparent' },
            restitution: 0.8
        }),
        
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
    
    const planet = Bodies.circle(x, y, 4, {
        restitution: 1.0,
        friction: 0.01,
        frictionAir: 0.01,
        mass: 1,
        render: { fillStyle: '#ffffff' }
    });
    
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
    if (keyIsDown(87)) {
        orbitSpeed += WATCH.ORBIT_SPEED.INCREMENT;
        if (orbitSpeed > WATCH.ORBIT_SPEED.MAX) {
            orbitSpeed = WATCH.ORBIT_SPEED.MAX;
        }
    }
    if (keyIsDown(83)) {
        orbitSpeed -= WATCH.ORBIT_SPEED.INCREMENT;
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

    if (s !== prevSecond) {
        if (!secondsPlanet) {
            createSecondsPlanet(s);
        }
        prevSecond = s;
    }

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

        if (count > prevCount) {
            for (let j = prevCount; j < count; j++) {
                let angle = (TWO_PI / max(count, 1)) * j + orbits[i].offset;
                let planetData = createPlanetAtOrbit(i, angle);
                planetBodies[i].push(planetData.planet);
                constraints[i].push(planetData.constraint);
            }
        } else if (count < prevCount) {
            for (let j = prevCount - 1; j >= count; j--) {
                if (planetBodies[i][j]) {
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
        
        select('#timeStatus').html(`Status: Custom Time (${String(customHour).padStart(2, '0')}:${String(customMinute).padStart(2, '0')}:${String(customSecond).padStart(2, '0')})`);
    }
}

function createSecondsPlanet(second) {
    let angle = TWO_PI * (second / 60) - HALF_PI;
    let x = centerX + cos(angle) * WATCH.SECONDS_RADIUS;
    let y = centerY + sin(angle) * WATCH.SECONDS_RADIUS;

    secondsPlanet = Bodies.circle(x, y, 6, {
        restitution: 1.0,
        friction: 0.01,
        frictionAir: 0.01,
        mass: 1,
        render: { fillStyle: '#6496ff' }
    });

    secondsConstraint = Constraint.create({
        bodyA: centerBody,
        bodyB: secondsPlanet,
        length: WATCH.SECONDS_RADIUS,
        stiffness: 1.0,
        damping: 0.02
    });

    World.add(engine.world, [secondsPlanet, secondsConstraint]);
}

function updatePlanetPositions() {
    if (abs(orbitSpeed) > WATCH.ORBIT_SPEED.BREAKAWAY_THRESHOLD) {
        if (currentStage !== 3) {
            breakAllConstraints();
            currentStage = 3;
        }
        applyBreakawayForces();
    } else if (abs(orbitSpeed) > WATCH.ORBIT_SPEED.BLUE_THRESHOLD) {
        if (currentStage === 3) {
            recreateConstraints();
            currentStage = 2;
        } else {
            currentStage = 2;
        }
        applyConstrainedForces();
    } else {
        if (currentStage === 3) {
            recreateConstraints();
            currentStage = 1;
        } else {
            currentStage = 1;
        }
        applyConstrainedForces();
    }

    updateSecondsMovement();
}

function updateSecondsMovement() {
    if (secondsPlanet && secondsConstraint) {
        let currentPos = secondsPlanet.position;
        let radiusX = currentPos.x - centerX;
        let radiusY = currentPos.y - centerY;
        let radiusLength = sqrt(radiusX * radiusX + radiusY * radiusY);
        
        // Immer in die gleiche Richtung rotieren (im Uhrzeigersinn)
        let tangentX = -radiusY / radiusLength;
        let tangentY = radiusX / radiusLength;
        
        // Konstante, sanfte Rotationsgeschwindigkeit - unabhängig vom orbitSpeed
        let forceMultiplier = 0.0003; // Konstante, nicht beeinflusst von orbitSpeed
        
        Body.applyForce(secondsPlanet, currentPos, {
            x: tangentX * forceMultiplier,
            y: tangentY * forceMultiplier
        });
    }
}

function breakAllConstraints() {
    // Nur die inneren 4 Ringe brechen, NICHT den Sekundenplanet
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < constraints[i].length; j++) {
            if (constraints[i][j]) {
                World.remove(engine.world, constraints[i][j]);
                constraints[i][j] = null;
            }
        }
    }
    // Sekundenplanet-Constraint BLEIBT bestehen
}

function recreateConstraints() {
    // Nur die inneren 4 Ringe wiederherstellen
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < planetBodies[i].length; j++) {
            if (planetBodies[i][j] && !constraints[i][j]) {
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
    // Sekundenplanet-Constraint wird nicht wiederhergestellt, da er nie gebrochen wurde
}

function applyConstrainedForces() {
    for (let i = 0; i < 4; i++) {
        let orbit = orbits[i];
        
        for (let j = 0; j < orbit.count; j++) {
            if (planetBodies[i][j] && constraints[i][j]) {
                let currentPos = planetBodies[i][j].position;
                
                let radiusX = currentPos.x - centerX;
                let radiusY = currentPos.y - centerY;
                let radiusLength = sqrt(radiusX * radiusX + radiusY * radiusY);
                
                let tangentX = -radiusY / radiusLength;
                let tangentY = radiusX / radiusLength;
                
                let baseForce = orbitSpeed * 0.003;
                let randomVariation = 1.0;
                
                if (currentStage === 2) {
                    randomVariation = 0.7 + (j * 0.15) + sin(frameCount * 0.08 + j) * 0.3;
                    
                    applyPostCollisionSeparation(i, j, currentPos);
                } else {
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
    const collisionDistance = 15;
    const separationForce = 0.002;
    const currentVel = planetBodies[orbitIndex][planetIndex].velocity;
    const currentSpeed = sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
    
    for (let k = 0; k < planetBodies[orbitIndex].length; k++) {
        if (k !== planetIndex && planetBodies[orbitIndex][k]) {
            let otherPos = planetBodies[orbitIndex][k].position;
            let otherVel = planetBodies[orbitIndex][k].velocity;
            let dx = currentPos.x - otherPos.x;
            let dy = currentPos.y - otherPos.y;
            let distance = sqrt(dx * dx + dy * dy);
            
            if (distance < collisionDistance && distance > 0) {
                let relativeVelX = currentVel.x - otherVel.x;
                let relativeVelY = currentVel.y - otherVel.y;
                let approachingSpeed = (relativeVelX * dx + relativeVelY * dy) / distance;
                
                if (approachingSpeed > -2) {
                    let separationStrength = separationForce * (collisionDistance - distance) / collisionDistance;
                    let forceX = (dx / distance) * separationStrength;
                    let forceY = (dy / distance) * separationStrength;
                    
                    Body.applyForce(planetBodies[orbitIndex][planetIndex], currentPos, {
                        x: forceX * 2,
                        y: forceY * 2
                    });
                    
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
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < planetBodies[i].length; j++) {
            if (planetBodies[i][j]) {
                let currentPos = planetBodies[i][j].position;
                let currentVel = planetBodies[i][j].velocity;
                
                let containmentForce = calculateContainmentForce(currentPos);
                
                let speed = sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
                let accelerationForce = { x: 0, y: 0 };
                
                if (speed > 0.1) {
                    let forceMultiplier = orbitSpeed * 0.003;
                    accelerationForce.x = (currentVel.x / speed) * forceMultiplier;
                    accelerationForce.y = (currentVel.y / speed) * forceMultiplier;
                } else {
                    let angle = atan2(centerY - currentPos.y, centerX - currentPos.x) + random(-PI/4, PI/4);
                    accelerationForce.x = cos(angle) * orbitSpeed * 0.002;
                    accelerationForce.y = sin(angle) * orbitSpeed * 0.002;
                }
                
                Body.applyForce(planetBodies[i][j], currentPos, {
                    x: accelerationForce.x + containmentForce.x,
                    y: accelerationForce.y + containmentForce.y
                });
            }
        }
    }
}

function calculateContainmentForce(pos) {
    const margin = 50;
    const maxForce = 0.002;
    let forceX = 0, forceY = 0;
    
    if (pos.x < margin) {
        forceX += (margin - pos.x) / margin * maxForce;
    }
    if (pos.x > width - margin) {
        forceX -= (pos.x - (width - margin)) / margin * maxForce;
    }
    if (pos.y < margin) {
        forceY += (margin - pos.y) / margin * maxForce;
    }
    if (pos.y > height - margin) {
        forceY -= (pos.y - (height - margin)) / margin * maxForce;
    }
    
    return { x: forceX, y: forceY };
}

function applySpacingForces(orbitIndex, planetIndex, currentPos) {
    const minDistance = 50;
    const spacingForce = 0.001;
    
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
    noFill();
    stroke(COLORS.GRAY);
    strokeWeight(1);
    for (let i = 0; i < WATCH.ORBIT_RADII.length; i++) {
        ellipse(0, 0, WATCH.ORBIT_RADII[i] * 2);
    }
    ellipse(0, 0, WATCH.SECONDS_RADIUS * 2);
}

function drawPlanets() {
    noStroke();
    
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < planetBodies[i].length; j++) {
            if (planetBodies[i][j]) {
                let pos = planetBodies[i][j].position;
                let x = pos.x - centerX;
                let y = pos.y - centerY;
                let velocity = planetBodies[i][j].velocity;
                
                if (currentStage === 3) {
                    fill(COLORS.BLUE[0], COLORS.BLUE[1], COLORS.BLUE[2]);
                    
                    if (random() < 0.35) {
                        for (let k = 0; k < 4; k++) {
                            particles.push({
                                x: x + random(-6, 6),
                                y: y + random(-6, 6),
                                vx: random(-5, 5),
                                vy: random(-5, 5),
                                alpha: 255,
                                life: 20 + random(30),
                                size: random(2, 4),
                                color: COLORS.BLUE
                            });
                        }
                    }
                } else if (currentStage === 2) {
                    fill(COLORS.BLUE[0], COLORS.BLUE[1], COLORS.BLUE[2]);
                    
                    if (random() < 0.3) {
                        let speed = sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
                        let sparkCount = int(random(2, 6));
                        
                        for (let k = 0; k < sparkCount; k++) {
                            let sparkDirection = atan2(velocity.y, velocity.x) + random(-PI/3, PI/3);
                            let sparkSpeed = random(3, 8) + speed * 0.5;
                            
                            particles.push({
                                x: x + random(-4, 4),
                                y: y + random(-4, 4),
                                vx: cos(sparkDirection) * sparkSpeed + random(-2, 2),
                                vy: sin(sparkDirection) * sparkSpeed + random(-2, 2),
                                alpha: random(200, 255),
                                life: random(15, 40),
                                size: random(1, 5),
                                sparkIntensity: random(0.7, 1.0),
                                color: COLORS.BLUE
                            });
                        }
                    }
                } else {
                    fill(COLORS.WHITE);
                }
                
                ellipse(x, y, 8);
            }
        }
    }

    if (secondsPlanet) {
        let pos = secondsPlanet.position;
        let x = pos.x - centerX;
        let y = pos.y - centerY;
        
        fill(COLORS.BLUE[0], COLORS.BLUE[1], COLORS.BLUE[2]);
        ellipse(x, y, 12);
        
        let pulse = 1 + sin(frameCount * 0.1) * 0.3;
        fill(COLORS.BLUE[0], COLORS.BLUE[1], COLORS.BLUE[2], 100);
        ellipse(x, y, 12 * pulse);
    }
}

function updateFreedPlanets() {
    for (let i = freedPlanets.length - 1; i >= 0; i--) {
        let p = freedPlanets[i];
        const pos = p.body.position;
        
        if (pos.x < -width || pos.x > width * 2 || 
            pos.y < -height || pos.y > height * 2) {
            World.remove(engine.world, p.body);
            freedPlanets.splice(i, 1);
            continue;
        }
        
        fill(COLORS.BLUE[0], COLORS.BLUE[1], COLORS.BLUE[2], p.life);
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
        
        if (p.size > 3) {
            p.vx *= 0.95;
            p.vy *= 0.95;
        } else {
            p.vx *= 0.98;
            p.vy *= 0.98;
        }
        
        p.life--;
        p.alpha = map(p.life, 0, 50, 0, 255);
        
        let intensity = p.sparkIntensity || 1.0;
        let actualAlpha = p.alpha * intensity;

        let color = p.color || COLORS.BLUE;
        fill(color[0], color[1], color[2], actualAlpha);
        noStroke();
        
        let currentSize = p.size || 3;
        ellipse(p.x, p.y, currentSize);

        if (p.life <= 0 || p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawWatchFrame() {}

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
        
        drawBackground();
        
        Engine.update(engine);
        
        handleInput();
        applyInertia();
        updatePlanetPositions();

        push();
        translate(centerX, centerY);
        
        drawOrbits();
        drawPlanets();
        updateFreedPlanets();
        updateParticles();
        
        pop();
        
        drawWatchFrame();
    } catch (error) {
        console.error('Draw cycle error:', error);
    }
}

window.addEventListener('beforeunload', cleanup);