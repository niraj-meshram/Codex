# MyTvRemote

MyTvRemote is a modular TypeScript toolkit for building multi-protocol smart TV remotes. It combines discovery, state
management, and command dispatch into a single package with adapters for IR, Bluetooth Low Energy, Wi-Fi, and HDMI-CEC.
The project bundles vendor integrations for Samsung SmartThings, LG webOS, Roku, and Android TV to provide first-class
IP control with configurable fallbacks.

## Highlights
- Unified command dispatcher with profile-driven routing across transport technologies.
- Modular discovery services capable of caching, deduplicating, and enriching device metadata.
- Extensible vendor integration gateway that normalizes SmartThings, webOS, Roku, and Android TV APIs.
- Comprehensive documentation covering platform requirements, architecture, onboarding, and deployment tasks.

## Getting Started
1. Change into the project directory and install dependencies (requires access to the npm registry):
   ```bash
   cd MyTvRemote
   npm install
   ```
2. Run tests (optional):
   ```bash
   npm test
   ```
3. Build TypeScript sources:
   ```bash
   npm run build
   ```
4. Start the simple universal CLI:
   ```bash
   npm start
   ```
   - `S` scan TVs, `C` change Wiâ€‘Fi (via OS), `1..N` connect
   - `P` power toggle, `+`/`-` volume, `H` home, `B` back, `Q` quit

Notes: the app never changes OS network settings. Ensure your laptop and TV are on the same LAN/SSID; disconnect VPNs for discovery.

## Downloading the Repository Archive
If you need to copy the full project without using git, a base64-encoded archive is included alongside the project
directory:

```bash
# from the repository root
base64 -d MyTvRemote/MyTvRemote.tar.gz.base64 > MyTvRemote.tar.gz
tar xzf MyTvRemote.tar.gz
```

The extracted directory mirrors this repositoryâ€™s contents, producing the `MyTvRemote/` project folder.

## Project Structure
- MyTvRemote/ — Project root containing:
  - src/ — Core TypeScript modules (transports, discovery, connectors, command layer, dispatcher, vendors).
  - scripts/ — CLI entry points (simple-ui.js, legacy 	ui.js, demo).
  - config/ — Optional configuration (wifi.json, wifi-preferences.json).
  - 	ests/ — Jest tests covering discovery, command routing, state synchronisation, and vendor fallbacks.
  - docs/ — Platform requirements, architecture, onboarding, troubleshooting, and deployment collateral.
## Simple UI (Universal Remote)
- Start: 
pm start
- Header shows: Wi‑Fi: <ssid> | Connected: <device>
- Keys:
  - S — Scan TVs (SSDP auto‑discovery + optional config)
  - C — Change Wi‑Fi (switch via OS)
  - 1..N — Connect
  - P — Power toggle
  - + / - — Volume up / down
  - H / B — Home / Back
  - Q — Quit
- Entry point: scripts/simple-ui.js
## Wi‑Fi Configuration
- Edit config/wifi.json to add devices and optional controller base URL.
- Fields:
  - controllerBaseUrl — HTTP base for a central controller (optional).
  - supportedCommands — e.g., ["powerOn", "powerOff"].
  - devices[] — { id, name, ip, port, vendor }.
- Behavior:
  - If controllerBaseUrl is set, commands POST to /devices/<id>/commands on that base.
  - Otherwise a per‑device fallback posts to http://<ip>:<port>/devices/<id>/commands.
- Files to review: scripts/simple-ui.js and src/transports/WifiTransportAdapter.ts.

### Preferred Wi‑Fi
- Optional: config/wifi-preferences.json can store a preferred SSID for onboarding hints.
- The app does not modify OS Wi‑Fi; switch networks via your OS Wi‑Fi menu.

### Network Requirements
- Laptop and TV must be on the same LAN/SSID; disconnect VPNs for discovery/control.
- Samsung Tizen typically listens on ws://<tv>:8001 (or wss://<tv>:8002). Enable network standby on the TV for reliable control.
- Corporate SSIDs (e.g., groupinfra.com) often isolate devices; switch to your home SSID (e.g., Slow_Poison).

## Troubleshooting
- Wi‑Fi shows corporate SSID
  - Switch your laptop to the same home SSID as the TV (Slow_Poison), or plug into the same router via Ethernet.
  - On Windows, confirm with 
etsh wlan show interfaces.
- No devices found
  - Ensure laptop and TV are on the same LAN and VPN is off.
  - Press S again; SSDP can take a moment. Some networks block multicast; add your TV in config/wifi.json and rebuild.
- Samsung TV won’t connect
  - Accept the pairing prompt on the TV when first connecting.
  - Enable Network Standby/Wake on LAN/WLAN in TV settings.
  - Test ports: Windows Test-NetConnection <tv-ip> -Port 8001 (or 8002).
- Controls don’t work after connect
  - Try H (home) first; then P (power toggle) and volume keys.
  - If still failing, restart the app and the TV, then reconnect.
- Staying on corporate Wi‑Fi
  - Use a second adapter (USB Wi‑Fi) for the home SSID and add a route for the TV subnet, or use a cloud connector (e.g., SmartThings).
## Licensing & Compliance
See `docs/privacy-compliance.md` and `docs/protocols-and-requirements.md` for SDK licensing notes and data protection
obligations.



