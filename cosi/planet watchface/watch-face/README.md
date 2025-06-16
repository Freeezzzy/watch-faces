# Watch Face Project

This project is an abstract Apple Watch face created using Matter.js and p5.js. It features a unique design with 60 dots representing seconds, along with a digital clock display for minutes and hours. The watch face refreshes every second to accurately reflect the current time.

## Project Structure

```
watch-face
├── src
│   ├── index.html          # Main HTML document for the watch face
│   ├── js
│   │   ├── sketch.js       # p5.js sketch for drawing the watch face
│   │   └── clock.js        # JavaScript for managing the digital clock
│   ├── css
│   │   └── styles.css      # Styles for the watch face
│   └── lib
│       ├── matter.js       # Matter.js library for physics simulations
│       └── p5.js           # p5.js library for creative coding
├── package.json            # npm configuration file
└── README.md               # Documentation for the project
```

## Features

- **60 Dots for Seconds**: The watch face includes 60 dots that represent each second, providing a dynamic visual representation of time passing.
- **Digital Clock**: The current time is displayed in a digital format, showing hours and minutes.
- **Real-Time Updates**: The watch face refreshes every second to ensure the time displayed is accurate.

## Setup Instructions

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Install the necessary dependencies using npm:
   ```
   npm install
   ```
4. Open `src/index.html` in a web browser to view the watch face in action.

## Usage

This project can be used as a creative coding exercise or as a foundation for developing more complex watch face designs. Enjoy experimenting with the code and customizing the watch face to your liking!