# MyTvRemote

MyTvRemote is a modular TypeScript toolkit for building multi‑protocol smart TV remotes. It combines discovery, state management, and command dispatch with adapters for IR, Bluetooth Low Energy, Wi‑Fi/IP, and HDMI‑CEC. First‑party vendor clients are included for Samsung Tizen/SmartThings, LG webOS, Roku ECP, and Android TV.

## Highlights
- Unified command dispatcher with profile‑driven routing across protocols.
- Pluggable discovery service with caching and metadata enrichment.
- Vendor integration layer normalizing SmartThings, webOS, Roku, and Android TV.
- CLI demos for quick local control, plus comprehensive docs under `docs/`.

## Requirements
- Node.js 18+ and npm
- Same LAN/SSID as target TVs; VPNs can block discovery

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build TypeScript sources (populates `dist/` used by CLI scripts):
   ```bash
   npm run build
   ```
3. (Optional) Run tests:
   ```bash
   npm test
   ```
4. Launch the simple universal CLI:
   ```bash
   npm start
   ```
   Keys: `S` scan, `C` change Wi‑Fi (via OS), `1..N` connect, `P` power, `+/-` volume, `H` home, `B` back, `Q` quit.

Notes: The app never changes OS network settings. Ensure your machine and TV are on the same LAN/SSID; disconnect VPNs for discovery/control.

## Scripts
- `npm run build` — Compile TypeScript to `dist/`.
- `npm test` — Run Jest test suite from `tests/`.
- `npm start` — Run the simple CLI (`scripts/simple-ui.js`). Build first.
- `npm run demo` — Run `scripts/demo.js` sample flows.
- Optional TUI: `node scripts/tui.js` after a build.

## Project Structure
- `src/` — Core TypeScript modules: transports, discovery, connectors, command layer, dispatcher, vendors.
- `scripts/` — CLI entry points (`simple-ui.js`, `tui.js`, `demo.js`).
- `config/` — Optional runtime config (`wifi.json`, `wifi-preferences.json`).
- `tests/` — Jest tests for discovery, routing, and vendor fallbacks.
- `docs/` — Architecture, onboarding, troubleshooting, protocols, deployment, privacy.

## Configuration (Wi‑Fi/IP)
If you have a local controller or IP‑controllable devices, create `config/wifi.json`:

```json
{
  "controllerBaseUrl": "http://controller.local:3000", // optional
  "supportedCommands": ["powerOn", "powerOff", "volumeUp", "volumeDown", "mute", "home", "back"],
  "devices": [
    { "id": "tv-samsung-1", "name": "Living Room", "ip": "192.168.1.20", "port": 8001, "vendor": "samsung-tizen" },
    { "id": "roku-ultra",   "name": "Roku",         "ip": "192.168.1.30", "port": 8060, "vendor": "roku" }
  ]
}
```

Behavior:
- If `controllerBaseUrl` is set, commands are POSTed to `/devices/<id>/commands` on that base.
- Otherwise, a per‑device fallback posts to `http://<ip>:<port>/devices/<id>/commands`.

Related code: `scripts/simple-ui.js`, `scripts/tui.js`, and `src/transports/WifiTransportAdapter.ts`.

### Preferred Wi‑Fi (Optional)
Create `config/wifi-preferences.json` to store a preferred SSID for onboarding hints. The app does not modify OS Wi‑Fi; switch networks via your OS Wi‑Fi menu.

## Vendor Integrations
- Samsung Tizen (WebSocket 8001/8002). Enable Network Standby/Wake‑on‑LAN on the TV and accept the pairing prompt.
- LG webOS (pairing over LAN). Ensure “Mobile TV On” or equivalent setting is enabled.
- Roku ECP (HTTP 8060). Enable network access in Roku system settings.
- Android TV / Bravia. Pair once, then issue IRCC/IP commands.

See `docs/protocols-and-requirements.md` for capabilities, platform constraints, and licensing notes.

## Troubleshooting (Quick)
- No devices found: Ensure same LAN/SSID, disable VPN, press `S` again. Some routers block multicast; add devices in `config/wifi.json` and rebuild.
- Samsung won’t connect: Accept on‑TV pairing; confirm ports 8001/8002; enable Network Standby.
- Controls unresponsive: Try `H` (home), then `P` (power). If still failing, restart the app and TV, then reconnect.
- Corporate Wi‑Fi: Use a home SSID or secondary adapter; or route via a controller/SmartThings.

For deeper guidance, see `docs/onboarding/troubleshooting.md`.

## Testing & Linting
- Tests: `npm test` (Jest, config in `jest.config.js`).
- Lint: `npm run lint` (ESLint + Prettier config).

## Privacy & Compliance
Review `docs/privacy-compliance.md` and `docs/protocols-and-requirements.md` for data handling, permissions, and SDK licensing obligations. Deployment notes live in `docs/deployment.md`.

## License
MIT (see `package.json`).

