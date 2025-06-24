const Engine = Matter.Engine;
const Runner = Matter.Runner;
const World = Matter.World;
const Events = Matter.Events;
const Bodies = Matter.Bodies;

function dec2bin(dec) {
  return (dec >>> 0).toString(2);
}

// the Matter engine to animate the world
let engine, runner, world, mouse;
let isDrag = false;
// 4512 2538
const dim = { w: 960, h: 960 }
let off = { x: 0, y: 0 }
let blocks = [];
let boxes = [];
let murmel, canvasElem
const testBall = 'red'
let actSec, actMin, actH
let blockConstraints = [];



// collisionFilter: {group: 0x00, category: 0b0000 0000 0000 0001, mask: 0b1111 1111 1111 1111}
// collision of A and B: group > 0 && groupA == groupB          ,
// no collision of A and B: group < 0 && groupA == groupB
// groupA != groupB: 
// collision of A and B ? (categoryA & maskB) !== 0 && (categoryB & maskA) !== 0
const cfM = { group: 0, category: 0x0002, mask: 0x0021 }
const cfX = { group: 0, category: 0x0004, mask: 0xFFFF }

const setCollide = (cfA, cfB, on) => {
  cfA.mask = on ? cfA.mask | cfB.category : cfA.mask & (~cfB.category & 0xFF)
  // console.log(cfA.mask.toString(2))
}
const doesCollide = (cfA, cfB) => {
  return (cfA.mask & cfB.category) !== 0 && (cfB.mask & cfA.category) !== 0
}

function setup() {
  console.log(windowWidth, windowHeight);
  canvasElem = document.getElementById('thecanvas')
  let canvas = createCanvas(960, 960);
  canvas.parent('thecanvas');

  engine = Engine.create();
  runner = Runner.create({ isFixed: true, delta: 1000 / 60 })
  world = engine.world;

  mouse = new Mouse(engine, canvas, { stroke: 'blue', strokeWeight: 3 });
  // Matter.Mouse.setScale(mouse.mouse, {x: 0.75, y: 0.75});

  // Oder auch Test-Murmeln in Spiel bringen
  // mouse.on("startdrag", evt => {
  //   isDrag = true;
  // });
  // mouse.on("mouseup", evt => {
  //   if (!isDrag) {
  //     addMurmel({ x: evt.mouse.position.x, y: evt.mouse.position.y }, testBall, murmel.body.collisionFilter)
  //   }
  //   isDrag = false;
  // });

  // Hier wird registriert, ob die Murmel mit etwas kollidiert und
  // dann die trigger-Funktion des getroffenen Blocks ausgelöst
  // Dieser Code ist DON'T TOUCH IT - wenn das Bewdürfnis besteht, bitte mit Benno reden!!!
  Events.on(engine, 'collisionStart', function (event) {
    var pairs = event.pairs;
    pairs.forEach((pair, i) => {
      if (pair.bodyA.label == 'Murmel') {
        pair.bodyA.plugin.block.collideWith(pair.bodyB.plugin.block)
      }
      if (pair.bodyB.label == 'Murmel') {
        pair.bodyB.plugin.block.collideWith(pair.bodyA.plugin.block)
      }
    })
  })

  Events.on(engine, 'collisionActive', function (event) {
    var pairs = event.pairs;
    pairs.forEach((pair, i) => {
      if (pair.bodyA.label == 'Murmel' && pair.bodyB.label == 'Active') {
        pair.bodyA.plugin.block.collideWith(pair.bodyB.plugin.block)
      }
      if (pair.bodyB.label == 'Murmel' && pair.bodyA.label == 'Active') {
        pair.bodyB.plugin.block.collideWith(pair.bodyA.plugin.block)
      }
    })
  })

  createScene();
  // Den Motor von Matter starten: die Physik wird berechnet
  Runner.run(runner, engine);
}

function createScene() {

  new BlocksFromSVG(world, 'frame960.svg', [],
    { isStatic: true, restitution: 0.0, friction: 0.0, frictionAir: 0.0 },
    {
      save: false, sample: 40, offset: { x: -100, y: -100 }, done: (added, time, fromCache) => {
        console.log('FRAME', added, time, fromCache)
      }
    });

  // new BlocksFromSVG(world, 'benno.svg', blocks,
  //   { isStatic: true, restitution: 0.9, friction: 0.0, frictionAir: 0.0 },
  //   {
  //     save: false, sample: 10, offset: { x: 0, y: 0 }, done: (added, time, fromCache) => {
  //       console.log('STATIC', added, time, fromCache)
  //       // sterne = Object.keys(added).map(key => added[key])
  //       // Matter.Body.setStatic(sterne[0].body, false);
  //     }
  //   });

  boxes.push(new PolygonFromSVG(
    world,
    { x: 250, y: 200, fromFile: 'Frame-dick.svg', scale: 1, color: "white" },
    { isStatic: false, friction: 0.3, restitution: 0.9 }
  ));

  boxes.push(new PolygonFromSVG(
    world,
    { x: 700, y:400 , fromFile: 'Frame-dick.svg', scale: 1, color: "black" },
    { isStatic: false, friction: 0.3, restitution: 0.9 }
  ));

  boxes.push(new PolygonFromSVG(
    world,
    { x: 250, y: 700, fromFile: 'Frame-dick.svg', scale: 1, color: "#00FF2A" },
    { isStatic: false, friction: 0.3, restitution: 0.9 }
  ));

 

  setTimeout(() => {
    // createCode(23, 0, 'black')
    // createCode (59,1, "#00FF2A")
    // createCode(58, 2, 'white')
  }, 500)

  // murmel = addMurmel({ x: 700, y: 300 }, '#404040', cfM)
}

