# MyTvRemote Privacy & Compliance Overview

## Data Collection
- Device identifiers (TV name, IP, BLE address) stored locally and optionally synced to user cloud account.
- OAuth tokens for vendor services encrypted via platform keystore.
- Diagnostic logs (command success, latency) anonymized and opt-in.

## User Consent
1. Provide just-in-time prompts explaining why BLE/Wi-Fi permissions are required.
2. Offer privacy dashboard to revoke vendor connections and clear device cache.
3. Default analytics to opt-in with clear benefit description; record consent timestamp.

## Regulatory Alignment
- **GDPR/UK GDPR:** Support data export/delete within 30 days; document processors (AWS, Firebase).
- **CCPA/CPRA:** Provide Do Not Sell toggle; avoid sharing vendor tokens with third parties.
- **COPPA:** App marketed to adults; gate onboarding with age confirmation.

## Security Controls
- Pin-sensitive actions (factory reset, remote automation) behind biometric auth.
- Use certificate pinning for SmartThings/Android TV endpoints.
- Run dependency vulnerability scans (GitHub Dependabot, npm audit) prior to releases.

## Incident Response
- 24-hour acknowledgement SLA, 72-hour full disclosure.
- Maintain breach runbook covering token revocation and forced logout procedures.
