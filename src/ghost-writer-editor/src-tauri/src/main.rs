#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "macos")]
use objc2_app_kit::NSPrintInfo;
#[cfg(target_os = "macos")]
use objc2_web_kit::WKWebView;
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
const MAX_RECENT_FILES: usize = 10;
const OPEN_RECENT_EMPTY_ITEM_ID: &str = "file_open_recent_empty";
const OPEN_RECENT_PREFIX: &str = "file_open_recent_";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    default_model: String,
    default_theme: String,
    #[serde(default = "default_text_zoom")]
    default_text_zoom: String,
    default_always_on_top: bool,
    default_footer_collapsed: bool,
    default_startup_preview: bool,
    #[serde(default)]
    default_spell_check: bool,
    #[serde(default = "default_custom_word_list")]
    custom_word_list: Vec<String>,
    #[serde(default)]
    custom_word_list_disabled: Vec<String>,
    #[serde(default)]
    session_saved_tab_paths: Vec<String>,
    #[serde(default)]
    session_active_tab_path: String,
    #[serde(default)]
    recent_files: Vec<String>,
}

fn default_custom_word_list() -> Vec<String> {
    vec![
        ".png".to_string(),
        ".jpg".to_string(),
        ".jpeg".to_string(),
        ".gif".to_string(),
        ".webp".to_string(),
        ".svg".to_string(),
        ".md".to_string(),
        ".txt".to_string(),
        ".pdf".to_string(),
    ]
}

fn default_text_zoom() -> String {
    "100%".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_model: String::new(),
            default_theme: "dark".to_string(),
            default_text_zoom: default_text_zoom(),
            default_always_on_top: false,
            default_footer_collapsed: true,
            default_startup_preview: false,
            default_spell_check: false,
            custom_word_list: default_custom_word_list(),
            custom_word_list_disabled: Vec::new(),
            session_saved_tab_paths: Vec::new(),
            session_active_tab_path: String::new(),
            recent_files: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsResponse {
    settings: AppSettings,
    has_file: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OpenRecentPayload {
    path: String,
    content: String,
}

fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let about_show =
        MenuItem::with_id(app, "about_show", "About Ghost Writer", true, None::<&str>)?;

    let file_new = MenuItem::with_id(app, "file_new", "New", true, Some("CmdOrCtrl+N"))?;
    let file_open = MenuItem::with_id(app, "file_open", "Open", true, Some("CmdOrCtrl+O"))?;
    let file_save = MenuItem::with_id(app, "file_save", "Save", true, Some("CmdOrCtrl+S"))?;
    let file_duplicate =
        MenuItem::with_id(app, "file_duplicate", "Duplicate", true, Some("CmdOrCtrl+Shift+S"))?;
    let file_rename = MenuItem::with_id(app, "file_rename", "Rename", true, None::<&str>)?;
    let file_print = MenuItem::with_id(app, "file_print", "Print", true, Some("CmdOrCtrl+P"))?;
    let file_quit = MenuItem::with_id(app, "file_quit", "Quit", true, Some("CmdOrCtrl+Q"))?;
    let open_recent_menu = build_open_recent_menu(app)?;
    let export_copy_html = MenuItem::with_id(
        app,
        "file_export_copy_html",
        "Copy HTML",
        true,
        None::<&str>,
    )?;
    let export_copy_rich_text = MenuItem::with_id(
        app,
        "file_export_copy_rich_text",
        "Copy Rich Text",
        true,
        None::<&str>,
    )?;
    let export_html = MenuItem::with_id(app, "file_export_html", "HTML...", true, None::<&str>)?;
    let export_pdf = MenuItem::with_id(app, "file_export_pdf", "PDF...", true, None::<&str>)?;
    let export_rtf = MenuItem::with_id(app, "file_export_rtf", "RTF...", true, None::<&str>)?;
    let export_word = MenuItem::with_id(app, "file_export_word", "Word...", true, None::<&str>)?;
    let export_latex = MenuItem::with_id(app, "file_export_latex", "LaTeX...", true, None::<&str>)?;
    let export_menu = Submenu::with_items(
        app,
        "Export",
        true,
        &[
            &export_copy_html,
            &export_copy_rich_text,
            &PredefinedMenuItem::separator(app)?,
            &export_html,
            &export_pdf,
            &export_rtf,
            &export_word,
            &export_latex,
        ],
    )?;

    let view_preview =
        MenuItem::with_id(app, "view_preview", "Preview", true, Some("CmdOrCtrl+M"))?;
    let view_text_edit = MenuItem::with_id(app, "view_text_edit", "Text Edit", true, None::<&str>)?;
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
    let settings_word_list =
        MenuItem::with_id(app, "settings_word_list", "Word List", true, None::<&str>)?;
    let settings_text_zoom =
        MenuItem::with_id(app, "settings_text_zoom", "Text Zoom", true, None::<&str>)?;

    let ghost_writer_menu = Submenu::with_items(app, "Ghost Writer", true, &[&about_show])?;
    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &file_new,
            &file_save,
            &file_duplicate,
            &file_rename,
            &file_open,
            &open_recent_menu,
            &export_menu,
            &PredefinedMenuItem::separator(app)?,
            &file_print,
            &file_quit,
        ],
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
        &[
            &view_preview,
            &view_text_edit,
            &view_toggle_footer,
            &view_toggle_tab_bar,
            &view_pin_top,
        ],
    )?;
    let settings_menu = Submenu::with_items(
        app,
        "Settings",
        true,
        &[&settings_open, &settings_word_list, &settings_text_zoom],
    )?;

    Menu::with_items(
        app,
        &[
            &ghost_writer_menu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &settings_menu,
        ],
    )
}

