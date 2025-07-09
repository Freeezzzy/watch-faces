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
        MAX: 0.18,                     // Reduced from 0.25 to 0.18 (28% reduction)
        YELLOW_THRESHOLD: 0.10,        // Reduced from 0.15 to 0.10 (earlier phase 2)
        BREAKAWAY_THRESHOLD: 0.15      // Reduced from 0.22 to 0.15 (earlier phase 3)
    }
};

// Neue Hintergrund-Konstanten für Sterne
const BACKGROUND = {
    STAR_COUNT: 40,  // Reduced from 80 to 40 (half the stars)
    TWINKLE_SPEED: 0.03,
    STAR_MIN_SIZE: 1,
    STAR_MAX_SIZE: 3,
    SHOOTING_STAR_CHANCE: 0.003,
    SHOOTING_STAR_DURATION: 60,
    // Neue Konstanten für Spezialeffekte
    SPECIAL_EVENT_DURATION: 900,
    HOURLY_TWINKLE_BOOST: 0.3,
    SPECIAL_TWINKLE_BOOST: 0.6,
    SPECIAL_SHOOTING_STAR_MULTIPLIER: 8,
    // Neue Konstanten für Sekunden-Effekte
    SECOND_EFFECT_DURATION: 180,
    SECOND_SHOOTING_STAR_MULTIPLIER: 3
};

// Definiere die exakte 4-Farben-Palette
const COLORS = {
    BLACK: 0,
    WHITE: 255,
    GRAY: 100,  // Der EINE Grauton
    YELLOW: [255, 255, 100]  // Das EINE Gelb
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
let currentStage = 1; // 1 = white, 2 = yellow, 3 = breakaway

// Sterne-Array
let stars = [];
let shootingStars = [];

// Neue Variablen für Spezialeffekte
let specialEventActive = false;
let specialEventTimer = 0;
let hourlyTwinkleActive = false;
let hourlyTwinkleTimer = 0;
let lastHour = -1;

// Neue Variablen für Sekunden-Effekte
let secondEffectActive = false;
let secondEffectTimer = 0;
let lastSecond = -1;

// Add new state variables after existing ones
let lastMinute = -1;
let minuteStarsCreated = false;

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

        initializeStars(); // Neue Zeile
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
            twinkleSpeed: random(0.01, 0.03), // Langsamere Geschwindigkeit
            twinkleIntensity: random(0.2, 0.4) // Weniger intensive Schwankung
        });
    }
    shootingStars = [];
}

function drawBackground() {
    // Zeichne aufblitzende Sterne
    drawTwinklingStars();
    
    // Zeichne Sternschnuppen
    drawShootingStars();
    
    // Subtile zentrale Ringe (sehr dezent)
    drawCenterRings();
}

function drawTwinklingStars() {
    noStroke();
    
    // Berechne Twinkle-Verstärkung basierend auf aktiven Effekten
    let twinkleBoost = 0;
    if (specialEventActive) {
        twinkleBoost = BACKGROUND.SPECIAL_TWINKLE_BOOST;
    } else if (hourlyTwinkleActive) {
        twinkleBoost = BACKGROUND.HOURLY_TWINKLE_BOOST;
    }
    
    for (let i = 0; i < stars.length; i++) {
        let star = stars[i];
        
        // Verstärkte Twinkle-Berechnung während Spezialevents
        let baseSpeed = star.twinkleSpeed * (1 + twinkleBoost);
        let twinkle1 = sin(frameCount * baseSpeed + star.twinkleOffset);
        let twinkle2 = cos(frameCount * baseSpeed * 0.7 + star.twinkleOffset * 1.3);
        let combinedTwinkle = (twinkle1 + twinkle2 * 0.5) / 1.5;
        
        // Verstärkte Intensität während Events
        let intensity = star.twinkleIntensity * (1 + twinkleBoost);
        let currentBrightness = star.baseBrightness + combinedTwinkle * intensity;
        currentBrightness = constrain(currentBrightness, 0.2, 1.0);
        
        // NUR der eine Grauton mit variabler Transparenz
        let alpha = map(currentBrightness, 0.2, 1.0, 80, 255);
        fill(COLORS.GRAY, alpha);
        
        // Verstärkte Größenvariation während Events
        let sizeMultiplier = 1 + twinkleBoost * 0.5;
        let currentSize = star.size * (0.8 + currentBrightness * 0.2) * sizeMultiplier;
        
        ellipse(star.x, star.y, currentSize);
        
        // Verstärkter Glow-Effekt während Events
        if (currentBrightness > 0.75 - twinkleBoost * 0.2) {
            fill(COLORS.GRAY, alpha * 0.4 * (1 + twinkleBoost));
            ellipse(star.x, star.y, currentSize * (1.8 + twinkleBoost * 0.5));
        }
    }
}

