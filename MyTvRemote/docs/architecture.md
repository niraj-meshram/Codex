# MyTvRemote System Architecture

```mermaid
digraph G {
  rankdir=LR;
  subgraph cluster_mobile {
    label="React Native App";
    UI["Presentation Layer\n(React Navigation screens)"];
    State["State Management\n(Redux Toolkit Query + Recoil)"];
    Dispatcher["Command Dispatcher"];
    Discovery["Discovery Service"];
    UI -> State -> Dispatcher -> Discovery;
    UI -> Dispatcher;
  }

  Dispatcher -> Transports["Transport Adapters\n(IR/BLE/Wi-Fi/HDMI-CEC)"];
  Dispatcher -> VendorGateway["Vendor Integration Service"];
  VendorGateway -> VendorAPIs["Vendor APIs\n(SmartThings, webOS, Roku, Android TV)"];
  Transports -> Devices["Target Devices"];
  VendorAPIs -> Devices;
  Discovery -> Telemetry["Device Cache & Analytics"];
}
```

## Layered Components
- **Presentation:** React Native screens using React Navigation; atomic design with reusable control widgets.
- **State:** Redux Toolkit Query manages asynchronous vendor/transport queries; Recoil handles ephemeral UI (modals, pairing flows).
- **Domain:** Command dispatcher, command profiles, automation rules.
- **Infrastructure:** Transport adapters, vendor API clients, discovery service with diff/caching logic, secure storage wrappers.

# UX Wireframes

```mermaid
digraph UX {
  rankdir=LR;
  Home["Home Screen\n- Device tiles\n- Quick actions"];
  Device["Device Detail\n- Live status\n- Command pad"];
  Scenes["Scenes\n- Automations\n- Scheduling"];
  Settings["Settings\n- Protocol setup\n- Vendor logins"];
  Onboarding["Onboarding\n- Discovery wizard\n- Permission prompts"];

  Home -> Device -> Scenes;
  Home -> Settings;
  Onboarding -> Home;
}
```

- **Home:** Grid of paired devices with status badges (online/offline, protocol).
- **Device Detail:** Tabbed layout with command pad (power, volume), app launch shortcuts, and source switching.
- **Scenes:** Compose macros with drag-and-drop timeline; highlight compatibility per protocol.
- **Settings:** Manage vendor accounts, assign IR profiles, configure HDMI-CEC bridging.
- **Onboarding:** Guided permission requests for BLE, Wi-Fi, IR accessory calibration.

# Framework Selections
- **Navigation:** React Navigation v7 (stack for onboarding, tab for main app).
- **State management:** Redux Toolkit Query for asynchronous device/vender state; Recoil for transient UI states (toasts, dialogs).
- **Form handling:** React Hook Form with Zod validation for command mapping editors.
- **Theming:** Styled Components for dynamic theming and TV brand color accents.
