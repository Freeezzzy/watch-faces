const { Engine, Render, World, Bodies, Body, Composite, Mouse, MouseConstraint } = Matter;

function createWatchface() {
  // Engine mit leichtem Reibungseffekt
  const engine = Engine.create({
    gravity: { x: 0, y: 0 },
    friction: 0.01
  });
  const world = engine.world;

  // Render mit transparentem Hintergrund für Smartwatch
  const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: 300,
      height: 300,
      wireframes: false,
      background: 'rgba(0,0,0,0)'
    }
  });

  // Unsichtbarer Rand für Fäden
  const boundary = Bodies.circle(150, 150, 145, {
    isStatic: true,
    isSensor: true,
    render: { visible: false }
  });

  // Chaotische Fäden generieren
  const threads = [];
  const threadCount = 18;
  const accentColor = '#ff4d6d'; // Akzentfarbe für zerstörte Fäden

  for (let i = 0; i < threadCount; i++) {
    const startAngle = Math.random() * Math.PI * 2;
    const endAngle = startAngle + (Math.random() * 1 - 0.5) * Math.PI/2;
    
    const length = 80 + Math.random() * 60;
    const midX = 150 + Math.cos(startAngle) * length/2;
    const midY = 150 + Math.sin(startAngle) * length/2;
    
    const thread = Bodies.rectangle(midX, midY, length, 0.3, {
      angle: startAngle,
      friction: 0.001,
      restitution: 0.3,
      render: {
        fillStyle: 'rgba(255,255,255,0.7)',
        strokeStyle: 'transparent'
      },
      collisionFilter: {
        group: -1,
        category: 0x0002,
        mask: 0xFFFFFFFF
      }
    });
    
    // Verbindungspunkte für elastisches Verhalten
    const constraint = Constraint.create({
      pointA: { x: 150, y: 150 },
      bodyB: thread,
      pointB: { x: 0, y: 0 },
      stiffness: 0.005,
      render: { visible: false }
    });
    
    threads.push({ body: thread, constraint: constraint, health: 1 });
  }

  // Zeiger mit Physik-Material für Interaktionen
  const hands = {
    hour: Bodies.rectangle(150, 150, 70, 3.5, {
      chamfer: { radius: 2 },
      isStatic: true,
      render: { fillStyle: '#fff' }
    }),
    minute: Bodies.rectangle(150, 150, 100, 2.5, {
      chamfer: { radius: 1.5 },
      isStatic: true,
      render: { fillStyle: '#fff' }
    }),
    second: Bodies.rectangle(150, 150, 120, 1, {
      isStatic: true,
      render: { fillStyle: accentColor }
    })
  };

  // Alles zur Welt hinzufügen
  World.add(world, [
    boundary,
    ...threads.map(t => t.body),
    ...threads.map(t => t.constraint),
    hands.hour,
    hands.minute,
    hands.second
  ]);

  // Kollisionserkennung für Faden-Zerstörung
  Matter.Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;
    
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      
      // Check if any thread is involved
      threads.forEach((thread) => {
        if (pair.bodyA === thread.body || pair.bodyB === thread.body) {
          thread.health -= 0.15; // Zerstörungsrate
          
          // Faden "zerreißen" Effekt
          if (thread.health <= 0) {
            thread.body.render.fillStyle = accentColor;
            World.remove(world, thread.constraint);
          } else {
            // Opacity reduzieren
            thread.body.render.fillStyle = `rgba(255,255,255,${thread.health * 0.7})`;
          }
        }
      });
    }
  });

  // Zeigeranimation
  function updateHands() {
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    // Sanfte Bewegung mit easing
    const hourAngle = (hours + minutes / 60) * Math.PI / 6;
    const minuteAngle = minutes * Math.PI / 30;
    const secondAngle = seconds * Math.PI / 30;
    
    Body.setAngle(hands.hour, hourAngle);
    Body.setAngle(hands.minute, minuteAngle);
    Body.setAngle(hands.second, secondAngle);
    
    Body.setPosition(hands.hour, { x: 150, y: 150 });
    Body.setPosition(hands.minute, { x: 150, y: 150 });
    Body.setPosition(hands.second, { x: 150, y: 150 });
    
    // Regeneriere zerstörte Fäden nach 10 Sekunden
    if (seconds % 10 === 0) {
      threads.forEach((thread) => {
        if (thread.health <= 0 && Math.random() > 0.7) {
          thread.health = 1;
          thread.body.render.fillStyle = 'rgba(255,255,255,0.7)';
          World.add(world, thread.constraint);
        }
      });
    }
    
    requestAnimationFrame(updateHands);
  }

  // Starte die Simulation
  Engine.run(engine);
  Render.run(render);
  updateHands();
}

createWatchface();