function createShootingStar() {
    // Create shooting star from random edge of screen
    let startX, startY, vx, vy;
    
    // Choose random edge to start from
    let edge = int(random(4));
    switch(edge) {
        case 0: // Top
            startX = random(width);
            startY = -10;
            vx = random(-3, 3);
            vy = random(2, 6);
            break;
        case 1: // Right
            startX = width + 10;
            startY = random(height);
            vx = random(-6, -2);
            vy = random(-3, 3);
            break;
        case 2: // Bottom
            startX = random(width);
            startY = height + 10;
            vx = random(-3, 3);
            vy = random(-6, -2);
            break;
        case 3: // Left
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
    // Normale Sternschnuppen-Wahrscheinlichkeit (NICHT erhöht bei neuen Minuten)
    let shootingChance = BACKGROUND.SHOOTING_STAR_CHANCE;
    if (specialEventActive) {
        shootingChance *= BACKGROUND.SPECIAL_SHOOTING_STAR_MULTIPLIER;
    }
    
    // Erstelle normale Sternschnuppen (die 3 Minuten-Sternschnuppen werden in updateTime() erstellt)
    if (currentStage === 1 && random() < shootingChance) {
        createShootingStar();
    }
    
    // Zeichne und update bestehende Sternschnuppen
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        let meteor = shootingStars[i];
        
        // Update Position
        meteor.x += meteor.vx;
        meteor.y += meteor.vy;
        meteor.life--;
        
        // Berechne Alpha basierend auf Lebensdauer - using strict color palette
        let alpha = map(meteor.life, 0, BACKGROUND.SHOOTING_STAR_DURATION, 0, 255);
        alpha = constrain(alpha, 0, 255);
        
        // Zeichne Sternschnuppe - using ONLY COLORS.GRAY
        stroke(COLORS.GRAY, alpha);
        strokeWeight(2);
        
        // Hauptlinie
        line(meteor.x, meteor.y, 
             meteor.x - meteor.vx * 8, meteor.y - meteor.vy * 8);
        
        // Schweif mit abnehmendem Alpha
        for (let j = 1; j <= 3; j++) {
            let trailAlpha = alpha * (1 - j * 0.3);
            stroke(COLORS.GRAY, trailAlpha); // Using COLORS.GRAY consistently
            strokeWeight(2 - j * 0.5);
            line(meteor.x - meteor.vx * j * 3, meteor.y - meteor.vy * j * 3,
                 meteor.x - meteor.vx * (j + 3) * 3, meteor.y - meteor.vy * (j + 3) * 3);
        }
        
        // Kopf der Sternschnuppe (heller Punkt) - using COLORS.GRAY
        fill(COLORS.GRAY, alpha);
        noStroke();
        ellipse(meteor.x, meteor.y, 3);
        
        // Entferne abgelaufene Sternschnuppen
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
    
    // Sehr subtile konzentrische Kreise - NUR Grauton
    for (let i = 1; i <= 3; i++) {
        let radius = i * 70;
        let alpha = map(i, 1, 3, 30, 10); // Transparenz-Variation
        
        stroke(COLORS.GRAY, alpha);
        strokeWeight(0.5);
        ellipse(0, 0, radius * 2);
    }
    pop();
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

    // Preset Buttons Container
    const presetDiv = createDiv('');
    presetDiv.style('margin-bottom', '10px');
    presetDiv.parent(controlsDiv);

    // Preset Button 1: 23:59:50
    const preset1Button = createButton('23:59:50');
    preset1Button.style('background', '#2196F3');
    preset1Button.style('color', 'white');
    preset1Button.style('border', 'none');
    preset1Button.style('padding', '5px 8px');
    preset1Button.style('border-radius', '3px');
    preset1Button.style('cursor', 'pointer');
    preset1Button.style('margin-right', '5px');
    preset1Button.style('font-size', '11px');
    preset1Button.mousePressed(() => setPresetTime(23, 59, 50));
    preset1Button.parent(presetDiv);

    // Preset Button 2: 16:46:37
    const preset2Button = createButton('16:46:37');
    preset2Button.style('background', '#FF9800');
    preset2Button.style('color', 'white');
    preset2Button.style('border', 'none');
    preset2Button.style('padding', '5px 8px');
    preset2Button.style('border-radius', '3px');
    preset2Button.style('cursor', 'pointer');
    preset2Button.style('font-size', '11px');
    preset2Button.mousePressed(() => setPresetTime(16, 46, 37));
    preset2Button.parent(presetDiv);

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

function setPresetTime(h, m, s) {
    // Update input fields
    hourInput.value(h.toString());
    minuteInput.value(m.toString());
    secondInput.value(s.toString());
    
    // Set the time
    customHour = h;
    customMinute = m;
    customSecond = s;
    useCustomTime = true;
    
    // Update display immediately
    updateTime();
    
    // Update status
    select('#timeStatus').html(`Status: Custom Time (${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')})`);
    
    console.log(`Preset time set to: ${h}:${m}:${s}`);
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
    
    const planet = Bodies.circle(x, y, 4, {
        restitution: 1.0,   // Maximum bounce - no energy loss!
        friction: 0.01,     // Almost no friction
        frictionAir: 0.01,  // Very low air resistance
        mass: 1,
        render: { fillStyle: '#ffffff' }
    });
    
    // Create constraint to keep planet at exact distance from center
    const constraint = Constraint.create({
        bodyA: centerBody,
        bodyB: planet,
        length: radius,
        stiffness: 1.0,
        damping: 0.02  // Much less damping for more bounce
    });
    
    World.add(engine.world, [planet, constraint]);
    
    return { planet, constraint };
}

function handleInput() {
    if (keyIsDown(87)) { // W key
        orbitSpeed += WATCH.ORBIT_SPEED.INCREMENT * 0.3; // Reduced from 1.0 to 0.3
        // Cap the maximum speed
        if (orbitSpeed > WATCH.ORBIT_SPEED.MAX) {
            orbitSpeed = WATCH.ORBIT_SPEED.MAX;
        }
    }
    if (keyIsDown(83)) { // S key
        orbitSpeed -= WATCH.ORBIT_SPEED.INCREMENT * 0.3; // Reduced from 1.0 to 0.3
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

    // Prüfe auf neue Minute (nur bei Sekunde 0)
    if (m !== lastMinute && s === 0) {
        minuteStarsCreated = false; // Reset flag for new minute
        
        // Erstelle sofort 3 Sternschnuppen
        for (let i = 0; i < 3; i++) {
            setTimeout(() => createShootingStar(), i * 150); // Verzögert um 150ms pro Stern
        }
        minuteStarsCreated = true;
        console.log(`3 shooting stars created at ${h}:${String(m).padStart(2, '0')}:00!`);
    }
    
    // Reset flag when leaving second 0
    if (s !== 0) {
        minuteStarsCreated = false;
    }
    
    lastMinute = m;

    // Prüfe auf Spezialevents (12:00 und 00:00)
    if ((h === 12 || h === 0) && m === 0 && s === 0) {
        if (!specialEventActive) {
            specialEventActive = true;
            specialEventTimer = BACKGROUND.SPECIAL_EVENT_DURATION;
            console.log(`Special event triggered at ${h}:00!`);
        }
    }
    
    // Prüfe auf stündliches Funkeln (JEDE volle Stunde)
    if (h !== lastHour && m === 0 && s === 0) {
        hourlyTwinkleActive = true;
        hourlyTwinkleTimer = Math.floor(BACKGROUND.SPECIAL_EVENT_DURATION * 0.3); // 4.5 Sekunden
        console.log(`Hourly twinkle triggered at ${h}:00!`);
    }
    lastHour = h;

    // Keep 24-hour format - no conversion needed
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
    const collisionDistance = 15; // Distance considered "just collided"
    const separationForce = 0.002; // Force to push apart after collision
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
    const minDistance = 50; // Increased minimum distance
    const spacingForce = 0.001; // Much stronger spacing force (10x stronger)
    
    // Check distance to other planets on the same orbit
    for (let k = 0; k < planetBodies[orbitIndex].length; k++) {
        if (k !== planetIndex && planetBodies[orbitIndex][k]) {
            let otherPos = planetBodies[orbitIndex][k].position;
            let dx = currentPos.x - otherPos.x;
            let dy = currentPos.y - otherPos.y;
            let distance = sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance && distance > 0) {
                // Apply much stronger repelling force
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
    stroke(COLORS.GRAY); // NUR der eine Grauton
    strokeWeight(1);
    // Only draw the orbit circles
    for (let i = 0; i < WATCH.ORBIT_RADII.length; i++) {
        ellipse(0, 0, WATCH.ORBIT_RADII[i] * 2);
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
                let velocity = planetBodies[i][j].velocity;
                
                // Color based on current stage - NUR Gelb oder Weiß
                if (currentStage === 3) {
                    fill(COLORS.YELLOW[0], COLORS.YELLOW[1], COLORS.YELLOW[2]); // Das EINE Gelb
                    
                    // Extra sparkles in stage 3
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
                                color: COLORS.YELLOW // Das EINE Gelb
                            });
                        }
                    }
                } else if (currentStage === 2) {
                    fill(COLORS.YELLOW[0], COLORS.YELLOW[1], COLORS.YELLOW[2]); // Das EINE Gelb
                    
                    // Improved sparks in stage 2 - more realistic sparking effect
                    if (random() < 0.3) {
                        let speed = sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
                        let sparkCount = int(random(2, 6)); // Variable number of sparks
                        
                        for (let k = 0; k < sparkCount; k++) {
                            // Calculate spark direction based on planet movement
                            let sparkDirection = atan2(velocity.y, velocity.x) + random(-PI/3, PI/3);
                            let sparkSpeed = random(3, 8) + speed * 0.5; // Speed influenced by planet velocity
                            
                            particles.push({
                                x: x + random(-4, 4),
                                y: y + random(-4, 4),
                                vx: cos(sparkDirection) * sparkSpeed + random(-2, 2),
                                vy: sin(sparkDirection) * sparkSpeed + random(-2, 2),
                                alpha: random(200, 255),
                                life: random(15, 40), // Variable lifespan
                                size: random(1, 5), // Variable sizes for more realistic sparks
                                sparkIntensity: random(0.7, 1.0), // Individual brightness
                                color: COLORS.YELLOW // Das EINE Gelb
                            });
                        }
                    }
                } else {
                    fill(COLORS.WHITE); // Das EINE Weiß
                }
                
                ellipse(x, y, 8);
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
        
        fill(COLORS.YELLOW[0], COLORS.YELLOW[1], COLORS.YELLOW[2], p.life); // Das EINE Gelb
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
        
        // Different decay rates for different particle types
        if (p.size > 3) {
            // Larger sparks fade slower and decelerate more
            p.vx *= 0.95;
            p.vy *= 0.95;
        } else {
            // Smaller sparks fade faster and maintain speed longer
            p.vx *= 0.98;
            p.vy *= 0.98;
        }
        
        p.life--;
        p.alpha = map(p.life, 0, 50, 0, 255);
        
        // Apply spark intensity if it exists
        let intensity = p.sparkIntensity || 1.0;
        let actualAlpha = p.alpha * intensity;

        // NUR das eine Gelb verwenden
        let color = p.color || COLORS.YELLOW;
        fill(color[0], color[1], color[2], actualAlpha);
        noStroke();
        
        // Draw spark with variable size - NO GLOW EFFECTS
        let currentSize = p.size || 3;
        ellipse(p.x, p.y, currentSize);

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
            fill(COLORS.YELLOW[0], COLORS.YELLOW[1], COLORS.YELLOW[2]); // Das EINE Gelb
            ellipse(x, y, 5 + pulse);
        } else {
            fill(COLORS.GRAY); // Der EINE Grauton
            ellipse(x, y, 3 + pulse * 0.5);
        }
    }
}

function drawWatchFrame() {
    // Komplett leere Funktion - nur die Matter.js Wände bleiben für die Physik
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
        
        // Update Spezialeffekt-Timer
        if (specialEventActive) {
            specialEventTimer--;
            if (specialEventTimer <= 0) {
                specialEventActive = false;
                console.log('Special event ended');
            }
        }
        
        if (hourlyTwinkleActive) {
            hourlyTwinkleTimer--;
            if (hourlyTwinkleTimer <= 0) {
                hourlyTwinkleActive = false;
                console.log('Hourly twinkle ended');
            }
        }
        
        // Update Sekunden-Effekt-Timer
        if (secondEffectActive) {
            secondEffectTimer--;
            if (secondEffectTimer <= 0) {
                secondEffectActive = false;
                console.log('Second effect ended');
            }
        }
        
        // Sternenhimmel-Hintergrund zuerst zeichnen
        drawBackground();
        
        // Update Matter.js physics
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
        drawSeconds();
        
        pop();
        
        drawWatchFrame();
    } catch (error) {
        console.error('Draw cycle error:', error);
    }
}

// Add window event listener for cleanup
window.addEventListener('beforeunload', cleanup);