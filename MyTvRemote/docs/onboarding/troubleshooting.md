# MyTvRemote Troubleshooting Guide

## Discovery Issues
- **No devices found on Wi-Fi:** Ensure mobile device and TV share subnet; disable VPN; confirm SSDP/mDNS allowed on router.
- **BLE pairing fails:** Reset remote pairing mode, toggle Bluetooth, and retry within 2 meters.
- **IR commands unreliable:** Recalibrate IR blaster distance; verify correct brand profile selected.

## Command Execution
- **SmartThings API errors:** Re-authenticate account; check SmartThings status page for outages.
- **LG webOS command rejected:** Confirm TV is on same network and "Mobile TV On" setting enabled.
- **Roku not responding:** Toggle "Enable network access" in Roku settings > System > Advanced.

## State Synchronization
- **Device status stale:** Trigger manual refresh; ensure background app refresh enabled; verify power-saving exclusions on Android.
- **Scenes out of sync:** Re-run scene test harness and confirm fallback IR macro works offline.

## HDMI-CEC Fallback
- Enable CEC on TV (Samsung Anynet+, LG Simplink, Sony Bravia Sync).
- Use included HDMI-CEC bridge accessory for devices lacking native support.

## Support
- Submit logs via Settings > Help > Send Diagnostics.
  - Email support@mytvremote.app with device model, firmware version, and issue description.
