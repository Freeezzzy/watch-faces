// Matter.js Physics Engine
const { Engine, World, Bodies, Body: MatterBody, Events, Mouse, MouseConstraint, Constraint } = Matter;

let engine;
let world;
let walls = [];
let physicsPoints = []; // 61 blaue Punkte für Physik-Simulation (60 für Sekunden->MM, 1 für Minute->HH)
let timePoints = []; // Statische graue Punkte für Zeitanzeige
let targetPositions = []; // Zielpositionen für die 7-Segment-Anzeige

// Gravitationskontrolle mit Pfeiltasten (Motion Sensor Simulation)
let gravityX = 0;
let gravityY = 0;
const gravityStrength = 1.6; // Erhöhte Stärke für noch stärkere Gravitation

// Zeitvariablen
let lastSecond = -1;
let lastMinute = -1;
let lastHour = -1;
let secondCounter = 0;
let minuteCounter = 0;

// 2-Sekunden Fallback für Zeit-Synchronisation
let lastSyncCheck = 0;
const syncCheckInterval = 2000; // Alle 2 Sekunden prüfen

// 7-Segment-Display Muster (true = Segment aktiv)
const segmentPatterns = {
  0: [true, true, true, true, true, true, false],
  1: [false, true, true, false, false, false, false],
  2: [true, true, false, true, true, false, true],
  3: [true, true, true, true, false, false, true],
  4: [false, true, true, false, false, true, true],
  5: [true, false, true, true, false, true, true],
  6: [true, false, true, true, true, true, true],
  7: [true, true, true, false, false, false, false],
  8: [true, true, true, true, true, true, true],
  9: [true, true, true, true, false, true, true]
};

