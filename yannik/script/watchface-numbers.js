
const { Engine, Render, Runner, World, Bodies, Body, Composite } = Matter;

// Initialisierung
const engine = Engine.create();
const world = engine.world;
const canvas = document.querySelector("canvas");

const width = window.innerWidth;
const height = window.innerHeight;

// Render Setup
const render = Render.create({
  canvas: canvas,
  engine: engine,
  options: {
    width,
    height,
    wireframes: false,
    background: '#000'
  }
});
Render.run(render);
Runner.run(Runner.create(), engine);

// Hilfsfunktion: Abgerundetes Rechteck
function createRoundedBox(x, y, w, h, radius, color) {
  const box = Bodies.rectangle(x, y, w, h, {
    isStatic: true,
    chamfer: { radius: radius },
    render: {
      fillStyle: color
    }
  });
  return box;
}

// Hilfsfunktion: Ziffer als bewegliches Element
function createDigit(x, y, color, label = "2") {
  const digit = Bodies.circle(x, y, 20, {
    restitution: 1,
    friction: 0,
    frictionAir: 0.001,
    render: {
      fillStyle: color,
      text: {
        content: label,
        color: color,
        size: 24
      }
    }
  });
  Body.setVelocity(digit, { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 });
  return digit;
}

// Rechtecke und Ziffern erstellen
const boxes = [
  { x: 150, y: 150, color: "white", digitColor: "#00FF00", digit: "2" },
  { x: 400, y: 150, color: "#00FF00", digitColor: "white", digit: "1" },
  { x: 150, y: 400, color: "#222", digitColor: "#00FF00", digit: "3" },
  { x: 400, y: 400, color: "#222", digitColor: "white", digit: "4" }
];

boxes.forEach((b) => {
  const box = createRoundedBox(b.x, b.y, 150, 150, 20, b.color);
  const digit = createDigit(b.x, b.y, b.digitColor, b.digit);
  World.add(world, [box, digit]);

  // Grenzen zum Abprallen innerhalb des Rechtecks
  const w = 150, h = 150;
  const wallThickness = 10;
  const walls = [
    Bodies.rectangle(b.x, b.y - h/2, w, wallThickness, { isStatic: true, render: { visible: false } }),
    Bodies.rectangle(b.x, b.y + h/2, w, wallThickness, { isStatic: true, render: { visible: false } }),
    Bodies.rectangle(b.x - w/2, b.y, wallThickness, h, { isStatic: true, render: { visible: false } }),
    Bodies.rectangle(b.x + w/2, b.y, wallThickness, h, { isStatic: true, render: { visible: false } }),
  ];
  World.add(world, walls);
});