// Constraints zum ersten Objekt (links)
const constraintTopLeft = Matter.Constraint.create({
  bodyA: blockBody,
  pointA: { x: first.position.x, y: first.position.y - 40 },
  bodyB: boxBody,
  pointB: { x: -boxBody.bounds.max.x + boxBody.position.x + 10, y: -boxBody.bounds.max.y + boxBody.position.y + 10 },
  stiffness: 0.02,
  damping: 0.05,
  render: { strokeStyle: 'green' }
});

const constraintBottomLeft = Matter.Constraint.create({
  bodyA: blockBody,
  pointA: { x: first.position.x, y: first.position.y + 40 },
  bodyB: boxBody,
  pointB: { x: -boxBody.bounds.max.x + boxBody.position.x + 10, y: -boxBody.bounds.min.y + boxBody.position.y - 10 },
  stiffness: 0.02,
  damping: 0.05,
  render: { strokeStyle: 'green' }
});

// Constraints zum letzten Objekt (rechts)
const constraintTopRight = Matter.Constraint.create({
  bodyA: blockBody,
  pointA: { x: last.position.x, y: last.position.y - 40 },
  bodyB: boxBody,
  pointB: { x: boxBody.bounds.max.x - boxBody.position.x - 10, y: -boxBody.bounds.max.y + boxBody.position.y + 10 },
  stiffness: 0.02,
  damping: 0.05,
  render: { strokeStyle: 'green' }
});

const constraintBottomRight = Matter.Constraint.create({
  bodyA: blockBody,
  pointA: { x: last.position.x, y: last.position.y + 40 },
  bodyB: boxBody,
  pointB: { x: boxBody.bounds.max.x - boxBody.position.x - 10, y: -boxBody.bounds.min.y + boxBody.position.y - 10 },
  stiffness: 0.02,
  damping: 0.05,
  render: { strokeStyle: 'green' }
});




function tick() {
  const zeit = new Date(Date.now());
  const h = zeit.getHours();
  const min = zeit.getMinutes();
  const sec = zeit.getSeconds();

  // Stundenblock
  if (h !== actH && boxes[0]) {
    if (blocks[0] && blocks[0].body) {
      Matter.World.remove(world, blocks[0].body);
    }
    createCode(h, 0, 'black');
    actH = h;
  }

  // Minutenblock
  if (min !== actMin && boxes[1]) {
    if (blocks[1] && blocks[1].body) {
      Matter.World.remove(world, blocks[1].body);
    }
    createCode(min, 1, '#00FF2A');
    actMin = min;
  }

  // Sekundenblock
  if (sec !== actSec && boxes[2]) {
    if (blocks[2] && blocks[2].body) {
      Matter.World.remove(world, blocks[2].body);
    }
    createCode(sec, 2, 'white');
    actSec = sec;
  }
}




function scrollEndless(point) {
  // wohin muss verschoben werden damit point wenn möglich in der Mitte bleibt
  off = { x: Math.min(Math.max(0, point.x - window.innerWidth / 2), dim.w - window.innerWidth), y: Math.min(Math.max(0, point.y - window.innerHeight / 2), dim.h - window.innerHeight) }
  // plaziert den Canvas im aktuellen Viewport
  canvasElem.style.left = Math.round(off.x) + 'px'
  canvasElem.style.top = Math.round(off.y) + 'px'
  // korrigiert die Koordinaten
  translate(-off.x, -off.y)
  // verschiebt den ganzen Viewport
  window.scrollTo(off.x, off.y)
  mouse.setOffset(off)
}

function draw() {
  background("#A5A2A2");
  if (murmel) {
    scrollEndless(murmel.body.position);
  }

  boxes.forEach(block => block.draw());
  blocks.forEach(block => block.draw());

  // Constraints zeichnen
  stroke('green');
  strokeWeight(2);
  for (let conns of blockConstraints) {
    if (!conns) continue;
    for (let c of conns) {
      if (!c.bodyA) continue;
      const bodyA = c.bodyA;
      const ax = bodyA.position.x + (c.pointA?.x || 0);
      const ay = bodyA.position.y + (c.pointA?.y || 0);
      const bx = c.pointB?.x || 0;
      const by = c.pointB?.y || 0;
      line(ax, ay, bx, by);
    }
  }

  mouse.draw();
  if (boxes.length >= 3 && boxes[0]?.body && boxes[1]?.body && boxes[2]?.body) {
    tick();
  }
}


function keyPressed() {
  const forceAmount = 2;

  // Box 0: Steuerung mit WASD
  if (key === 'w') {
    console.log('w')
   world.gravity.y = -1
  }
  if (key === 'a') {
    console.log('a');
    world.gravity.x = -1
  }
  if (key === 's') {
    console.log('s');
    world.gravity.y = 1
  }
  if (key === 'd') {
    console.log('d');
    world.gravity.x = 1
  }

  // Box 1: Steuerung mit Pfeiltasten
  if (keyCode === LEFT_ARROW) {
    Matter.Body.applyForce(boxes[1].body, boxes[1].body.position, { x: -forceAmount, y: 0 });
  }
  if (keyCode === RIGHT_ARROW) {
    Matter.Body.applyForce(boxes[1].body, boxes[1].body.position, { x: forceAmount, y: 0 });
  }
  if (keyCode === UP_ARROW) {
    Matter.Body.applyForce(boxes[1].body, boxes[1].body.position, { x: 0, y: -forceAmount });
  }
  if (keyCode === DOWN_ARROW) {
    Matter.Body.applyForce(boxes[1].body, boxes[1].body.position, { x: 0, y: forceAmount });
  }}