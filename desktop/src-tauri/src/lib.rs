use tauri_plugin_opener::OpenerExt;

fn browser_url(url: &tauri::Url) -> bool {
  if url.scheme() == "mailto" {
    let raw = url.as_str().to_ascii_lowercase();
    return url.path().contains('@') && !raw.contains("%0a") && !raw.contains("%0d");
  }
  matches!(url.scheme(), "http" | "https")
    && url.has_host() && url.username().is_empty() && url.password().is_none()
}

fn app_url(url: &tauri::Url) -> bool {
  let origin = url.origin().ascii_serialization();
  origin == "https://chapbook.rqai.co.uk"
    || (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
    || matches!(origin.as_str(), "http://tauri.localhost" | "https://tauri.localhost")
    // WKWebView also sends sandboxed iframe documents through this callback.
    // Keep previews inside their opaque-origin sandbox; they have no native IPC.
    || matches!(url.as_str(), "about:blank" | "about:srcdoc")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    // The hosted editor has no remote IPC capability. Do not inject the plugin's
    // click handler: it cancels links before invoking an IPC command the page
    // cannot use. Desktop new-window handling below opens ordinary web links.
    .plugin(tauri_plugin_opener::Builder::new().open_js_links_on_click(false).build())
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
      let navigation_handle = app.handle().clone();
      let config = app.config().app.windows.first().ok_or("Missing main window configuration")?;
      let window = tauri::WebviewWindowBuilder::from_config(app, config)?;
      #[cfg(desktop)]
      let window = {
        let handle = app.handle().clone();
        window
        .on_new_window(move |url, _| {
          if browser_url(&url) {
            if let Err(error) = handle.opener().open_url(url.as_str(), None::<&str>) {
              log::warn!("Could not open browser: {error}");
            }
          }
          tauri::webview::NewWindowResponse::Deny
        })
      };
      window
        .on_navigation(move |url| {
          if app_url(url) { return true; }
          if browser_url(url) {
            if let Err(error) = navigation_handle.opener().open_url(url.as_str(), None::<&str>) {
              log::warn!("Could not open browser: {error}");
            }
          }
          false
        })
        .build()?;
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

#[cfg(test)]
mod tests {
  use super::{browser_url, app_url};
  #[test]
  fn keeps_each_supported_app_origin_inside_the_window() {
    for url in ["tauri://localhost/app/index.html", "http://tauri.localhost/app/index.html", "https://tauri.localhost/app/index.html", "https://chapbook.rqai.co.uk/app/", "about:blank", "about:srcdoc"] {
      assert!(app_url(&url.parse().unwrap()));
    }
    for url in ["https://github.com/login/device", "http://tauri.localhost.example.com/", "tauri://example.com/", "http://localhost:8000/", "https://chapbook.rqai.co.uk.example.com/", "about:srcdoc.evil", "about:config", "data:text/html,test"] {
      assert!(!app_url(&url.parse().unwrap()));
    }
  }
  #[test]
  fn opens_web_links_without_allowing_local_schemes_or_embedded_credentials() {
    for url in ["https://github.com/login/device", "https://example.com/post", "http://localhost:8080/"] {
      assert!(browser_url(&url.parse().unwrap()));
    }
    assert!(browser_url(&"mailto:support@rqai.co.uk?subject=Chapbook%20privacy%20request".parse().unwrap()));
    for url in ["file:///etc/passwd", "javascript:alert(1)", "data:text/html,test", "https://name:secret@example.com/", "mailto:support@rqai.co.uk?subject=bad%0aheader", "mailto:"] {
      assert!(!browser_url(&url.parse().unwrap()));
    }
  }
}
