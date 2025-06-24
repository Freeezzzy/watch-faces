// Initialize Matter.js
const Engine = Matter.Engine;
const Render = Matter.Render;
const World = Matter.World;
const Bodies = Matter.Bodies;
const Constraint = Matter.Constraint;

// Create engine and world
const engine = Engine.create();
const world = engine.world;

// Create renderer mit Apple Watch Dimensionen
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 400,  // Apple Watch Größe
        height: 480, // Apple Watch Größe
        wireframes: false,
        background: '#000000'
    }
});

// Aufhängepunkte angepasst für Apple Watch Breite
const anchors = [
    Bodies.circle(100, 80, 8, { isStatic: true, render: { fillStyle: '#FFFFFF' }}),
    Bodies.circle(180, 80, 8, { isStatic: true, render: { fillStyle: '#FFFFFF' }}),
    Bodies.circle(260, 80, 8, { isStatic: true, render: { fillStyle: '#FFFFFF' }}),
    Bodies.circle(340, 80, 8, { isStatic: true, render: { fillStyle: '#FFFFFF' }})
];

// Pendel mit verbesserten Ziffern
const pendulums = anchors.map((_, index) => {
    return Bodies.circle(anchors[index].position.x, 250, 30, {
        render: {
            fillStyle: '#808080',
            sprite: {
                texture: createNumberTexture(index),
                xScale: 0.5,
                yScale: 0.5
            }
        }
    });
});

// Funktion zum Erstellen der Zifferntextur mit aktueller Uhrzeit
function createNumberTexture(index) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Hole aktuelle Uhrzeit
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeDigits = hours + minutes;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeDigits[index], 50, 50);
    return canvas.toDataURL();
}

// Aktualisiere Pendel-Ziffern jede Sekunde
function updateTime() {
    pendulums.forEach((pendulum, index) => {
        pendulum.render.sprite.texture = createNumberTexture(index);
    });
}

// Starte Timer für Zeitaktualisierung
setInterval(updateTime, 1000);

// Pendelseile erstellen
const strings = pendulums.map((pendulum, index) => {
    return Constraint.create({
        pointA: { x: anchors[index].position.x, y: 80 },
        bodyB: pendulum,
        length: 170,
        stiffness: 0.9,
        render: { strokeStyle: '#FFFFFF' }
    });
});

// Boden erstellen (unsichtbar)
const ground = Bodies.rectangle(200, 480, 410, 60, {
    isStatic: true,
    render: { visible: false }
});

// Angepasste Position für fallende Objekte
function createRandomShape() {
    const x = 100 + Math.random() * 240; // Angepasst an Apple Watch Breite
    const y = 0;
    const size = 20;
    
    const shape = Math.random() > 0.5 
        ? Bodies.circle(x, y, size, {
            render: { fillStyle: '#FFFFFF' },
            restitution: 0.8 // Macht die Objekte "springiger"
        })
        : Bodies.rectangle(x, y, size, size, {
            render: { fillStyle: '#FFFFFF' },
            restitution: 0.8
        });
    
    World.add(world, shape);

    // Entferne Objekte, die unten aus dem Bildschirm fallen
    setTimeout(() => {
        World.remove(world, shape);
    }, 5000);
}

// Tastatursteuerung für Pendel
document.addEventListener('keydown', (event) => {
    const force = 0.015; // Reduzierte Kraft für sanftere Bewegung
    const angle = 0.2; // Winkel für realistischere Schwingung
    
    if (event.key === 'a') {
        // Bewegung nach links mit leichtem Aufwärtsimpuls
        pendulums.forEach(pendulum => {
            Matter.Body.applyForce(pendulum, 
                pendulum.position, 
                { 
                    x: -force * Math.cos(angle), 
                    y: -force * Math.sin(angle) 
                }
            );
        });
    }
    
    if (event.key === 'd') {
        // Bewegung nach rechts mit leichtem Aufwärtsimpuls
        pendulums.forEach(pendulum => {
            Matter.Body.applyForce(pendulum, 
                pendulum.position, 
                { 
                    x: force * Math.cos(angle), 
                    y: -force * Math.sin(angle) 
                }
            );
        });
    }
});

// Füge alle Elemente zur Welt hinzu
World.add(world, [
    ...anchors,
    ...pendulums,
    ...strings,
    ground
]);

// Starte die Simulation
Engine.run(engine);
Render.run(render);

// Formen im Sekundentakt fallen lassen
setInterval(createRandomShape, 1000);