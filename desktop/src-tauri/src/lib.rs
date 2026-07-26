#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // Opens external http(s) links (onboarding "Create one", the device-flow "Open GitHub",
    // etc.) in the system browser — the webview itself has no browser and Tauri blocks
    // external navigation. The plugin also injects a click interceptor for target="_blank"
    // links; the app adds a native-only delegated interceptor (src/app.js) for full coverage.
    .plugin(tauri_plugin_opener::init())
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
