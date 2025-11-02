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
2. Execute the automated test suite:
   ```bash
   npm test
   ```
3. Build TypeScript sources for distribution:
   ```bash
   npm run build
   ```

## Downloading the Repository Archive
If you need to copy the full project without using git, a base64-encoded archive is included alongside the project
directory:

```bash
# from the repository root
base64 -d MyTvRemote/MyTvRemote.tar.gz.base64 > MyTvRemote.tar.gz
tar xzf MyTvRemote.tar.gz
```

The extracted directory mirrors this repository’s contents, producing the `MyTvRemote/` project folder.

## Project Structure
- `MyTvRemote/` – Project root containing:
  - `src/` – Core TypeScript modules for transports, discovery, command dispatch, and vendor integrations.
  - `tests/` – Jest tests covering discovery, command routing, state synchronisation, and vendor fallbacks.
  - `docs/` – Platform requirements, architecture diagrams, onboarding guides, troubleshooting references, and deployment
    collateral including store metadata.

## Interactive TUI
- Start the interactive controller: `npm start`
- Features: list devices, connect selection, and control via keyboard.
- Keys: Up/Down select, Enter connect, `S` powerOn, `P` powerOff, `R` refresh, `Q` quit.
- Entry point: `scripts/tui.js` (built output is used via `dist/`).

## Wi‑Fi Configuration
- Edit `config/wifi.json` to add devices and optional controller base URL.
- Fields:
  - `controllerBaseUrl` – HTTP base for a central controller (optional).
  - `supportedCommands` – e.g., `["powerOn", "powerOff"]`.
  - `devices[]` – `{ id, name, ip, port, metadata }`.
- Behavior:
  - If `controllerBaseUrl` is set, commands POST to `/devices/<id>/commands` on that base.
  - Otherwise a per‑device fallback posts to `http://<ip>:<port>/devices/<id>/commands`.
- Files to review: `scripts/tui.js` and `src/transports/WifiTransportAdapter.ts`.

## Licensing & Compliance
See `docs/privacy-compliance.md` and `docs/protocols-and-requirements.md` for SDK licensing notes and data protection
obligations.
