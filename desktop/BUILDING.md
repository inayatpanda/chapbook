# Native launch-test builds

Build the web app, stage its speech and emoji assets, then run `node scripts/stage-native-assets.mjs` from the repository root. Native releases contain a snapshot of those assets; a web deployment does not update installed apps. Use `tauri.bundle-local.conf.json` for distribution builds.

## iOS with Xcode 27

The bundle-local configuration requires iOS 15 or newer. Generate the Xcode project through `npm run tauri -- ios init` from `desktop/`, so its build phase uses the same npm entry point.

For an Apple Silicon simulator build, from `desktop/`:

```sh
PATH="$(pwd)/../scripts/native-toolchain:$PATH" npm run tauri -- ios build \
  --config src-tauri/tauri.bundle-local.conf.json --target aarch64-sim --no-sign --ci
```

The process-scoped Swift wrapper selects SwiftPM's native backend. Xcode 27's default backend otherwise overrides the iOS flags passed by swift-rs with the Mac SDK. It does not modify Xcode or the shared Cargo registry.

Before repeating a simulator build, move the previous `src-tauri/gen/apple/build/arm64-sim/Chapbook.app` into a dated recovery directory. Tauri otherwise can finish compiling the new archive but fail when moving it over the existing non-empty output bundle. Check the bundle version before installation; a rename error leaves the previous output in place. The newly compiled bundle is under `src-tauri/gen/apple/build/app_iOS.xcarchive/Products/Applications/Chapbook.app`.

`src-tauri/Info.ios.plist` is the durable source of the scene configuration and camera, photo and microphone usage descriptions. Do not edit generated plist files. The scene manifest is required for launch when built with the iOS 27 SDK. The vendored Tao backport fixes the lifetime of the scene configuration returned to UIKit; see `vendor/tao/CHAPBOOK-PATCH.md` for the upstream change and removal condition.

A successful build is not a successful launch. Install on a simulator, open the app, accept the approved test terms, and exercise activation, draft recovery and file operations. Physical-device checks and distribution signing remain separate checks.

## Desktop and Android

The `desktop-release.yml` workflow builds a signed/notarized universal Mac DMG and a Windows installer as a draft release. Verify the exact downloaded assets before publishing. Windows remains unsigned unless a Windows signing certificate is configured.

For Android, use the installed SDK/NDK and `npm run tauri -- android build --config src-tauri/tauri.bundle-local.conf.json --target aarch64 --apk --ci`. Sign the generated APK with the existing release keystore without printing its password; verify the certificate fingerprint before an in-place upgrade. An emulator run does not replace a physical-device check.
