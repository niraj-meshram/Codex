# MyTvRemote Target Device Protocols and Platform Requirements

## Infrared (IR)
- **Use cases:** Legacy televisions, fallback control paths when IP/BLE connectivity fails.
- **Hardware requirements:** Smartphone accessory IR blaster or bridge (e.g., Broadlink RM4); ensure carrier frequency 38 kHz with configurable duty cycles.
- **Software stack:** LIRC-compatible code database and encoder capable of NEC, RC5/6, Samsung32, and proprietary formats.
- **Platform considerations:** Android devices require Consumer IR permission (`android.permission.TRANSMIT_IR`). iOS lacks native IR hardware; rely on external accessories via BLE/Wi-Fi bridges.
- **Security:** Limited; enforce app-level confirmation flows before enabling macro automation.
- **SDK/licensing:** LIRC database (GPL-2.0) incompatible with closed-source redistribution; prefer GlobalCache Control Tower (commercial) or develop first-party capture workflow.

## Bluetooth Low Energy (BLE)
- **Use cases:** Modern TVs (Samsung 2021+, LG ThinQ) and streaming sticks supporting BLE remote pairing.
- **Hardware requirements:** BLE 4.0+ radio with GATT Central role; background scanning support for Android (API 21+) and iOS (CoreBluetooth).
- **Software stack:** Custom GATT service drivers exposing media control characteristics; maintain secure pairing tokens in device keychain/Keystore.
- **Platform considerations:** iOS requires usage descriptions in `Info.plist`; Android 12+ mandates `BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` runtime permissions.
- **Security:** Use LE Secure Connections with passkey/Just Works as provided by OEMs; rotate pairing keys when device ownership changes.
- **SDK/licensing:** Samsung BLE Remote SDK (Samsung Partner Program, proprietary), LG ThinQ BLE specs available under NDA. Ensure compliance before bundling.

## Wi-Fi / IP
- **Use cases:** Primary path for SmartThings, Roku ECP, LG webOS, Android TV (Sony Bravia) integrations.
- **Hardware requirements:** Dual-band Wi-Fi 802.11n+ with multicast discovery (mDNS/SSDP) support.
- **Software stack:** REST, WebSocket, and SOAP/JSON-RPC clients; TLS 1.2+ recommended. Provide fallback local network discovery via SSDP/mDNS.
- **Platform considerations:** Background network scanning restricted on iOS; use user-triggered discovery. Android 13 requires `NEARBY_WIFI_DEVICES` permission.
- **Security:** Store OAuth tokens in secure storage; prompt user for LAN discovery consent to comply with privacy guidelines.
- **SDK/licensing:**
  - **Samsung SmartThings:** Developer Workspace Terms; OAuth client requires commercial app review.
  - **LG webOS Connect:** webOS Signage/webOS OCF licensing; access via LG Developer Program.
  - **Roku ECP:** Public, royalty-free; abide by [Roku External Control Protocol](https://developer.roku.com/docs/developer-program/dev-tools/external-control-api.md).
  - **Android TV:** Sony/Google Remote Control API under device-specific license; IRCC endpoints accessible post user pairing.

## Platform Strategy
- **Primary app platform:** React Native (Android + iOS) with optional desktop companion via Electron.
- **State management:** Redux Toolkit Query for transport/vendored state, Recoil for UI session data.
- **Navigation:** React Navigation v7 (stack + bottom-tabs) to support quick access to device groups and automation scenes.
- **Device matrix:** Validate on Samsung QN90B, LG C3, Roku Ultra, Chromecast with Google TV, Sony Bravia X90K.

## SDK Licensing Implications
- Evaluate compatibility with MIT app license; encapsulate GPL/LGPL components via service boundary.
- Establish vendor-partner agreements (Samsung, LG) before distribution.
- Provide optional user-supplied API keys to reduce redistribution liability.
- Maintain audit trail of open-source dependencies (SPDX SBOM) before store submission.
