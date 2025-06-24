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
    { x: 700, y:400 , fromFile: 'Frame-dick.svg', scale: 1, color:"#A5A2A2" },
    { isStatic: false, friction: 0.3, restitution: 0.9 }
  ));

  boxes.push(new PolygonFromSVG(
    world,
    { x: 250, y: 700, fromFile: 'Frame-dick.svg', scale: 1, color: "#00FF2A" },
    { isStatic: false, friction: 0.3, restitution: 0.9 }
  ));

  // blocks.push(new Parts(
  //   world,
  //   { x: 900, y: 730, color: "black", offset: { x: 0, y: -20.0 } },
  //   {
  //     parts: [
  //       Bodies.rectangle(4, 20, 5, 20),
  //       Bodies.rectangle(40 - 4, 20, 5, 20),
  //       Bodies.rectangle(20, +40 - 4, 50, 5)
  //     ],
  //     isStatic: true,
  //     friction: 0.0
  //   }
  // ));

  setTimeout(() => {
    // createCode(23, 0, 'black')
    // createCode (59,1, "#00FF2A")
    // createCode(58, 2, 'white')
  }, 500)

  // murmel = addMurmel({ x: 700, y: 300 }, '#404040', cfM)
}

// function createCode(zahl, box, color) {
//   let parts = []
//   const b = dec2bin(zahl)
//   let x = 0;
//   for (c = 0; c < b.length; c++) {
//     if (b.charAt(c) == 1) {
//       console.log("rect")
//       parts.push(Bodies.rectangle(x, 0, 20, 80))
//       x += 50
//     } else {
//       console.log("circle")
//       parts.push(Bodies.circle(x, 0, 20))
//       x += 50
//     }
//   }
//   blocks[box] = new Parts(
//     world,
//     { x: boxes[box].body.position.x - 40, y: boxes[box].body.position.y - 40, color: color, offset: { x: 0, y: -20.0 } },
//     {
//       parts: parts,
//       isStatic: false,
//       friction: 0.0,
//       restitution: 0.2
//     }
//   );
// }

function createCode(zahl, box, color) {
  if (!boxes[box] || !boxes[box].body) return;  // <<< SCHUTZ!

  let parts = [];
  const b = dec2bin(zahl);
  let x = 0;

  for (let c = 0; c < b.length; c++) {
    if (b.charAt(c) === '1') {
      parts.push(Bodies.rectangle(x, 0, 20, 80));
    } else {
      parts.push(Bodies.circle(x, 0, 20));
    }
    x += 50;
  }

  blocks[box] = new Parts(
    world,
    {
      x: boxes[box].body.position.x - 40,
      y: boxes[box].body.position.y - 40,
      color: color,
      offset: { x: 0, y: -20.0 }
    },
    {
      parts: parts,
      isStatic: false,
      friction: 0.0,
      restitution: 0.2
    }
  );
}


// function tick() {
//   const zeit = new Date(Date.now())
//  const h = zeit.getHours()
//  if (h != actH) {
//    if (blocks [0]){
//    Matter.World.remove(world, blocks[0])
//    }
//    createCode(h, 0, 'black')
  
//    actH = h
//  }
//  const min = zeit.getMinutes()
//  if (min != actMin) {
//    if (blocks [1]){
//    Matter.World.remove(world, blocks[1])
//    }
//    createCode(min, 1, '#00FF2A')
  
//    actMin = min
//  }
//  const sec = zeit.getSeconds()
//  if (sec != actSec) {
//   if (blocks[2]) {
//     if (blocks[2]) {
//       Matter.World.remove(world, blocks[2].body); // oder Composite
//     }  // wichtig: .body!
//   }
//   createCode(sec, 2, 'white');
//   actSec = sec;
// }
//  }

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
    createCode(h, 0, "#A5A2A2");
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


// function addMurmel(point, color, filter) {
//   const ball = new Ball(
//     world,
//     { x: point.x, y: point.y, r: 30, color: color },
//     {
//       label: "Murmel", restitution: 0.9, friction: 0.0, frictionAir: 0.0, isStatic: false, density: 0.01,
//       collisionFilter: filter
//     }
//   )
//   blocks.push(ball)
//   return ball
// }

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
  // clear();
  background("black")
  if (murmel) {
    scrollEndless(murmel.body.position)
  }
  boxes.forEach(block => block.draw());
  blocks.forEach(block => block.draw());
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