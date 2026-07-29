#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Opens external http(s) links (onboarding "Create one", the device-flow "Open GitHub",
    // etc.) in the system browser — the webview itself has no browser and Tauri blocks
    // external navigation. The plugin also injects a click interceptor for target="_blank"
    // links; the app adds a native-only delegated interceptor (src/app.js) for full coverage.
    .plugin(tauri_plugin_opener::init())
    // Native-only fetch bridge (frontend: src/lib/nativeFetch.js). The WKWebView custom-scheme
    // origin (tauri://localhost) cannot complete webview `fetch()` to remote hosts, so the app
    // routes external API calls (GitHub, the AI providers, the device-flow relay) through this
    // Rust HTTP client, which is not subject to CORS or the webview limitation. URLs are scoped
    // to the CSP connect-src hosts in capabilities/default.json.
    .plugin(tauri_plugin_http::init())
    // Native file-export SAVE flow (frontend: src/app.js installNativeDownloadInterceptor).
    // The webview ignores <a download> and won't persist blob:/data: URLs, so the app reads the
    // export bytes and writes them to a user-chosen path: the dialog plugin opens the OS Save
    // panel, the fs plugin writes the bytes (scoped in capabilities/default.json to the user's
    // output dirs — Downloads/Documents/Desktop/Pictures/Movies — never a broad filesystem grant).
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    // Native "Copy" support (frontend: src/app.js installNativeClipboardShim). navigator.clipboard
    // is unavailable on the custom-scheme origin, so copy buttons route through this plugin.
    .plugin(tauri_plugin_clipboard_manager::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
