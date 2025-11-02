# MyTvRemote Onboarding Guide

1. **Welcome & Account Setup**
   - Offer sign-in with Apple/Google or email.
   - Prompt for optional cloud sync to enable multi-device command history.

2. **Permission Requests**
   - Sequentially ask for Wi-Fi, Bluetooth, and Local Network permissions with context-specific microcopy.
   - Provide alternate path for IR-only mode without network access.

3. **Device Discovery Wizard**
   - Step 1: Scan local network (SSDP/mDNS) for IP-compatible TVs.
   - Step 2: BLE scan for advertising remotes; show signal strength to help pick correct device.
   - Step 3: Offer IR profile selection by brand/model with search.

4. **Vendor Account Linking**
   - Launch SmartThings OAuth in webview; store refresh token securely.
   - Provide QR pairing for LG webOS and Android TV (display code entry instructions).
   - Validate Roku ECP by sending a volume mute test; request user confirmation.

5. **Command Mapping Customization**
   - Preload default mapping by vendor; allow user to override actions per button.
   - Offer macros (e.g., "Movie Night" scene) with fallback IR command chain if IP call fails.

6. **Tutorial & Tips**
   - Interactive overlay explaining command pad, scenes, automation scheduler.
   - Link to troubleshooting page and privacy controls.
