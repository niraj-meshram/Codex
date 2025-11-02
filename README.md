
# MyTvRemote Repository

This repository hosts the **MyTvRemote** multi-protocol smart TV remote toolkit. The full project lives inside the
[`MyTvRemote/`](MyTvRemote/) directory to keep the source tree organised when it is embedded in larger workspaces.

## Contents
- [`MyTvRemote/`](MyTvRemote/) – Application source code, documentation, and tests.
- [`MyTvRemote/MyTvRemote.tar.gz.base64`](MyTvRemote/MyTvRemote.tar.gz.base64) – Base64 archive containing a copy of the
  entire project for offline transfer.

## Getting Started
From the repository root:

```bash
cd MyTvRemote
npm install
npm test
```

Additional build and usage guidance is documented in [`MyTvRemote/README.md`](MyTvRemote/README.md).

## Offline Archive Extraction
To reconstruct the project from the bundled archive without using git:

```bash
base64 -d MyTvRemote/MyTvRemote.tar.gz.base64 > MyTvRemote.tar.gz
tar xzf MyTvRemote.tar.gz
```

The extracted tarball recreates the `MyTvRemote/` directory structure described above.
=======
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
1. Install dependencies (requires access to the npm registry):
   ```bash
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
If you need to copy the full project without using git, a base64-encoded archive is included at the repository root:

```bash
# from the project root
base64 -d MyTvRemote.tar.gz.base64 > MyTvRemote.tar.gz
tar xzf MyTvRemote.tar.gz
```

The extracted directory mirrors this repository’s contents.

## Project Structure
- `src/` – Core TypeScript modules for transports, discovery, command dispatch, and vendor integrations.
- `tests/` – Jest tests covering discovery, command routing, state synchronisation, and vendor fallbacks.
- `docs/` – Platform requirements, architecture diagrams, onboarding guides, troubleshooting references, and deployment
  collateral including store metadata.

## Licensing & Compliance
See `docs/privacy-compliance.md` and `docs/protocols-and-requirements.md` for SDK licensing notes and data protection
obligations.
