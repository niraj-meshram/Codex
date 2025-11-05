# Codex Workspace

This repository is my Codex working space - a terminal-first coding environment where I keep multiple, self-contained projects under one roof. It's optimized for exploring code, applying focused patches, running scripts/tests, and iterating quickly with Codex.

**What this is**
- A multi-project sandbox for everyday development with Codex
- Each project has its own README, scripts, and dependencies
- Changes are made via concise patches and verified locally with runs/tests

**Prerequisites**
- Node.js 18+ and npm
- Git (optional: GitHub CLI `gh` for PRs)

**Repository layout**
- `HeadPong/`: Phaser + TypeScript browser game with optional head tracking. See `HeadPong/README.md`.
- `MyTvRemote/`: Multi-vendor smart TV remote toolkit (TypeScript/Node). See `MyTvRemote/README.md`.
- `README.md`: This overview of the Codex workspace.

**Projects**
- HeadPong
  - What: A small arcade-style Pong built with Phaser + TypeScript; includes optional head-tracking input.
  - Quickstart:
    - `cd HeadPong`
    - `npm install`
    - `npm run dev` (pass `--port 5175` if the default port is busy)
  - Notes: See `HeadPong/README.md` and `HeadPong/public/_headers` for recommended security headers if deploying.
- MyTvRemote
  - What: Modular TypeScript toolkit for multi-protocol smart TV control (IR, BLE, Wi-Fi, HDMI-CEC) with vendor integrations (Samsung Tizen/SmartThings, LG webOS, Roku, Android TV).
  - Quickstart:
    - `cd MyTvRemote`
    - `npm install`
    - `npm test` (optional)
    - `npm run build`
    - `npm start` (simple CLI: scan/connect and basic controls)
  - Notes: See `MyTvRemote/README.md` for configuration, architecture, onboarding, troubleshooting, and deployment docs.

**Working with Codex**
- Plan -> Patch -> Run:
  - Describe goals/constraints in the terminal.
  - Let Codex propose a short plan and apply focused patches.
  - Run scripts/tests locally (for example `npm run dev`, `npm test`) and iterate.
- Approvals & sandboxing:
  - Reads and non-destructive commands run directly.
  - Writes, long-running tasks, or network operations may require approval depending on policy.
  - If network is restricted, Codex prepares changes; push/PR locally when ready.

**Add a new project**
- Create a folder at the repo root (for example, `NewApp/`).
- Add `package.json`, scripts, and a `README.md`.
- Prefer Vite/Phaser for web games or plain TS/Node for CLIs/services.
- Keep commits small and scoped; open a focused PR.

**Troubleshooting**
- Busy dev ports: pass an alternate port (for example, `--port 5175`).
- Corporate networks: configure npm proxy/`strict-ssl` as needed.
- If Codex can't push/PR due to network policy, run `git push`/`gh pr create` locally.

**License**
- Unless a sub-project states otherwise, this workspace is provided for learning/demonstration without a specific license.
