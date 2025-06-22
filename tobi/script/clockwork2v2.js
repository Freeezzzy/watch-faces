/* Fluid-Uhr – Canvas bei 59 Minuten komplett gefüllt
   (nur JavaScript – p5.js ≥1.9 & matter.js ≥0.19 müssen im HTML verlinkt sein) */

const { Engine, World, Bodies, Composite } = Matter;

/* ----------- Grundparameter ----------- */
const SIZE            = 960;
const R_BODY          = 12;           // physikalischer Kreisradius
const SCALE_MIN       = 1.2;          // Zeichen-Faktor bei Minute 0
const SCALE_MAX       = 2.0;          // Zeichen-Faktor bei Minute 59 (größer für Vollfüllung)
const SPACING         = 0.75;         // engeres Raster für mehr Partikel-Dichte
const STEP            = R_BODY * 2 * SPACING;
const COLS            = Math.floor(SIZE / STEP);
const ROWS            = COLS;         // Quadrat

// Mehr Partikel als Rasterplätze – garantiert Vollfüllung
const DENSITY_MULT    = 1.8;          
const MAX_PARTS       = Math.ceil(COLS * ROWS * DENSITY_MULT);

const POP_BATCH       = 120;          // schnelle Zu-/Abnahme
const G               = 3;            // Gravitationstärke
const WALL_THICK      = R_BODY * 3;
const SPAWN_MARGIN    = R_BODY * SCALE_MAX; 

let engine, world;
let particles = [];

/* Simulation-UI */
let simBtn, slider;
let simMode = false;

/* p5: setup */
function setup() {
  createCanvas(SIZE, SIZE);
  pixelDensity(1);

  engine = Engine.create();
  world  = engine.world;
  world.gravity.y = G;

  /* Wände am Rand */
  Composite.add(world, [
    Bodies.rectangle(SIZE/2, -WALL_THICK/2,      SIZE, WALL_THICK, { isStatic: true }),
    Bodies.rectangle(SIZE/2, SIZE+WALL_THICK/2,  SIZE, WALL_THICK, { isStatic: true }),
    Bodies.rectangle(-WALL_THICK/2, SIZE/2,      WALL_THICK, SIZE, { isStatic: true }),
    Bodies.rectangle(SIZE+WALL_THICK/2, SIZE/2,  WALL_THICK, SIZE, { isStatic: true })
  ]);

  /* UI */
  simBtn = createButton('Simulation: OFF')
             .position(10, 10)
             .mousePressed(() => {
               simMode = !simMode;
               simBtn.html(`Simulation: ${simMode ? 'ON' : 'OFF'}`);
               simMode ? slider.show() : slider.hide();
               if (simMode) slider.value(new Date().getMinutes());
             });

  slider = createSlider(0, 59, 0, 1)
             .position(10, 40)
             .style('width', '150px')
             .hide();
}

/* Helpers */
function spawnParticle() {
  const x = random(SPAWN_MARGIN, SIZE - SPAWN_MARGIN);
  const y = random(SPAWN_MARGIN, SIZE - SPAWN_MARGIN);
  const b = Bodies.circle(x, y, R_BODY, {
    friction: 0.05,
    frictionAir: 0.07,
    restitution: 0,
    render: { visible: false }
  });
  particles.push(b);
  Composite.add(world, b);
}

function killParticle() {
  const dead = particles.shift();
  if (dead) Composite.remove(world, dead);
}

/* p5: draw */
function draw() {
  Engine.update(engine, 1000 / 60);

  const minute   = simMode ? slider.value() : new Date().getMinutes();
  const targetN  = Math.floor(map(minute, 0, 59, 0, MAX_PARTS));
  const drawScale= lerp(SCALE_MIN, SCALE_MAX, minute / 59);
  const drawDiam = R_BODY * 2 * drawScale;

  // Partikel-Anzahl anpassen
  const diff = targetN - particles.length;
  if (diff > 0) for (let i = 0; i < Math.min(diff, POP_BATCH); i++) spawnParticle();
  if (diff < 0) for (let i = 0; i < Math.min(-diff, POP_BATCH); i++) killParticle();

  // Zeichnen
  background(15, 35, 70);
  noStroke();
  fill(30, 160, 255);
  for (const p of particles) ellipse(p.position.x, p.position.y, drawDiam);
}

/* Gravitation per Pfeiltasten */
function keyPressed() {
  switch (keyCode) {
    case LEFT_ARROW:  world.gravity.x = -G; world.gravity.y = 0;  break;
    case RIGHT_ARROW: world.gravity.x =  G; world.gravity.y = 0;  break;
    case UP_ARROW:    world.gravity.x = 0;  world.gravity.y = -G; break;
    case DOWN_ARROW:  world.gravity.x = 0;  world.gravity.y =  G; break;
  }
}
