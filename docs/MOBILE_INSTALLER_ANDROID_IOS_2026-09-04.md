# PSP Mobile Installer — Android + iOS — 2026-09-04

## Goal

Provide a clear, safe, production-grade PSP installation experience across Android and iPhone/iPad without creating duplicate PSP identities or weakening the existing PSP web security model.

## Android

Implementation branch: `feat/android-apk-installer-2026-09-04`  
PR: #29 `feat: add real Android APK installer for PSP`

Current implementation:

- stable Android application ID: `ph.org.psp.mobile`;
- Android Browser Helper / Trusted Web Activity wrapper targeting the canonical PSP origin;
- minSdk 26;
- targetSdk 35;
- compileSdk 36;
- Android Gradle Plugin 8.9.1;
- Gradle 8.11.1;
- API 36 / Build Tools 36 CI build;
- HTTPS-only canonical PSP host;
- Android installer CI validates package/version/launchable activity and uploads an unsigned release artifact.

CI history:

1. Initial Android CI failed because `yes | sdkmanager --licenses` returned SIGPIPE under `set -o pipefail` after sdkmanager completed. The redundant pipeline was removed.
2. Next Android CI reached Gradle but failed `checkReleaseAarMetadata` because Android Browser Helper dependencies required compileSdk 36 and Android Gradle Plugin 8.9.1+ while the project used compileSdk 35 / AGP 8.7.3.
3. The exact cause was fixed by moving to compileSdk 36, AGP 8.9.1, Gradle 8.11.1, and Build Tools 36.0.0.
4. Android Installer CI run `33890120295` on exact head `6e2b2906846d5238773b234b77bd6ecf678e88e4` **PASSED** and produced artifact `psp-android-unsigned-release`.
5. PSP application CI run `33890120279` on the same exact head **PASSED** all application/runtime/security/dependency-audit gates.

Production Android installer remains **OPEN** until all of these are complete:

- create/use a stable release signing key stored in an approved secret store;
- sign the APK with that stable production key;
- preserve the same package ID and signing certificate for all future updates;
- publish the signed APK from `psp.hoahub.tech`;
- publish `.well-known/assetlinks.json` using the exact public SHA-256 signing certificate fingerprint;
- verify signed APK package identity and signature;
- add production smoke for the downloadable APK headers/integrity;
- perform a physical Android install/update test;
- merge only an exact head where both Android Installer CI and PSP CI pass.

The Android signing private key/keystore must never be committed to this public repository or exposed in logs/chat/browser content.

## iPhone / iPad

Current supported PSP iOS distribution is the installable PWA/Home Screen app.

Implemented compatibility:

- existing web manifest and service worker remain the canonical mobile web runtime;
- stable web app manifest ID remains `/`;
- root metadata has `appleWebApp.capable=true`, standalone black-translucent status bar behavior and PSP title;
- root metadata explicitly declares Apple app-icon metadata;
- `/install` detects iPhone/iPad and presents an iOS-specific installation action/instructions;
- Safari flow: **Share → Add to Home Screen → Add**;
- standalone detection recognizes an already installed Home Screen app;
- safe-area viewport behavior remains enabled through `viewportFit: cover`;
- iPhone/iPad uses the same PSP account, member record, Digital ID, payments, certificates, chapter data and backend as Android/web.

Apple does not permit a normal website to silently install an unsigned `.ipa`. A native iOS package therefore requires Apple Developer signing and an Apple-approved distribution channel such as TestFlight or the App Store (or another applicable Apple-approved provisioning route).

Until Apple Developer signing/distribution is configured, the iPhone/iPad production installer is the supported Safari Home Screen PWA. The website must not present a fake or broken IPA download.

Remaining iOS acceptance:

- physical iPhone Safari Add-to-Home-Screen test;
- physical iPad Safari Add-to-Home-Screen test;
- standalone launch/safe-area verification;
- representative authenticated Member flow on iOS;
- real Face ID/Touch ID/passkey validation where supported.

## Cross-platform invariants

- Android and iOS installations share the same PSP backend and do not create duplicate member accounts.
- Web authentication, secure cookies, CSRF/origin checks, RBAC, chapter isolation, payment controls and audit rules remain server-enforced.
- No installer may embed or bypass member credentials.
- Financial writes require live connectivity.
- Native packaging must not duplicate PSP business logic; it is a controlled presentation/distribution layer around the canonical PSP service.
