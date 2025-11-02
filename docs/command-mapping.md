# MyTvRemote Command Mapping Strategy

## Unified Command Schema
- Core verbs: `powerOn`, `powerOff`, `volumeUp`, `volumeDown`, `mute`, `launchApp:<id>`, `inputSwitch:<source>`.
- Parameters stored as key-value pairs to accommodate vendor-specific payloads.

## User Configuration
1. Base command profile derived from vendor capability matrix.
2. User overrides stored per device; fallback to IR/CEC command sequence if vendor call fails.
3. Macros executed sequentially with per-step timeout and retry count.

## Conflict Resolution
- Priority order: Vendor API -> Wi-Fi transport -> Bluetooth -> HDMI-CEC -> IR.
- Dispatcher consults command profile and command history to avoid loops.

## Extensibility
- Developers can register new commands by extending `CommandProfile` and providing protocol handlers.
- Scenes reference commands by ID, enabling cross-protocol automation.
