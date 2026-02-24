#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem, Submenu};
use tauri::{Emitter, Manager};

const OLLAMA_ADDR: &str = "127.0.0.1:11434";
const OLLAMA_CONNECT_TIMEOUT_MS: u64 = 800;
const OLLAMA_BOOT_WAIT_RETRIES: u8 = 20;
const OLLAMA_BOOT_WAIT_INTERVAL_MS: u64 = 500;

fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let file_new = MenuItem::with_id(app, "file_new", "New", true, Some("CmdOrCtrl+N"))?;
    let file_open = MenuItem::with_id(app, "file_open", "Open", true, Some("CmdOrCtrl+O"))?;
    let file_save = MenuItem::with_id(app, "file_save", "Save", true, Some("CmdOrCtrl+S"))?;
    let file_quit = MenuItem::with_id(app, "file_quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

    let view_preview =
        MenuItem::with_id(app, "view_preview", "Preview", true, Some("CmdOrCtrl+M"))?;
    let view_markdown = MenuItem::with_id(app, "view_markdown", "Markdown", true, None::<&str>)?;
    let view_pin_top =
        MenuItem::with_id(app, "view_pin_top", "Pin to Top", true, Some("CmdOrCtrl+T"))?;
    let about_show = MenuItem::with_id(app, "about_show", "About Ghost Writer", true, None::<&str>)?;

    let file_menu =
        Submenu::with_items(app, "File", true, &[&file_new, &file_open, &file_save, &file_quit])?;
    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[&view_preview, &view_markdown, &view_pin_top],
    )?;
    let about_menu = Submenu::with_items(app, "About", true, &[&about_show])?;

    Menu::with_items(app, &[&file_menu, &view_menu, &about_menu])
}

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn save_markdown_file(content: String, suggested_name: String) -> Result<Option<String>, String> {
    let safe_name = if suggested_name.trim().is_empty() {
        "untitled.md".to_string()
    } else if suggested_name.to_lowercase().ends_with(".md") {
        suggested_name
    } else {
        format!("{suggested_name}.md")
    };

    let selected_path: Option<PathBuf> = rfd::FileDialog::new()
        .set_file_name(&safe_name)
        .add_filter("Markdown", &["md"])
        .save_file();

    let Some(path) = selected_path else {
        return Ok(None);
    };

    fs::write(&path, content).map_err(|error| error.to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

fn parse_ollama_addr() -> Option<SocketAddr> {
    OLLAMA_ADDR.parse().ok()
}

fn is_ollama_running() -> bool {
    let Some(addr) = parse_ollama_addr() else {
        return false;
    };
    TcpStream::connect_timeout(&addr, Duration::from_millis(OLLAMA_CONNECT_TIMEOUT_MS)).is_ok()
}

fn launch_ollama_server() {
    let mut command = Command::new("ollama");
    command
        .arg("serve")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const DETACHED_PROCESS: u32 = 0x0000_0008;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        command.creation_flags(DETACHED_PROCESS | CREATE_NO_WINDOW);
    }

    if let Err(error) = command.spawn() {
        eprintln!("Failed to launch Ollama (`ollama serve`): {error}");
    }
}

fn ensure_ollama_running() {
    if is_ollama_running() {
        return;
    }

    launch_ollama_server();

    for _ in 0..OLLAMA_BOOT_WAIT_RETRIES {
        if is_ollama_running() {
            return;
        }
        thread::sleep(Duration::from_millis(OLLAMA_BOOT_WAIT_INTERVAL_MS));
    }

    eprintln!("Ollama did not become reachable at {OLLAMA_ADDR} after launch attempt.");
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            save_markdown_file
        ])
        .setup(|app| {
            let menu = build_app_menu(&app.handle())?;
            app.set_menu(menu)?;
            tauri::async_runtime::spawn_blocking(ensure_ollama_running);
            Ok(())
        })
        .on_menu_event(|app, event| {
            let Some(window) = app.get_webview_window("main") else {
                return;
            };

            let emit_menu_event = |event_name: &str| {
                if let Err(error) = window.emit(event_name, ()) {
                    eprintln!("Failed to emit menu event `{event_name}`: {error}");
                }
            };

            match event.id().as_ref() {
                "file_new" => emit_menu_event("ghost-writer://menu-new"),
                "file_open" => emit_menu_event("ghost-writer://menu-open"),
                "file_save" => emit_menu_event("ghost-writer://menu-save"),
                "file_quit" => app.exit(0),
                "view_preview" => emit_menu_event("ghost-writer://menu-preview"),
                "view_markdown" => emit_menu_event("ghost-writer://menu-markdown"),
                "view_pin_top" => emit_menu_event("ghost-writer://menu-pin-top"),
                "about_show" => emit_menu_event("ghost-writer://menu-about"),
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
