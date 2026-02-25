#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::net::{SocketAddr, TcpStream};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};

const OLLAMA_ADDR: &str = "127.0.0.1:11434";
const OLLAMA_CONNECT_TIMEOUT_MS: u64 = 800;
const OLLAMA_BOOT_WAIT_RETRIES: u8 = 20;
const OLLAMA_BOOT_WAIT_INTERVAL_MS: u64 = 500;
const SETTINGS_FILE_NAME: &str = "settings.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    default_model: String,
    default_theme: String,
    default_always_on_top: bool,
    default_footer_collapsed: bool,
    default_startup_preview: bool,
    #[serde(default)]
    default_spell_check: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_model: String::new(),
            default_theme: "dark".to_string(),
            default_always_on_top: false,
            default_footer_collapsed: true,
            default_startup_preview: false,
            default_spell_check: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsResponse {
    settings: AppSettings,
    has_file: bool,
}

fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let file_new = MenuItem::with_id(app, "file_new", "New", true, Some("CmdOrCtrl+N"))?;
    let file_open = MenuItem::with_id(app, "file_open", "Open", true, Some("CmdOrCtrl+O"))?;
    let file_save = MenuItem::with_id(app, "file_save", "Save", true, Some("CmdOrCtrl+S"))?;
    let file_print = MenuItem::with_id(app, "file_print", "Print", true, Some("CmdOrCtrl+P"))?;
    let file_quit = MenuItem::with_id(app, "file_quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

    let view_preview =
        MenuItem::with_id(app, "view_preview", "Preview", true, Some("CmdOrCtrl+M"))?;
    let view_markdown = MenuItem::with_id(app, "view_markdown", "Markdown", true, None::<&str>)?;
    let view_toggle_footer = MenuItem::with_id(
        app,
        "view_toggle_footer",
        "Collapse/Expand Footer",
        true,
        Some("CmdOrCtrl+Shift+B"),
    )?;
    let view_toggle_tab_bar = MenuItem::with_id(
        app,
        "view_toggle_tab_bar",
        "Hide Tab Bar",
        true,
        Some("CmdOrCtrl+Shift+H"),
    )?;
    let view_pin_top =
        MenuItem::with_id(app, "view_pin_top", "Pin to Top", true, Some("CmdOrCtrl+T"))?;

    let settings_open = MenuItem::with_id(app, "settings_open", "Settings", true, None::<&str>)?;

    let about_show = MenuItem::with_id(app, "about_show", "About Ghost Writer", true, None::<&str>)?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[&file_new, &file_open, &file_save, &file_print, &file_quit],
    )?;
    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None::<&str>)?,
            &PredefinedMenuItem::redo(app, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None::<&str>)?,
            &PredefinedMenuItem::copy(app, None::<&str>)?,
            &PredefinedMenuItem::paste(app, None::<&str>)?,
            &PredefinedMenuItem::select_all(app, None::<&str>)?,
        ],
    )?;
    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[&view_preview, &view_markdown, &view_toggle_footer, &view_toggle_tab_bar, &view_pin_top],
    )?;
    let settings_menu = Submenu::with_items(app, "Settings", true, &[&settings_open])?;
    let about_menu = Submenu::with_items(app, "About", true, &[&about_show])?;

    Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu, &settings_menu, &about_menu])
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

#[tauri::command]
fn save_markdown_to_path(content: String, path: String) -> Result<String, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Missing file path".to_string());
    }

    let destination = PathBuf::from(trimmed);
    fs::write(&destination, content).map_err(|error| error.to_string())?;
    Ok(destination.to_string_lossy().into_owned())
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|error| error.to_string())
}

#[tauri::command]
fn print_current_webview(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|error| error.to_string())
}

fn settings_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    config_dir.push(SETTINGS_FILE_NAME);
    Ok(config_dir)
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> Result<SettingsResponse, String> {
    let settings_path = settings_file_path(&app)?;
    if !settings_path.exists() {
        return Ok(SettingsResponse {
            settings: AppSettings::default(),
            has_file: false,
        });
    }

    let raw = fs::read_to_string(&settings_path).map_err(|error| error.to_string())?;
    let settings = serde_json::from_str::<AppSettings>(&raw).unwrap_or_default();

    Ok(SettingsResponse {
        settings,
        has_file: true,
    })
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<SettingsResponse, String> {
    let settings_path = settings_file_path(&app)?;
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let payload = serde_json::to_string_pretty(&settings).map_err(|error| error.to_string())?;
    fs::write(&settings_path, payload).map_err(|error| error.to_string())?;

    Ok(SettingsResponse {
        settings,
        has_file: true,
    })
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
            save_markdown_file,
            save_markdown_to_path,
            open_external_url,
            print_current_webview,
            load_settings,
            save_settings
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
                "file_print" => emit_menu_event("ghost-writer://menu-print"),
                "file_quit" => app.exit(0),
                "view_preview" => emit_menu_event("ghost-writer://menu-preview"),
                "view_markdown" => emit_menu_event("ghost-writer://menu-markdown"),
                "view_toggle_footer" => emit_menu_event("ghost-writer://menu-toggle-footer"),
                "view_toggle_tab_bar" => emit_menu_event("ghost-writer://menu-toggle-tab-bar"),
                "view_pin_top" => emit_menu_event("ghost-writer://menu-pin-top"),
                "settings_open" => emit_menu_event("ghost-writer://menu-settings"),
                "about_show" => emit_menu_event("ghost-writer://menu-about"),
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
