function setup() {
    createCanvas(400, 400);
}

function draw() {
    background(255);
    let hours = nf(hour(), 2);
    let minutes = nf(minute(), 2);
    let seconds = nf(second(), 2);
    
    textSize(48);
    textAlign(CENTER, CENTER);
    fill(0);
    text(hours + ':' + minutes, width / 2, height / 2);
}