# MyTvRemote Deployment Checklist

1. **Build & QA**
   - Run `npm test` and UI snapshot tests.
   - Execute device-lab validation on Samsung QN90B, LG C3, Roku Ultra, Sony Bravia X90K, Chromecast with Google TV.
   - Capture regression metrics (latency, success rate) for each protocol.

2. **Store Packaging**
   - Generate Android AAB via `eas build --platform android`.
   - Produce iOS archive via Xcode Cloud with release signing certificates.
   - Attach store assets from `docs/assets/store` and update localized metadata.

3. **Compliance**
     - Publish privacy policy (`docs/privacy-compliance.md`) to website.
     - Provide data safety form (Google Play) referencing analytics toggles.
     - Upload SPDX SBOM and third-party notices.

4. **Release Operations**
   - Stage rollout at 10% to monitor crash-free rate > 99.5%.
   - Monitor vendor API quotas; auto-scale proxy infrastructure if necessary.
   - Announce release with onboarding/troubleshooting links.
