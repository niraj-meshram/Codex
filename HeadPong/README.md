# HeadPong

An arcade paddle game built with Phaser 3 and TypeScript. Steer the paddle with your head using your webcam (TensorFlow.js face landmarks) or play with keyboard/mouse. Break all bricks without dropping the ball.

**Features**
- Head tracking control using `@tensorflow-models/face-landmarks-detection` (WebGL backend)
- Keyboard and pointer control fallback (A/D or Left/Right, mouse/touch)
- Clean UI panel with score, controls, camera status, and actions
- Responsive playfield with crisp borders, impact bursts, and subtle trail FX
- Lightweight build via Vite; fully static deployable site

**Quick Start**
- Prerequisites: Node.js 18+ and npm
- Install: `npm install`
- Dev server: `npm run dev` then open `http://localhost:5173`

**Controls**
- Move: Left/Right arrows or `A`/`D`
- Start/Restart: `A`
- Restart: `Space` or `Enter`
- Mouse/touch: Move pointer in the playfield to steer when head tracking is off

**Camera Mode (Head Tracking)**
- Start with camera input: open the app with `?input=cam` (also accepts `camera` or `head`), e.g. `http://localhost:5173/?input=cam`
- Grant camera permission when prompted; processing stays on-device
- Stop camera: click the “Stop Camera” button in the left panel

**Theming**
- URL param `?theme=` switches themes: `tesla` (default) or `airbnb`
- Example: `http://localhost:5173/?theme=airbnb` or combine with camera `?input=cam&theme=airbnb`

**Build & Preview**
- Type-check: `npm run typecheck`
- Production build: `npm run build` (outputs to `dist/`)
- Preview local build: `npm run preview`

**Deploy**
- Static hosting: serve the `dist/` folder on any static host
- Optional security headers for Netlify/Cloudflare: see `public/_headers` (enables CSP and camera permission policy)

**Tech Stack**
- Phaser `3.70.x`, TypeScript `5.x`, Vite `5.x`
- TensorFlow.js face landmarks (`@tensorflow-models/face-landmarks-detection`, `@tensorflow/tfjs-*`) for head tracking

**Privacy & Notes**
- Camera frames are processed locally in the browser; no telemetry is sent
- Requires a modern browser with WebGL. Chrome/Edge recommended

