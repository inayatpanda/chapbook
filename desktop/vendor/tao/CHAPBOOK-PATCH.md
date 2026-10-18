# Temporary Tao 0.35.3 iOS backport

Source: crates.io tao 0.35.3, with its upstream licence retained.
Only source change: `src/platform_impl/ios/view.rs`, replace `Retained::as_ptr(&config)` with `Retained::autorelease_ptr(config)`.
This backports upstream https://github.com/tauri-apps/tao/commit/f2163508 (#1245), preventing a released scene configuration from being returned to UIKit.
Tauri 2.11 uses Tao 0.35; Tao 0.36+ changes Android lifecycle APIs, so changing the dependency's minor version alone is not compatible.
Remove this vendored patch when the stable Tauri runtime consumes the fixed Tao release. Do not patch the shared Cargo registry.
