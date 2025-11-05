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

### Default: Keyboard Input

- By default, the game uses keyboard control for the “head”.
- Use <kbd>Left</kbd>/<kbd>Right</kbd> arrows or <kbd>A</kbd>/<kbd>D</kbd> to move.
- When idle, the “head” gently wanders to simulate minor movement.

### Camera Mode (Optional)

- Opt into camera control by appending `?input=camera` to the URL, for example:
  - `http://localhost:5173/?input=camera`
- When prompted, allow camera access.

## Head Tracking

The `HeadTracker` class uses TensorFlow.js with the `@tensorflow-models/face-landmarks-detection` (MediaPipe FaceMesh) detector to deliver normalized head position updates to the game. Camera mode is opt-in via `?input=camera`. When head tracking is unavailable (no webcam or permissions denied), the game gracefully falls back to mouse/touch input for paddle control.

### Camera Privacy

- Camera use is opt-in via `?input=camera`.
- All processing runs locally in your browser; nothing is uploaded.
- Click the `Stop Camera` button in the left panel to immediately turn the camera off and switch to keyboard/mouse control.

### Troubleshooting installs (corporate networks / proxies)

- Ensure npm registry uses HTTPS:

  ```powershell
  npm config set registry https://registry.npmjs.org/
  npm config set strict-ssl true
  ```

- If you are behind a proxy, configure it (replace with your proxy):

  ```powershell
  npm config set proxy http://username:password@proxy.company.com:8080
  npm config set https-proxy http://username:password@proxy.company.com:8080
  ```

- Increase fetch timeouts if needed:

  ```powershell
  npm config set fetch-timeout 120000
  npm config set fetch-retry-maxtimeout 120000
  ```

## License

## Scoring

- Each brick awards points based on its row difficulty: bricks near the top are worth more, and lower rows are worth less.
- Minimum brick value is 50 points; top rows scale up to 150 points.

This project is provided as part of a guided coding session and does not currently include a specific license.
