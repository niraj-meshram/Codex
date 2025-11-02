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