function setup() {
  createCanvas(960, 960);
  
  // Matter.js Engine erstellen
  engine = Engine.create();
  world = engine.world;
  world.gravity.y = 0; // Keine Schwerkraft
  
  // Unsichtbare Wände erstellen
  createWalls();
  
  // 61 blaue Physik-Punkte erstellen (60 für Sekunden->MM, 1 für Minute->HH)
  createPhysicsPoints();
  
  // Statische Zeitanzeige-Positionen berechnen
  calculateTimePositions();
  
  // Initiale Zeitanzeige erstellen
  updateTimeDisplay();
  
  // Initiale Zeit setzen - lastSecond bewusst ANDERS setzen für sofortige Synchronisation
  const now = new Date();
  lastSecond = now.getSeconds() - 1; // Bewusst eine Sekunde früher, damit sofort synchronisiert wird
  lastMinute = now.getMinutes();
  lastHour = now.getHours();
  
  // Initiale Stundenpunkte basierend auf aktueller Minute setzen
  updateHourProgress(now.getMinutes());
  
  // Initiale Minutenpunkte basierend auf aktueller Sekunde SOFORT setzen
  setInitialMinuteProgress(now.getSeconds());
  
  // SecondCounter auf aktuelle Sekunde setzen
  secondCounter = now.getSeconds();
  
  console.log(`Setup abgeschlossen. Aktuelle Zeit: ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);
  console.log(`SecondCounter auf ${secondCounter} gesetzt`);
  console.log(`${now.getMinutes()} Stundenpunkte und ${now.getSeconds()} Minutenpunkte sofort blau gesetzt`);
}

function draw() {
  background(0); // Schwarzer Hintergrund
  
  // Gravitation basierend auf Tasteneingaben aktualisieren
  updateGravity();
  
  // Physics Engine aktualisieren
  Engine.update(engine);
  
  // Prüfen ob sich die Zeit geändert hat
  checkTimeUpdate();
  
  // 2-Sekunden Fallback für Zeit-Synchronisation
  checkTimeSynchronization();
  
  // Prüfen ob Physikpunkte ihre Ziele erreicht haben
  checkArrivals();
  
  // Bewegende Punkte kontinuierlich zum Ziel lenken
  updateMovingPoints();
  
  // Punkte dauerhaft in Bewegung halten
  maintainPointMovement();
  
  // Statische graue Punkte der Zeitanzeige zeichnen
  drawTimeDisplay();
  
  // Physikalisch simulierte blaue Punkte zeichnen
  drawPhysicsPoints();
  
  // Debug-Text oben links anzeigen
  drawDebugInfo();
}

function createWalls() {
  const thickness = 50;
  
  // Obere Wand
  walls.push(Bodies.rectangle(480, -thickness/2, 960, thickness, { isStatic: true }));
  // Untere Wand
  walls.push(Bodies.rectangle(480, 960 + thickness/2, 960, thickness, { isStatic: true }));
  // Linke Wand
  walls.push(Bodies.rectangle(-thickness/2, 480, thickness, 960, { isStatic: true }));
  // Rechte Wand
  walls.push(Bodies.rectangle(960 + thickness/2, 480, thickness, 960, { isStatic: true }));
  
  // Wände zur Welt hinzufügen
  World.add(world, walls);
}

function createPhysicsPoints() {
  // Aktuelle Zeit für korrekte Anzahl Physikpunkte
  const now = new Date();
  const currentSecond = now.getSeconds();
  
  // Berechne korrekte Anzahl: 61 - bereits "verbrauchte" Sekunden
  const pointsToCreate = Math.max(1, 61 - currentSecond);
  
  console.log(`Erstelle ${pointsToCreate} Physikpunkte (61 - ${currentSecond} bereits vergangene Sekunden)`);
  
  for (let i = 0; i < pointsToCreate; i++) {
    let x = random(50, 910);
    let y = random(50, 910);
    
    let point = Bodies.circle(x, y, 4, {
      restitution: 1.0, // Vollständiges Abprallen
      friction: 0,
      frictionAir: 0, // Keine Luftreibung für dauerhafte Bewegung
      density: 0.001
    });
    
    // Zufällige Anfangsgeschwindigkeit
    MatterBody.setVelocity(point, {
      x: random(-3, 3),
      y: random(-3, 3)
    });
    
    physicsPoints.push({
      body: point,
      isActive: true, // Kann für Zeitanzeige verwendet werden
      targetPosition: null,
      isMovingToTarget: false
    });
    
    World.add(world, point);
  }
}

function calculateTimePositions() {
  const digitWidth = 80;
  const digitHeight = 120;
  const digitSpacing = 100;
  const colonWidth = 20;
  
  // Zentrale Position berechnen
  const totalWidth = 4 * digitWidth + 3 * digitSpacing + colonWidth;
  const startX = (960 - totalWidth) / 2 + digitWidth / 2;
  const centerY = 480;
  
  targetPositions = [];
  
  // Positionen für HH:MM berechnen
  const positions = [
    { x: startX, y: centerY }, // Erste Stunde
    { x: startX + digitWidth + digitSpacing, y: centerY }, // Zweite Stunde
    { x: startX + 2 * (digitWidth + digitSpacing) + colonWidth, y: centerY }, // Erste Minute
    { x: startX + 3 * (digitWidth + digitSpacing) + colonWidth, y: centerY } // Zweite Minute
  ];
  
  positions.forEach(pos => {
    targetPositions.push(calculateSegmentPositions(pos.x, pos.y, digitWidth, digitHeight));
  });
}

function calculateSegmentPositions(centerX, centerY, width, height) {
  const segmentPositions = [];
  // VIEL MEHR Punkte pro Segment für dichte Verteilung - besonders für Ziffer "1"
  const minPointsPerSegment = 20; // Mindestens 20 Punkte pro Segment
  
  // 7 Segmente definieren
  const segments = [
    // Segment 0: Oben horizontal
    { startX: centerX - width/2 + 10, startY: centerY - height/2, 
      endX: centerX + width/2 - 10, endY: centerY - height/2 },
    // Segment 1: Rechts oben vertikal
    { startX: centerX + width/2, startY: centerY - height/2 + 10, 
      endX: centerX + width/2, endY: centerY - 10 },
    // Segment 2: Rechts unten vertikal
    { startX: centerX + width/2, startY: centerY + 10, 
      endX: centerX + width/2, endY: centerY + height/2 - 10 },
    // Segment 3: Unten horizontal
    { startX: centerX + width/2 - 10, startY: centerY + height/2, 
      endX: centerX - width/2 + 10, endY: centerY + height/2 },
    // Segment 4: Links unten vertikal
    { startX: centerX - width/2, startY: centerY + height/2 - 10, 
      endX: centerX - width/2, endY: centerY + 10 },
    // Segment 5: Links oben vertikal
    { startX: centerX - width/2, startY: centerY - 10, 
      endX: centerX - width/2, endY: centerY - height/2 + 10 },
    // Segment 6: Mitte horizontal
    { startX: centerX - width/2 + 10, startY: centerY, 
      endX: centerX + width/2 - 10, endY: centerY }
  ];
  
  // Für jedes Segment VIELE Positionen erstellen (für dichte Verteilung)
  segments.forEach(segment => {
    const positions = [];
    
    // Berechne die Länge des Segments
    const segmentLength = Math.sqrt(
      Math.pow(segment.endX - segment.startX, 2) + 
      Math.pow(segment.endY - segment.startY, 2)
    );
    
    // GARANTIERT genug Punkte: mindestens 20 Punkte pro Segment
    // Für kurze Segmente werden die Punkte enger gesetzt
    const numPoints = Math.max(minPointsPerSegment, Math.floor(segmentLength / 3) + 1);
    
    // Punkte gleichmäßig auf Segment verteilen
    for (let i = 0; i < numPoints; i++) {
      const t = numPoints > 1 ? i / (numPoints - 1) : 0;
      const x = lerp(segment.startX, segment.endX, t);
      const y = lerp(segment.startY, segment.endY, t);
      positions.push({ x, y });
    }
    
    segmentPositions.push(positions);
  });
  
  return segmentPositions;
}

function updateTimeDisplay() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  console.log(`Updating time display: ${hours}:${minutes}`); // Debug
  
  timePoints = [];
  
  // Für jede Ziffer die entsprechenden Punkte erstellen
  const digits = [
    parseInt(hours[0]),
    parseInt(hours[1]),
    parseInt(minutes[0]),
    parseInt(minutes[1])
  ];
  
  digits.forEach((digit, digitIndex) => {
    const pattern = segmentPatterns[digit];
    const positions = targetPositions[digitIndex];
    
    // Sammle alle verfügbaren Positionen für aktive Segmente
    let allPositions = [];
    pattern.forEach((isActive, segmentIndex) => {
      if (isActive && positions[segmentIndex]) {
        positions[segmentIndex].forEach(pos => {
          allPositions.push({
            x: pos.x,
            y: pos.y,
            segmentIndex: segmentIndex
          });
        });
      }
    });
    
    // GENAU 30 PUNKTE PRO ZIFFER - GARANTIERT!
    const targetPointCount = 30;
    let selectedPositions = [];
    
    if (allPositions.length >= targetPointCount) {
      // Wenn mehr als 30 Positionen verfügbar: gleichmäßig verteilt auswählen
      for (let i = 0; i < targetPointCount; i++) {
        const index = Math.floor((i * allPositions.length) / targetPointCount);
        selectedPositions.push(allPositions[index]);
      }
    } else if (allPositions.length > 0) {
      // Wenn weniger als 30 Positionen: durch Wiederholung auf GENAU 30 auffüllen
      for (let i = 0; i < targetPointCount; i++) {
        const sourceIndex = i % allPositions.length;
        selectedPositions.push({...allPositions[sourceIndex]}); // Kopie erstellen
      }
    } else {
      console.error(`FEHLER: Keine Positionen für Ziffer ${digit} gefunden!`);
      // Fallback: 30 Punkte auf Standardposition
      for (let i = 0; i < targetPointCount; i++) {
        selectedPositions.push({ x: 100 + digitIndex * 100, y: 480, segmentIndex: 0 });
      }
    }
    
    // SICHERHEITSCHECK: MUSS genau 30 sein!
    if (selectedPositions.length !== targetPointCount) {
      console.error(`KRITISCHER FEHLER: Ziffer ${digit} hat ${selectedPositions.length} statt ${targetPointCount} Punkte!`);
      // Korrigieren: auf genau 30 kürzen oder auffüllen
      if (selectedPositions.length > targetPointCount) {
        selectedPositions = selectedPositions.slice(0, targetPointCount);
      } else {
        while (selectedPositions.length < targetPointCount) {
          selectedPositions.push({...selectedPositions[0]}); // Ersten Punkt wiederholen
        }
      }
    }
    
    // GENAU 30 Punkte für diese Ziffer hinzufügen
    selectedPositions.forEach(pos => {
      timePoints.push({
        x: pos.x,
        y: pos.y,
        isBlue: false, // Startet als grau
        digitIndex: digitIndex,
        segmentIndex: pos.segmentIndex
      });
    });
    
    console.log(`Ziffer ${digit} (Index ${digitIndex}): GENAU ${selectedPositions.length} Punkte erstellt`);
  });
  
  // Doppelpunkt hinzufügen
  const colonX = (960) / 2;
  timePoints.push(
    { x: colonX, y: 460, isBlue: false, isColon: true },
    { x: colonX, y: 500, isBlue: false, isColon: true }
  );
  
  // WICHTIGE ÜBERPRÜFUNG: Genau 122 Punkte total (4×30 + 2 Doppelpunkt)
  const digitPoints = timePoints.filter(p => !p.isColon).length;
  const colonPoints = timePoints.filter(p => p.isColon).length;
  const expectedTotal = 4 * 30 + 2; // 122
  
  console.log(`=== PUNKTZÄHLUNG ===`);
  console.log(`Ziffernpunkte: ${digitPoints}/120 (4 Ziffern × 30)`);
  console.log(`Doppelpunkt: ${colonPoints}/2`);
  console.log(`Gesamt: ${timePoints.length}/${expectedTotal}`);
  
  if (timePoints.length !== expectedTotal) {
    console.error(`❌ FEHLER: Erwartet ${expectedTotal} Punkte, aber ${timePoints.length} erstellt!`);
  } else {
    console.log(`✅ KORREKT: Genau ${expectedTotal} Punkte erstellt!`);
  }
}

function checkTimeUpdate() {
  const now = new Date();
  const currentSecond = now.getSeconds();
  const currentMinute = now.getMinutes();
  const currentHour = now.getHours();
  
  // Sekunden-Update: Minutenpunkte werden blau
  if (currentSecond !== lastSecond) {
    // EXPLOSION ERST: Bei Sekunde 0 (neue Minute) alle Minutenpunkte explodieren lassen
    if (currentSecond === 0) {
      resetMinutePoints(); // Explodiert die Minutenpunkte
      secondCounter = 0;
    } else {
      // Normale Sekunde: Punkt zu Minutenziffern bewegen
      if (secondCounter < 60) {
        movePointToMinuteDisplay();
        secondCounter++;
      }
    }
    
    lastSecond = currentSecond;
  }
  
  // Minuten-Update: Zeitanzeige neu erstellen
  if (currentMinute !== lastMinute) {
    // Einen Physikpunkt zu den Stundenziffern bewegen
    movePointToHourDisplay();
    
    // Zeitanzeige komplett neu berechnen für neue Minute
    updateTimeDisplay();
    secondCounter = 0; // Reset für neue Minute
    
    // Stundenpunkte basierend auf aktueller Minute setzen
    updateHourProgress(currentMinute);
    
    lastMinute = currentMinute;
  }
  
  // Stunden-Update: Zeitanzeige neu erstellen
  if (currentHour !== lastHour) {
    // Stundenpunkte explodieren lassen BEVOR die Zeit aktualisiert wird
    explodeHourPoints();
    
    updateTimeDisplay();
    secondCounter = 0; // Reset für neue Stunde
    minuteCounter = 0; // Reset für neue Stunde
    
    // Bei neuer Stunde: Stundenpunkte basierend auf aktueller Minute setzen
    updateHourProgress(currentMinute);
    
    lastHour = currentHour;
  }
}

function movePointToMinuteDisplay(speedMultiplier = 1.0) {
  // Finde verfügbaren blauen Punkt (der nicht bereits zu einem Ziel unterwegs ist)
  const availablePoint = physicsPoints.find(p => p.isActive && !p.isMovingToTarget);
  if (!availablePoint) {
    console.log("⚠️ Kein verfügbarer Physikpunkt für Minutenziffern gefunden!");
    return;
  }
  
  // Finde nächsten grauen Minutenpunkt (digitIndex 2 oder 3)
  const minutePoints = timePoints.filter(p => 
    !p.isBlue && !p.isColon && (p.digitIndex === 2 || p.digitIndex === 3)
  );
  
  if (minutePoints.length > 0) {
    const targetPoint = minutePoints[0];
    
    console.log(`🎯 Physikpunkt fliegt zu Minutenziffer bei (${targetPoint.x}, ${targetPoint.y})`);
    
    // Punkt zur Zielposition bewegen - Ziffernpunkt wird erst beim Ankommen blau
    movePhysicsPointToTarget(availablePoint, targetPoint.x, targetPoint.y, speedMultiplier);
    
    // Referenz zum Ziffernpunkt speichern, damit er beim Ankommen blau wird
    availablePoint.targetTimePoint = targetPoint;
  } else {
    console.log("⚠️ Kein grauer Minutenpunkt gefunden!");
  }
}

function movePhysicsPointToTarget(physicsPoint, targetX, targetY, speedMultiplier = 1.0) {
  physicsPoint.isMovingToTarget = true;
  physicsPoint.targetPosition = { x: targetX, y: targetY };
  physicsPoint.startTime = millis(); // Startzeit speichern für Timeout-Prüfung
  
  // Den Punkt als "nicht mehr für andere Ziele verfügbar" markieren
  // aber noch aktiv lassen, bis er am Ziel ankommt
  
  // Sehr schnelle, direkte Bewegung zum Ziel
  const currentPos = physicsPoint.body.position;
  const distance = Math.sqrt(
    Math.pow(targetX - currentPos.x, 2) + Math.pow(targetY - currentPos.y, 2)
  );
  
  // Etwas höhere Geschwindigkeit für besseres Timing, mit Multiplikator
  const baseSpeed = 60; // Leicht erhöht von 45 auf 60 für schnellere Ankunft
  const speed = baseSpeed * speedMultiplier;
  const directionX = (targetX - currentPos.x) / distance;
  const directionY = (targetY - currentPos.y) / distance;
  
  MatterBody.setVelocity(physicsPoint.body, {
    x: directionX * speed,
    y: directionY * speed
  });
  
  console.log(`🚀 Physikpunkt startet SCHNELLEN Flug zu Ziel (${targetX}, ${targetY}), Distanz: ${distance.toFixed(1)}px, Speed: ${speed} (${speedMultiplier}x)`);
}

function resetMinutePoints() {
  // Sammle alle blauen Minutenpunkte für Explosion
  const blueMinutePoints = timePoints.filter(point => 
    !point.isColon && point.isBlue && (point.digitIndex === 2 || point.digitIndex === 3)
  );
  
  console.log(`EXPLOSION: ${blueMinutePoints.length} Minutenpunkte explodieren!`); // Debug
  
  // Erstelle explodierende Physikpunkte aus den blauen Minutenpunkten
  blueMinutePoints.forEach(point => {
    explodePointFromDigit(point.x, point.y, point.digitIndex);
    point.isBlue = false; // Punkt wird wieder grau
  });
  
  // Alle noch bewegenden Physik-Punkte sicher entfernen
  const pointsToRemove = [];
  physicsPoints.forEach((point, index) => {
    if (point.isMovingToTarget) {
      World.remove(world, point.body);
      pointsToRemove.push(index);
    }
  });
  
  // Punkte rückwärts aus Array entfernen
  for (let i = pointsToRemove.length - 1; i >= 0; i--) {
    physicsPoints.splice(pointsToRemove[i], 1);
  }
  
  // Falls nicht genug Punkte vorhanden sind, auf 61 auffüllen
  const targetCount = 61;
  while (physicsPoints.length < targetCount) {
    createRandomPhysicsPoint();
  }
  
  console.log(`Nach Explosion und Auffüllung: ${physicsPoints.length} Physikpunkte verfügbar`); // Debug
}

function drawTimeDisplay() {
  timePoints.forEach(point => {
    if (point.isColon) {
      fill(128); // Grauer Doppelpunkt
    } else {
      fill(point.isBlue ? color(0, 100, 255) : 128); // Blau oder grau
    }
    
    noStroke();
    circle(point.x, point.y, 8);
  });
}

function drawPhysicsPoints() {
  physicsPoints.forEach(point => {
    // Nur aktive Punkte zeichnen
    if (point.isActive) {
      // Alle Physikpunkte in blau (sowohl normale als auch bewegende)
      fill(0, 100, 255); // Blau
      noStroke();
      circle(point.body.position.x, point.body.position.y, 8);
    }
  });
}

function maintainPointMovement() {
  physicsPoints.forEach(point => {
    if (point.isActive && !point.isMovingToTarget) {
      const velocity = point.body.velocity;
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      // Wenn der Punkt zu langsam wird, gib ihm neuen Schwung
      if (speed < 0.5) {
        MatterBody.setVelocity(point.body, {
          x: random(-3, 3),
          y: random(-3, 3)
        });
      }
    }
  });
}

function setInitialMinuteProgress(currentSecond) {
  // Die ersten currentSecond Minutenpunkte sofort blau setzen (ohne Animation)
  const minutePoints = timePoints.filter(p => 
    !p.isColon && (p.digitIndex === 2 || p.digitIndex === 3)
  );
  
  // Entsprechend der aktuellen Sekunde blaue Punkte setzen
  for (let i = 0; i < Math.min(currentSecond, minutePoints.length); i++) {
    minutePoints[i].isBlue = true;
  }
  
  console.log(`Initial minute progress: ${currentSecond}/60 blue minute points set`);
}

function updateHourProgress(currentMinute) {
  // Alle Stundenpunkte zurück zu grau setzen
  timePoints.forEach(point => {
    if (!point.isColon && (point.digitIndex === 0 || point.digitIndex === 1)) {
      point.isBlue = false;
    }
  });
  
  // Entsprechend der aktuellen Minute Stundenpunkte blau setzen
  // Bei Minute 0 = 0 blaue Punkte, bei Minute 59 = 59 blaue Punkte
  const hourPoints = timePoints.filter(p => 
    !p.isColon && (p.digitIndex === 0 || p.digitIndex === 1)
  );
  
  // Die ersten currentMinute Punkte blau setzen
  for (let i = 0; i < Math.min(currentMinute, hourPoints.length); i++) {
    hourPoints[i].isBlue = true;
  }
  
  console.log(`Hour progress: ${currentMinute}/60 blue points set`); // Debug
}

function drawDebugInfo() {
  // Zähle blaue Punkte in Stunden- und Minutenziffern
  const hourBluePoints = timePoints.filter(p => 
    !p.isColon && p.isBlue && (p.digitIndex === 0 || p.digitIndex === 1)
  ).length;
  
  const minuteBluePoints = timePoints.filter(p => 
    !p.isColon && p.isBlue && (p.digitIndex === 2 || p.digitIndex === 3)
  ).length;
  
  // Aktuelle Zeit für Referenz
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  // Debug-Text anzeigen - AUSKOMMENTIERT für saubere Anzeige
  /*
  fill(255); // Weiße Schrift
  textSize(16);
  textAlign(LEFT, TOP);
  
  text(`Zeit: ${timeStr}`, 20, 20);
  text(`Stunden (HH): ${hourBluePoints}/60 blau`, 20, 45);
  text(`Minuten (MM): ${minuteBluePoints}/60 blau`, 20, 70);
  text(`Physik-Punkte: ${physicsPoints.filter(p => p.isActive).length}/61 aktiv`, 20, 95);
  text(`Bewegende Punkte: ${physicsPoints.filter(p => p.isMovingToTarget).length}`, 20, 120);
  text(`SecondCounter: ${secondCounter}`, 20, 145);
  
  // Gravitationsanzeige
  if (gravityX !== 0 || gravityY !== 0) {
    fill(0, 255, 100); // Grün für aktive Gravitation
    text(`🌍 Gravitation: (${gravityX.toFixed(2)}, ${gravityY.toFixed(2)})`, 20, 170);
  } else {
    fill(100); // Grau für keine Gravitation
    text(`🌍 Gravitation: Aus`, 20, 170);
  }
  
  // Steuerungshinweise
  fill(200);
  textSize(12);
  text(`Pfeiltasten: Gravitation steuern`, 20, 195);
  */
}



function explodePointFromDigit(pointX, pointY, digitIndex) {
  // Vereinfachte Zentren basierend auf Layout
  const digitWidth = 80;
  const digitSpacing = 100;
  const colonWidth = 20;
  const totalWidth = 4 * digitWidth + 3 * digitSpacing + colonWidth;
  const startX = (960 - totalWidth) / 2 + digitWidth / 2;
  const digitCenterY = 480;
  
  const digitCenterX = [
    startX, // Erste Stunde
    startX + digitWidth + digitSpacing, // Zweite Stunde
    startX + 2 * (digitWidth + digitSpacing) + colonWidth, // Erste Minute
    startX + 3 * (digitWidth + digitSpacing) + colonWidth // Zweite Minute
  ][digitIndex];
  
  // Berechne Richtung vom Ziffernzentrum zum Punkt
  const directionX = pointX - digitCenterX;
  const directionY = pointY - digitCenterY;
  const distance = Math.sqrt(directionX * directionX + directionY * directionY);
  
  // Normalisiere die Richtung
  const normalizedX = distance > 0 ? directionX / distance : random(-1, 1);
  const normalizedY = distance > 0 ? directionY / distance : random(-1, 1);
  
  console.log(`Explodiere Punkt von (${pointX}, ${pointY}) weg von Zentrum (${digitCenterX}, ${digitCenterY}) in Richtung (${normalizedX.toFixed(2)}, ${normalizedY.toFixed(2)})`); // Debug
  
  // Erstelle explodierenden Physikpunkt
  let point = Bodies.circle(pointX, pointY, 4, {
    restitution: 1.0,
    friction: 0,
    frictionAir: 0,
    density: 0.001
  });
  
  // Starke Explosionsgeschwindigkeit in Richtung weg vom Zentrum
  const explosionForce = 15; // Erhöht von 12 auf 15
  MatterBody.setVelocity(point, {
    x: normalizedX * explosionForce,
    y: normalizedY * explosionForce
  });
  
  physicsPoints.push({
    body: point,
    isActive: true,
    targetPosition: null,
    isMovingToTarget: false
  });
  
  World.add(world, point);
  
  console.log(`Physikpunkt erstellt mit Geschwindigkeit (${(normalizedX * explosionForce).toFixed(2)}, ${(normalizedY * explosionForce).toFixed(2)})`); // Debug
}

function createRandomPhysicsPoint() {
  let x = random(50, 910);
  let y = random(50, 910);
  
  let point = Bodies.circle(x, y, 4, {
    restitution: 1.0,
    friction: 0,
    frictionAir: 0,
    density: 0.001
  });
  
  MatterBody.setVelocity(point, {
    x: random(-3, 3),
    y: random(-3, 3)
  });
  
  physicsPoints.push({
    body: point,
    isActive: true,
    targetPosition: null,
    isMovingToTarget: false
  });
  
  World.add(world, point);
}

function explodeHourPoints() {
  // Sammle alle blauen Stundenpunkte für Explosion
  const blueHourPoints = timePoints.filter(point => 
    !point.isColon && point.isBlue && (point.digitIndex === 0 || point.digitIndex === 1)
  );
  
  console.log(`EXPLOSION: ${blueHourPoints.length} Stundenpunkte explodieren!`); // Debug
  
  // Erstelle explodierende Physikpunkte aus den blauen Stundenpunkten
  blueHourPoints.forEach(point => {
    explodePointFromDigit(point.x, point.y, point.digitIndex);
    point.isBlue = false; // Punkt wird wieder grau
  });
  
  // Alle noch bewegenden Physik-Punkte sicher entfernen
  const pointsToRemove = [];
  physicsPoints.forEach((point, index) => {
    if (point.isMovingToTarget) {
      World.remove(world, point.body);
      pointsToRemove.push(index);
    }
  });
  
  // Punkte rückwärts aus Array entfernen
  for (let i = pointsToRemove.length - 1; i >= 0; i--) {
    physicsPoints.splice(pointsToRemove[i], 1);
  }
  
  // Falls nicht genug Punkte vorhanden sind, auf 61 auffüllen
  const targetCount = 61;
  while (physicsPoints.length < targetCount) {
    createRandomPhysicsPoint();
  }
  
  console.log(`Nach Stunden-Explosion und Auffüllung: ${physicsPoints.length} Physikpunkte verfügbar`); // Debug
}

function movePointToHourDisplay() {
  // Finde verfügbaren blauen Punkt (der nicht bereits zu einem Ziel unterwegs ist)
  const availablePoint = physicsPoints.find(p => p.isActive && !p.isMovingToTarget);
  if (!availablePoint) {
    console.log("⚠️ Kein verfügbarer Physikpunkt für Stundenziffern gefunden!");
    return;
  }
  
  // Finde nächsten grauen Stundenpunkt (digitIndex 0 oder 1)
  const hourPoints = timePoints.filter(p => 
    !p.isBlue && !p.isColon && (p.digitIndex === 0 || p.digitIndex === 1)
  );
  
  if (hourPoints.length > 0) {
    const targetPoint = hourPoints[0];
    
    console.log(`🎯 Physikpunkt fliegt zu Stundenziffer bei (${targetPoint.x}, ${targetPoint.y})`);
    
    // Punkt zur Zielposition bewegen - Ziffernpunkt wird erst beim Ankommen blau
    movePhysicsPointToTarget(availablePoint, targetPoint.x, targetPoint.y);
    
    // Referenz zum Ziffernpunkt speichern, damit er beim Ankommen blau wird
    availablePoint.targetTimePoint = targetPoint;
  } else {
    console.log("⚠️ Kein grauer Stundenpunkt gefunden!");
  }
}

function checkArrivals() {
  // Prüfe alle bewegenden Physikpunkte, ob sie ihr Ziel erreicht haben
  const arrivingPoints = [];
  
  physicsPoints.forEach((point, index) => {
    if (point.isMovingToTarget && point.targetPosition) {
      const currentPos = point.body.position;
      const distance = Math.sqrt(
        Math.pow(point.targetPosition.x - currentPos.x, 2) + 
        Math.pow(point.targetPosition.y - currentPos.y, 2)
      );
      
      // Prüfe auf Timeout (länger als 2 Sekunden unterwegs)
      const timeElapsed = millis() - (point.startTime || 0);
      if (timeElapsed > 2000) {
        console.log(`⏰ TIMEOUT: Punkt zu lange unterwegs - direkte Ankunft erzwungen!`);
        
        // Ziffernpunkt sofort blau färben
        if (point.targetTimePoint) {
          point.targetTimePoint.isBlue = true;
          console.log(`🔵 Timeout-Ziffernpunkt wurde blau gefärbt.`);
        }
        
        // Punkt aus Physics World entfernen
        World.remove(world, point.body);
        arrivingPoints.push(index);
      }
      // Normale Ankunft prüfen
      else if (distance <= 80) { // Erhöht von 50 auf 80 für bessere Ankunftserkennung
        console.log(`✅ Physikpunkt angekommen! Distanz: ${distance.toFixed(1)}px`);
        
        // Ziffernpunkt blau färben, falls Referenz vorhanden
        if (point.targetTimePoint) {
          point.targetTimePoint.isBlue = true;
          console.log(`🔵 Ziffernpunkt wurde blau gefärbt.`);
        }
        
        // Punkt aus Physics World entfernen
        World.remove(world, point.body);
        
        // Punkt für Entfernung aus Array markieren
        arrivingPoints.push(index);
      }
    }
  });
  
  // Punkte rückwärts aus Array entfernen (um Indizes nicht zu verschieben)
  for (let i = arrivingPoints.length - 1; i >= 0; i--) {
    physicsPoints.splice(arrivingPoints[i], 1);
  }
  
  if (arrivingPoints.length > 0) {
    console.log(`🗑️ ${arrivingPoints.length} Physikpunkte entfernt. Verbleibend: ${physicsPoints.length}`);
  }
}

function updateMovingPoints() {
  // Kontinuierlich bewegende Punkte zum Ziel lenken
  physicsPoints.forEach(point => {
    if (point.isMovingToTarget && point.targetPosition) {
      const currentPos = point.body.position;
      const targetX = point.targetPosition.x;
      const targetY = point.targetPosition.y;
      
      const distance = Math.sqrt(
        Math.pow(targetX - currentPos.x, 2) + 
        Math.pow(targetY - currentPos.y, 2)
      );
      
      // Geschwindigkeit kontinuierlich zum Ziel ausrichten - etwas schneller
      if (distance > 5) {
        const speed = 50; // Leicht erhöht von 35 auf 50 für besseres Timing
        const directionX = (targetX - currentPos.x) / distance;
        const directionY = (targetY - currentPos.y) / distance;
        
        MatterBody.setVelocity(point.body, {
          x: directionX * speed,
          y: directionY * speed
        });
      }
    }
  });
}

// Gravitation basierend auf Tasteneingaben aktualisieren
function updateGravity() {
  // Gravitation basierend auf Tasteneingaben setzen
  let newGravityX = 0;
  let newGravityY = 0;
  
  // Pfeiltasten-Eingaben prüfen
  if (keyIsDown(UP_ARROW)) {
    newGravityY = -gravityStrength; // Nach oben
  }
  if (keyIsDown(DOWN_ARROW)) {
    newGravityY = gravityStrength; // Nach unten
  }
  if (keyIsDown(LEFT_ARROW)) {
    newGravityX = -gravityStrength; // Nach links
  }
  if (keyIsDown(RIGHT_ARROW)) {
    newGravityX = gravityStrength; // Nach rechts
  }
  
  // Gravitation nur ändern, wenn sie sich geändert hat
  if (newGravityX !== gravityX || newGravityY !== gravityY) {
    gravityX = newGravityX;
    gravityY = newGravityY;
    
    // Matter.js World Gravitation setzen
    world.gravity.x = gravityX;
    world.gravity.y = gravityY;
    
    // Debug-Output
    if (gravityX !== 0 || gravityY !== 0) {
      console.log(`🌍 Gravitation: (${gravityX.toFixed(2)}, ${gravityY.toFixed(2)})`);
    }
  }
}

// 2-Sekunden Fallback System für Sekundenpunkte-Synchronisation
function checkTimeSynchronization() {
  const now = millis();
  
  // Nur alle 2 Sekunden prüfen
  if (now - lastSyncCheck < syncCheckInterval) {
    return;
  }
  
  lastSyncCheck = now;
  
  const currentTime = new Date();
  const currentSecond = currentTime.getSeconds();
  
  // Zähle blaue Punkte in der Minutenanzeige (digitIndex 2 oder 3) = Sekundenpunkte
  const blueSecondPoints = timePoints.filter(p => 
    !p.isColon && p.isBlue && (p.digitIndex === 2 || p.digitIndex === 3)
  ).length;
  
  // Erwartete Anzahl basierend auf aktueller Sekunde
  const expectedSecondPoints = currentSecond;
  
  console.log(`🔄 Sync Check: Sekundenpunkte ${blueSecondPoints}/${expectedSecondPoints} (Zeit: ${currentTime.getHours()}:${currentTime.getMinutes()}:${currentSecond})`);
  
  // Korrigiere Sekundenpunkte falls nötig
  if (blueSecondPoints !== expectedSecondPoints) {
    console.log(`⚠️ Second sync error: ${blueSecondPoints} vs ${expectedSecondPoints} - correcting`);
    
    if (blueSecondPoints < expectedSecondPoints) {
      // Zu wenige blaue Punkte - erstelle neue Physikpunkte mit doppelter Geschwindigkeit
      const needed = expectedSecondPoints - blueSecondPoints;
      console.log(`🚀 Erstelle ${needed} neue Sekundenpunkte mit 2x Geschwindigkeit`);
      
      for (let i = 0; i < needed; i++) {
        setTimeout(() => {
          // Neuen Physikpunkt erstellen
          const newPoint = createNewPhysicsPoint();
          if (newPoint) {
            // Sofort zu Minutenziffer bewegen mit doppelter Geschwindigkeit
            moveNewPointToMinuteDisplay(newPoint, 2.0);
          }
        }, i * 100); // Gestaffelt senden alle 100ms
      }
    } else {
      // Zu viele blaue Punkte - mache überschüssige grau
      const excess = blueSecondPoints - expectedSecondPoints;
      let removed = 0;
      
      console.log(`🔄 Mache ${excess} überschüssige Sekundenpunkte grau`);
      
      // Finde blaue Sekundenpunkte und mache sie grau (von hinten nach vorne)
      const bluePoints = timePoints.filter(p => 
        !p.isColon && p.isBlue && (p.digitIndex === 2 || p.digitIndex === 3)
      );
      
      for (let i = bluePoints.length - 1; i >= 0 && removed < excess; i--) {
        bluePoints[i].isBlue = false;
        removed++;
        console.log(`🔄 Sekundenpunkt bei (${bluePoints[i].x}, ${bluePoints[i].y}) wurde grau gemacht`);
      }
    }
  }
}

// Erstelle einen neuen Physikpunkt für Fallback-System
function createNewPhysicsPoint() {
  let x = random(50, 910);
  let y = random(50, 910);
  
  let point = Bodies.circle(x, y, 4, {
    restitution: 1.0,
    friction: 0,
    frictionAir: 0,
    density: 0.001
  });
  
  // Zufällige Anfangsgeschwindigkeit
  MatterBody.setVelocity(point, {
    x: random(-3, 3),
    y: random(-3, 3)
  });
  
  const physicsPoint = {
    body: point,
    isActive: true,
    targetPosition: null,
    isMovingToTarget: false
  };
  
  physicsPoints.push(physicsPoint);
  World.add(world, point);
  
  console.log(`🆕 Neuer Physikpunkt erstellt bei (${x.toFixed(1)}, ${y.toFixed(1)}) für Fallback-System`);
  
  return physicsPoint;
}

// Bewege einen neuen Physikpunkt direkt zur Minutenziffer
function moveNewPointToMinuteDisplay(physicsPoint, speedMultiplier = 1.0) {
  // Finde nächsten grauen Minutenpunkt (digitIndex 2 oder 3)
  const minutePoints = timePoints.filter(p => 
    !p.isBlue && !p.isColon && (p.digitIndex === 2 || p.digitIndex === 3)
  );
  
  if (minutePoints.length > 0) {
    const targetPoint = minutePoints[0];
    
    console.log(`🎯 Neuer Physikpunkt fliegt zu Minutenziffer bei (${targetPoint.x}, ${targetPoint.y})`);
    
    // Punkt zur Zielposition bewegen - Ziffernpunkt wird erst beim Ankommen blau
    movePhysicsPointToTarget(physicsPoint, targetPoint.x, targetPoint.y, speedMultiplier);
    
    // Referenz zum Ziffernpunkt speichern, damit er beim Ankommen blau wird
    physicsPoint.targetTimePoint = targetPoint;
  } else {
    console.log("⚠️ Kein grauer Minutenpunkt für neuen Physikpunkt gefunden!");
  }
}