#[tauri::command]
fn set_always_on_top(window: tauri::WebviewWindow, enabled: bool) -> Result<(), String> {
    window
        .set_always_on_top(enabled)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn save_markdown_file(
    app: tauri::AppHandle,
    content: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
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
    push_recent_file_path(&app, &path);
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn save_markdown_to_path(
    app: tauri::AppHandle,
    content: String,
    path: String,
) -> Result<String, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Missing file path".to_string());
    }

    let destination = PathBuf::from(trimmed);
    fs::write(&destination, content).map_err(|error| error.to_string())?;
    push_recent_file_path(&app, &destination);
    Ok(destination.to_string_lossy().into_owned())
}

#[tauri::command]
fn save_text_file_with_dialog(
    content: String,
    suggested_name: String,
    filter_name: String,
    extensions: Vec<String>,
) -> Result<Option<String>, String> {
    let safe_name = if suggested_name.trim().is_empty() {
        "export.txt".to_string()
    } else {
        suggested_name
    };

    let sanitized_extensions: Vec<String> = extensions
        .into_iter()
        .map(|value| value.trim().trim_start_matches('.').to_lowercase())
        .filter(|value| !value.is_empty())
        .collect();

    let mut dialog = rfd::FileDialog::new().set_file_name(&safe_name);
    if !sanitized_extensions.is_empty() {
        let extension_refs: Vec<&str> = sanitized_extensions.iter().map(String::as_str).collect();
        dialog = dialog.add_filter(filter_name, &extension_refs);
    }

    let selected_path: Option<PathBuf> = dialog.save_file();
    let Some(path) = selected_path else {
        return Ok(None);
    };

    fs::write(&path, content).map_err(|error| error.to_string())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn rename_markdown_file_with_dialog(
    app: tauri::AppHandle,
    current_path: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
    let trimmed = current_path.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    let source_path = PathBuf::from(trimmed);
    if !source_path.exists() {
        return Err("Source file does not exist.".to_string());
    }

    let safe_name = if suggested_name.trim().is_empty() {
        source_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("untitled.md")
            .to_string()
    } else {
        suggested_name
    };

    let mut dialog = rfd::FileDialog::new()
        .set_file_name(&safe_name)
        .add_filter("Markdown", &["md"]);
    if let Some(parent) = source_path.parent() {
        dialog = dialog.set_directory(parent);
    }

    let selected_path: Option<PathBuf> = dialog.save_file();
    let Some(destination_path) = selected_path else {
        return Ok(None);
    };

    if destination_path == source_path {
        return Ok(Some(source_path.to_string_lossy().into_owned()));
    }

    fs::rename(&source_path, &destination_path).map_err(|error| error.to_string())?;
    push_recent_file_path(&app, &destination_path);
    Ok(Some(destination_path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn open_markdown_file(app: tauri::AppHandle) -> Result<Option<OpenRecentPayload>, String> {
    let selected_path: Option<PathBuf> = rfd::FileDialog::new()
        .add_filter("Markdown", &["md"])
        .pick_file();

    let Some(path) = selected_path else {
        return Ok(None);
    };

    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    push_recent_file_path(&app, &path);
    Ok(Some(OpenRecentPayload {
        path: path.to_string_lossy().into_owned(),
        content,
    }))
}

#[tauri::command]
fn load_markdown_files_by_paths(paths: Vec<String>) -> Result<Vec<OpenRecentPayload>, String> {
    let mut results = Vec::new();

    for raw_path in paths {
        let trimmed = raw_path.trim();
        if trimmed.is_empty() {
            continue;
        }

        let content = match fs::read_to_string(trimmed) {
            Ok(content) => content,
            Err(_) => continue,
        };

        results.push(OpenRecentPayload {
            path: trimmed.to_string(),
            content,
        });
    }

    Ok(results)
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    open::that(url).map_err(|error| error.to_string())
}

#[tauri::command]
fn print_current_webview(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        window
            .with_webview(|webview| unsafe {
                let view: &WKWebView = &*webview.inner().cast();
                let print_info = NSPrintInfo::sharedPrintInfo();
                // 72 points == 1 inch.
                print_info.setTopMargin(72.0);
                print_info.setRightMargin(72.0);
                print_info.setBottomMargin(72.0);
                print_info.setLeftMargin(72.0);

                let print_operation = view.printOperationWithPrintInfo(&print_info);
                print_operation.setCanSpawnSeparateThread(true);
                let _ = print_operation.runOperation();
            })
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        window.print().map_err(|error| error.to_string())
    }
}

fn settings_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    config_dir.push(SETTINGS_FILE_NAME);
    Ok(config_dir)
}

fn read_settings(app: &tauri::AppHandle) -> Result<(AppSettings, bool), String> {
    let settings_path = settings_file_path(app)?;
    if !settings_path.exists() {
        return Ok((AppSettings::default(), false));
    }

    let raw = fs::read_to_string(&settings_path).map_err(|error| error.to_string())?;
    let settings = serde_json::from_str::<AppSettings>(&raw).unwrap_or_default();
    Ok((settings, true))
}

fn write_settings(app: &tauri::AppHandle, settings: &AppSettings) -> Result<(), String> {
    let settings_path = settings_file_path(app)?;
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let payload = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(&settings_path, payload).map_err(|error| error.to_string())?;
    Ok(())
}

fn normalize_recent_files(paths: &[String]) -> Vec<String> {
    let mut unique = Vec::new();
    for raw_path in paths {
        let trimmed = raw_path.trim();
        if trimmed.is_empty() {
            continue;
        }
        if unique.iter().any(|existing| existing == trimmed) {
            continue;
        }
        unique.push(trimmed.to_string());
        if unique.len() >= MAX_RECENT_FILES {
            break;
        }
    }
    unique
}

fn build_recent_item_label(path: &str) -> String {
    let path_buf = PathBuf::from(path);
    let file_name = path_buf
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.trim().is_empty())
        .unwrap_or(path);
    format!("{file_name} ({path})")
}

fn build_open_recent_menu(app: &tauri::AppHandle) -> tauri::Result<Submenu<tauri::Wry>> {
    let (settings, _) = read_settings(app).unwrap_or((AppSettings::default(), false));
    let recent_files = normalize_recent_files(&settings.recent_files);

    let mut items: Vec<MenuItem<tauri::Wry>> = Vec::new();
    if recent_files.is_empty() {
        let empty_item = MenuItem::with_id(
            app,
            OPEN_RECENT_EMPTY_ITEM_ID,
            "No Recent Files",
            false,
            None::<&str>,
        )?;
        items.push(empty_item);
    } else {
        for (index, path) in recent_files.iter().enumerate() {
            let item_id = format!("{OPEN_RECENT_PREFIX}{index}");
            let item_label = build_recent_item_label(path);
            let item = MenuItem::with_id(app, item_id, item_label, true, None::<&str>)?;
            items.push(item);
        }
    }

    let item_refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items
        .iter()
        .map(|item| item as &dyn tauri::menu::IsMenuItem<tauri::Wry>)
        .collect();
    Submenu::with_items(app, "Open Recent", true, &item_refs)
}

fn refresh_app_menu(app: &tauri::AppHandle) {
    match build_app_menu(app) {
        Ok(menu) => {
            if let Err(error) = app.set_menu(menu) {
                eprintln!("Failed to refresh app menu: {error}");
            }
        }
        Err(error) => {
            eprintln!("Failed to rebuild app menu: {error}");
        }
    }
}

fn push_recent_file_path(app: &tauri::AppHandle, path: &PathBuf) {
    let value = path.to_string_lossy().trim().to_string();
    if value.is_empty() {
        return;
    }

    let mut settings = read_settings(app)
        .map(|(settings, _)| settings)
        .unwrap_or_default();
    settings.recent_files.retain(|existing| existing != &value);
    settings.recent_files.insert(0, value);
    settings.recent_files.truncate(MAX_RECENT_FILES);

    if let Err(error) = write_settings(app, &settings) {
        eprintln!("Failed to update recent files: {error}");
        return;
    }

    refresh_app_menu(app);
}

fn load_recent_file_by_index(
    app: &tauri::AppHandle,
    index: usize,
) -> Result<OpenRecentPayload, String> {
    let (settings, _) = read_settings(app)?;
    let recent_files = normalize_recent_files(&settings.recent_files);
    let Some(path) = recent_files.get(index).cloned() else {
        return Err("Recent file entry no longer exists.".to_string());
    };

    let content = match fs::read_to_string(&path) {
        Ok(content) => content,
        Err(error) => {
            let mut next_settings = settings.clone();
            next_settings.recent_files.retain(|entry| entry != &path);
            if write_settings(app, &next_settings).is_ok() {
                refresh_app_menu(app);
            }
            return Err(error.to_string());
        }
    };
    push_recent_file_path(app, &PathBuf::from(&path));
    Ok(OpenRecentPayload { path, content })
}

#[tauri::command]
fn load_settings(app: tauri::AppHandle) -> Result<SettingsResponse, String> {
    let (settings, has_file) = read_settings(&app)?;
    Ok(SettingsResponse { settings, has_file })
}

#[tauri::command]
fn save_settings(
    app: tauri::AppHandle,
    mut settings: AppSettings,
) -> Result<SettingsResponse, String> {
    let current_recent_files = read_settings(&app)
        .map(|(existing, _)| existing.recent_files)
        .unwrap_or_default();
    settings.recent_files = current_recent_files;
    write_settings(&app, &settings)?;

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
            save_text_file_with_dialog,
            rename_markdown_file_with_dialog,
            open_markdown_file,
            load_markdown_files_by_paths,
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
                "file_duplicate" => emit_menu_event("ghost-writer://menu-duplicate"),
                "file_rename" => emit_menu_event("ghost-writer://menu-rename"),
                "file_print" => emit_menu_event("ghost-writer://menu-print"),
                "file_quit" => app.exit(0),
                "file_export_copy_html" => emit_menu_event("ghost-writer://menu-export-copy-html"),
                "file_export_copy_rich_text" => {
                    emit_menu_event("ghost-writer://menu-export-copy-rich-text")
                }
                "file_export_html" => emit_menu_event("ghost-writer://menu-export-html"),
                "file_export_pdf" => emit_menu_event("ghost-writer://menu-export-pdf"),
                "file_export_rtf" => emit_menu_event("ghost-writer://menu-export-rtf"),
                "file_export_word" => emit_menu_event("ghost-writer://menu-export-word"),
                "file_export_latex" => emit_menu_event("ghost-writer://menu-export-latex"),
                id if id.starts_with(OPEN_RECENT_PREFIX) => {
                    if id == OPEN_RECENT_EMPTY_ITEM_ID {
                        return;
                    }
                    let index = id
                        .strip_prefix(OPEN_RECENT_PREFIX)
                        .and_then(|value| value.parse::<usize>().ok());
                    let Some(index) = index else {
                        return;
                    };

                    match load_recent_file_by_index(app, index) {
                        Ok(payload) => {
                            if let Err(error) =
                                window.emit("ghost-writer://menu-open-recent", payload)
                            {
                                eprintln!("Failed to emit open-recent event: {error}");
                            }
                        }
                        Err(error_message) => {
                            if let Err(error) =
                                window.emit("ghost-writer://menu-open-recent-error", error_message)
                            {
                                eprintln!("Failed to emit open-recent-error event: {error}");
                            }
                        }
                    }
                }
                "view_preview" => emit_menu_event("ghost-writer://menu-preview"),
                "view_text_edit" => emit_menu_event("ghost-writer://menu-text-edit"),
                "view_toggle_footer" => emit_menu_event("ghost-writer://menu-toggle-footer"),
                "view_toggle_tab_bar" => emit_menu_event("ghost-writer://menu-toggle-tab-bar"),
                "view_pin_top" => emit_menu_event("ghost-writer://menu-pin-top"),
                "settings_open" => emit_menu_event("ghost-writer://menu-settings"),
                "settings_word_list" => emit_menu_event("ghost-writer://menu-word-list"),
                "settings_text_zoom" => emit_menu_event("ghost-writer://menu-text-zoom"),
                "about_show" => emit_menu_event("ghost-writer://menu-about"),
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
