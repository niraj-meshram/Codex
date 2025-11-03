# HeadPong

HeadPong is a modern twist on the classic brick breaker game that uses real-time head tracking to control the paddle. This project is bootstrapped with Vite, written in TypeScript, and powered by Phaser 3 for rendering and physics.

## Getting Started

### Prerequisites
- Node.js 18+
- A webcam for head tracking
- Modern browser with WebGL support

### Installation

From your repository root (for example `C:\\Users\\niraj.meshram\\Desktop\\OPEN_AI\\Workspace\\Codex`), install the project dependencies:

```powershell
cd C:\\Users\\niraj.meshram\\Desktop\\OPEN_AI\\Workspace\\Codex\\HeadPong
npm install
```

### Development Server

```powershell
npm run dev
```

This launches the Vite development server and automatically opens the game in your default browser.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
HeadPong/
├── index.html
├── package.json
├── src/
│   ├── game/
│   │   ├── config/
│   │   ├── objects/
│   │   └── scenes/
│   ├── input/
│   ├── styles/
│   └── main.ts
└── tsconfig.json
```

- `src/game`: Phaser scenes and game objects.
- `src/input`: Input adapters, including the TensorFlow.js-based head tracker.
- `src/styles`: Global styles applied to the host page.

## Controls

- Keep your head centered in front of the webcam to steer the paddle horizontally.
- When head tracking is unavailable, move the paddle with the mouse or touch input.
- After a win or loss, press <kbd>Space</kbd> (or tap/click) to quickly restart the round.

## Head Tracking

The `HeadTracker` class wraps the TensorFlow.js FaceMesh model to deliver normalized head position updates to the game. When head tracking is unavailable (no webcam or permissions denied), the game gracefully falls back to mouse/touch input for paddle control.

## License

This project is provided as part of a guided coding session and does not currently include a specific license.
