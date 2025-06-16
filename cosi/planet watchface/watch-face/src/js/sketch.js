let canvas;

function setup() {
    canvas = createCanvas(384, 384);
    canvas.parent('watch-face');
    frameRate(1); // Update every second
}

function draw() {
    background(0);
    translate(width/2, height/2);
    
    let now = new Date();
    let h = now.getHours();
    let m = now.getMinutes();
    let s = now.getSeconds();
    
    // Convert hours and minutes to digits
    let h1 = floor(h/10);
    let h2 = h % 10;
    let m1 = floor(m/10);
    let m2 = m % 10;
    
    // Draw circles from outside to inside
    drawSecondDots(s);
    drawNumberDots(m2, 120); // Minutes ones
    drawNumberDots(m1, 90);  // Minutes tens
    drawNumberDots(h2, 60);  // Hours ones
    drawNumberDots(h1, 30);  // Hours tens
}

function drawSecondDots(currentSecond) {
    let radius = 160;
    for (let i = 0; i < 60; i++) {
        let angle = map(i, 0, 60, -PI/2, TWO_PI-PI/2);
        let x = radius * cos(angle);
        let y = radius * sin(angle);
        
        if (i === currentSecond) {
            fill(255, 215, 0); // Yellow for current second
        } else {
            fill(50); // Grey for other seconds
        }
        noStroke();
        circle(x, y, 3);
    }
}

function drawNumberDots(number, radius) {
    for (let i = 0; i < 10; i++) {
        let angle = map(i, 0, 10, -PI/2, TWO_PI-PI/2);
        let x = radius * cos(angle);
        let y = radius * sin(angle);
        
        if (i === number) {
            fill(255); // White for active number
        } else {
            fill(50); // Grey for inactive
        }
        noStroke();
        circle(x, y, 5);
    }
}