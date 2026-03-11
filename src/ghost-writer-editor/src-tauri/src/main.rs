#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::io::{self, Write};
use std::net::{IpAddr, SocketAddr, TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
// removed duplicate Arc import
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};

const DEFAULT_OLLAMA_BASE_URL: &str = "http://127.0.0.1:11434";
const OLLAMA_CONNECT_TIMEOUT_MS: u64 = 800;
const OLLAMA_BOOT_WAIT_RETRIES: u8 = 20;
const OLLAMA_BOOT_WAIT_INTERVAL_MS: u64 = 500;
const OLLAMA_TAGS_REQUEST_TIMEOUT_MS: u64 = 5000;
// Streaming generation can run for a long time and is cancelled explicitly by the user.
const OLLAMA_STREAM_REQUEST_TIMEOUT_MS: u64 = 0;
const MAX_OLLAMA_STREAM_BUFFER_BYTES: usize = 1024 * 1024;
const SETTINGS_FILE_NAME: &str = "settings.json";
const MAX_RECENT_FILES: usize = 10;
const OPEN_RECENT_EMPTY_ITEM_ID: &str = "file_open_recent_empty";
const OPEN_RECENT_PREFIX: &str = "file_open_recent_";
const MAX_TEXT_PAYLOAD_BYTES: usize = 5 * 1024 * 1024;
const MAX_PROMPT_BYTES: usize = 5 * 1024 * 1024;
const MAX_MODEL_NAME_BYTES: usize = 256;
const MAX_PATH_BYTES: usize = 4096;
const MAX_PATHS_PER_REQUEST: usize = 100;
const MAX_SUGGESTED_NAME_BYTES: usize = 255;
const MAX_FILTER_NAME_BYTES: usize = 64;
const MAX_EXTENSIONS_COUNT: usize = 16;
const MAX_EXTENSION_BYTES: usize = 16;
const MAX_WORD_LIST_ITEMS: usize = 1024;
const MAX_WORD_BYTES: usize = 128;
const MAX_SESSION_SAVED_TAB_PATHS: usize = 100;
const AUTO_SAVE_INTERVAL_MIN_SECONDS: u32 = 5;
const AUTO_SAVE_INTERVAL_MAX_SECONDS: u32 = 600;
const ALLOWED_THEMES: [&str; 2] = ["dark", "light"];
const ALLOWED_TEXT_ZOOMS: [&str; 5] = ["50%", "75%", "100%", "125%", "150%"];
const LOG_FILE_NAME: &str = "ghost-writer.log";
const LOG_FILE_ROTATED_PREFIX: &str = "ghost-writer.log.";
const LOG_MAX_FILE_BYTES: u64 = 10 * 1024 * 1024;
const LOG_MAX_FILES: usize = 5;
const DIAGNOSTICS_LOG_LINES_LIMIT: usize = 1000;
const MAX_LOG_EVENT_BYTES: usize = 128;
const MAX_LOG_MESSAGE_BYTES: usize = 512;
const MAX_LOG_DETAIL_BYTES: usize = 2048;

pub struct ColoredOutputMenuState(pub Arc<AtomicBool>);
pub struct MdPromptsMenuState(pub Arc<AtomicBool>);
pub struct TabBarMenuState(pub Arc<AtomicBool>);
pub struct PromptPanelMenuState(pub Arc<AtomicBool>);
pub struct AllowWindowCloseState(pub Arc<AtomicBool>);

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct SessionTabSnapshot {
    id: String,
    title: String,
    content: String,
    file_path: String,
    last_saved_content: String,
    is_dirty: bool,
}

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
    #[serde(default = "default_show_md_prompts")]
    default_show_md_prompts: bool,
    #[serde(default)]
    auto_save_enabled: bool,
    #[serde(default = "default_auto_save_interval_seconds")]
    auto_save_interval_seconds: u32,
    #[serde(default = "default_ollama_base_url")]
    ollama_base_url: String,
    #[serde(default = "default_custom_word_list")]
    custom_word_list: Vec<String>,
    #[serde(default)]
    custom_word_list_disabled: Vec<String>,
    #[serde(default)]
    session_tabs: Vec<SessionTabSnapshot>,
    #[serde(default)]
    session_active_tab_id: String,
    #[serde(default = "default_session_next_untitled_index")]
    session_next_untitled_index: u32,
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

fn default_show_md_prompts() -> bool {
    true
}

fn default_session_next_untitled_index() -> u32 {
    2
}

fn default_auto_save_interval_seconds() -> u32 {
    60
}

fn default_ollama_base_url() -> String {
    DEFAULT_OLLAMA_BASE_URL.to_string()
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
            default_show_md_prompts: default_show_md_prompts(),
            auto_save_enabled: false,
            auto_save_interval_seconds: default_auto_save_interval_seconds(),
            ollama_base_url: default_ollama_base_url(),
            custom_word_list: default_custom_word_list(),
            custom_word_list_disabled: Vec::new(),
            session_tabs: Vec::new(),
            session_active_tab_id: String::new(),
            session_next_untitled_index: default_session_next_untitled_index(),
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DiagnosticsBundle {
    generated_at_unix_ms: u128,
    app_name: String,
    app_version: String,
    runtime_platform: String,
    runtime_arch: String,
    log_file_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    frontend_diagnostics: Option<serde_json::Value>,
    logs: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    #[serde(default)]
    models: Vec<OllamaTagModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagModel {
    #[serde(default)]
    name: String,
}

fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let is_colored_output_visible = app
        .try_state::<ColoredOutputMenuState>()
        .map(|state| state.0.load(Ordering::SeqCst))
        .unwrap_or(true);
    let colored_output_menu_label = if is_colored_output_visible {
        "Hide Colored Output"
    } else {
        "View Colored Output"
    };
    let is_md_prompts_visible = app
        .try_state::<MdPromptsMenuState>()
        .map(|state| state.0.load(Ordering::SeqCst))
        .unwrap_or(false);
    let md_prompts_menu_label = if is_md_prompts_visible {
        "Hide MD Prompts"
    } else {
        "View MD Prompts"
    };
    let is_tab_bar_visible = app
        .try_state::<TabBarMenuState>()
        .map(|state| state.0.load(Ordering::SeqCst))
        .unwrap_or(true);
    let tab_bar_menu_label = if is_tab_bar_visible {
        "Hide Tab Bar"
    } else {
        "View Tab Bar"
    };
    let is_prompt_panel_visible = app
        .try_state::<PromptPanelMenuState>()
        .map(|state| state.0.load(Ordering::SeqCst))
        .unwrap_or(true);
    let prompt_panel_menu_label = if is_prompt_panel_visible {
        "Hide Input Bar"
    } else {
        "View Input Bar"
    };

    let about_show =
        MenuItem::with_id(app, "about_show", "About Ghost Writer", true, None::<&str>)?;

    let file_new = MenuItem::with_id(app, "file_new", "New", true, Some("CmdOrCtrl+N"))?;
    let file_open = MenuItem::with_id(app, "file_open", "Open", true, Some("CmdOrCtrl+O"))?;
    let file_close = MenuItem::with_id(app, "file_close", "Close", true, Some("CmdOrCtrl+W"))?;
    let file_close_all =
        MenuItem::with_id(app, "file_close_all", "Close All Tabs", true, Some("CmdOrCtrl+Shift+W"))?;
    let file_save = MenuItem::with_id(app, "file_save", "Save", true, Some("CmdOrCtrl+S"))?;
    let file_save_as =
        MenuItem::with_id(app, "file_save_as", "Save As…", true, Some("CmdOrCtrl+Shift+S"))?;
    let file_duplicate =
        MenuItem::with_id(app, "file_duplicate", "Duplicate", true, None::<&str>)?;
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
    let export_word = MenuItem::with_id(
        app,
        "file_export_word",
        "Word-Compatible HTML...",
        true,
        None::<&str>,
    )?;
    let export_latex = MenuItem::with_id(app, "file_export_latex", "LaTeX...", true, None::<&str>)?;
    let export_diagnostics =
        MenuItem::with_id(app, "file_export_diagnostics", "Diagnostics...", true, None::<&str>)?;
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
            &PredefinedMenuItem::separator(app)?,
            &export_diagnostics,
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
        tab_bar_menu_label,
        true,
        Some("CmdOrCtrl+Alt+H"),
    )?;
    let view_toggle_prompt_panel = MenuItem::with_id(
        app,
        "view_toggle_prompt_panel",
        prompt_panel_menu_label,
        true,
        Some("CmdOrCtrl+Shift+D"),
    )?;
    let view_toggle_md_prompts = MenuItem::with_id(
        app,
        "view_toggle_md_prompts",
        md_prompts_menu_label,
        true,
        None::<&str>,
    )?;
    let view_toggle_colored_output = MenuItem::with_id(
        app,
        "view_toggle_colored_output",
        colored_output_menu_label,
        true,
        Some("CmdOrCtrl+Shift+Y"),
    )?;
    let view_pin_top =
        MenuItem::with_id(app, "view_pin_top", "Pin to Top", true, Some("CmdOrCtrl+T"))?;

    let settings_open = MenuItem::with_id(app, "settings_open", "Settings", true, None::<&str>)?;
    let settings_word_list =
        MenuItem::with_id(app, "settings_word_list", "Word List", true, None::<&str>)?;
    let settings_text_zoom =
        MenuItem::with_id(app, "settings_text_zoom", "Text Zoom", true, None::<&str>)?;
    let settings_auto_save =
        MenuItem::with_id(app, "settings_auto_save", "Auto Save", true, None::<&str>)?;
    let edit_find_replace = MenuItem::with_id(
        app,
        "edit_find_replace",
        "Find & Replace",
        true,
        Some("CmdOrCtrl+F"),
    )?;
    let edit_spell_check =
        MenuItem::with_id(app, "edit_spell_check", "Spell Check", true, None::<&str>)?;
    let ghost_writer_menu = Submenu::with_items(app, "About", true, &[&about_show])?;
    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &file_new,
            &file_save,
            &file_save_as,
            &file_duplicate,
            &file_rename,
            &file_open,
            &open_recent_menu,
            &PredefinedMenuItem::separator(app)?,
            &file_close,
            &file_close_all,
            &PredefinedMenuItem::separator(app)?,
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
            &edit_find_replace,
            &edit_spell_check,
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
            &view_toggle_prompt_panel,
            &view_toggle_md_prompts,
            &view_toggle_colored_output,
            &view_pin_top,
        ],
    )?;
    let settings_menu = Submenu::with_items(
        app,
        "Settings",
        true,
        &[&settings_open, &settings_word_list, &settings_text_zoom, &settings_auto_save],
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
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn close_main_window(
    app: tauri::AppHandle,
    allow_close: tauri::State<'_, AllowWindowCloseState>,
) -> Result<(), String> {
    allow_close.0.store(true, Ordering::SeqCst);
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;
    window.close().map_err(|error| error.to_string())
}

fn allow_asset_scope_for_path(app: &tauri::AppHandle, path: &Path) {
    let Some(parent_dir) = path.parent() else {
        append_structured_log(
            app,
            "warn",
            "asset.scope.parent_dir.missing",
            "Could not determine parent directory for asset protocol scope",
            serde_json::json!({ "path": path.to_string_lossy() }),
        );
        return;
    };

    if let Err(error) = app
        .asset_protocol_scope()
        .allow_directory(parent_dir.to_path_buf(), true)
    {
        append_structured_log(
            app,
            "warn",
            "asset.scope.allow_directory.failed",
            "Failed to allow directory for asset protocol",
            serde_json::json!({ "path": parent_dir.to_string_lossy(), "error": error.to_string() }),
        );
    }
}

fn with_windows_dialog_z_order_guard<T, FGet, FSet, FDialog>(
    is_windows: bool,
    get_always_on_top: FGet,
    set_always_on_top: FSet,
    dialog_action: FDialog,
) -> Result<T, String>
where
    FGet: FnOnce() -> Result<bool, String>,
    FSet: FnMut(bool) -> Result<(), String>,
    FDialog: FnOnce() -> T,
{
    let mut set_always_on_top = set_always_on_top;
    let should_restore = is_windows && get_always_on_top()?;

    if should_restore {
        set_always_on_top(false)?;
    }

    let dialog_result = dialog_action();

    if should_restore {
        set_always_on_top(true)?;
    }

    Ok(dialog_result)
}

fn with_native_dialog_window_state<T, F>(app: &tauri::AppHandle, dialog_action: F) -> Result<T, String>
where
    F: FnOnce() -> T,
{
    #[cfg(target_os = "windows")]
    {
        let Some(window) = app.get_webview_window("main") else {
            return Ok(dialog_action());
        };

        return with_windows_dialog_z_order_guard(
            true,
            || window.is_always_on_top().map_err(|error| error.to_string()),
            |enabled| window.set_always_on_top(enabled).map_err(|error| error.to_string()),
            dialog_action,
        );
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = app;
        Ok(dialog_action())
    }
}

// MD Prompts visibility control removed in this patch cycle to keep frontend/backend in sync with simpler wiring

#[tauri::command]
fn save_markdown_file(
    app: tauri::AppHandle,
    content: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
    ensure_max_bytes("content", &content, MAX_TEXT_PAYLOAD_BYTES)?;
    ensure_max_bytes("suggestedName", suggested_name.trim(), MAX_SUGGESTED_NAME_BYTES)?;

    let safe_name = if suggested_name.trim().is_empty() {
        "untitled.md".to_string()
    } else if suggested_name.to_lowercase().ends_with(".md") {
        suggested_name
    } else {
        format!("{suggested_name}.md")
    };

    let selected_path: Option<PathBuf> = with_native_dialog_window_state(&app, || {
        rfd::FileDialog::new()
            .set_file_name(&safe_name)
            .add_filter("Markdown", &["md"])
            .save_file()
    })?;

    let Some(path) = selected_path else {
        append_structured_log(
            &app,
            "info",
            "file.save.dialog.cancelled",
            "User cancelled save dialog",
            serde_json::json!({}),
        );
        return Ok(None);
    };
    let destination = canonicalize_destination_path("path", &path)?;
    if !has_markdown_extension(&destination) {
        return Err("ERR_INVALID_PATH:path must use a .md extension".to_string());
    }

    fs::write(&destination, content).map_err(|error| error.to_string())?;
    allow_asset_scope_for_path(&app, &destination);
    push_recent_file_path(&app, &destination);
    append_structured_log(
        &app,
        "info",
        "file.save.dialog.success",
        "Saved markdown file via native dialog",
        serde_json::json!({ "path": destination.to_string_lossy() }),
    );
    Ok(Some(destination.to_string_lossy().into_owned()))
}

#[tauri::command]
fn save_markdown_to_path(
    app: tauri::AppHandle,
    content: String,
    path: String,
) -> Result<String, String> {
    ensure_max_bytes("content", &content, MAX_TEXT_PAYLOAD_BYTES)?;
    let destination = canonicalize_existing_file_path("path", &path)?;
    if !has_markdown_extension(&destination) {
        return Err("ERR_INVALID_PATH:path must use a .md extension".to_string());
    }
    fs::write(&destination, content).map_err(|error| error.to_string())?;
    allow_asset_scope_for_path(&app, &destination);
    push_recent_file_path(&app, &destination);
    append_structured_log(
        &app,
        "info",
        "file.save.path.success",
        "Saved markdown file to existing path",
        serde_json::json!({ "path": destination.to_string_lossy() }),
    );
    Ok(destination.to_string_lossy().into_owned())
}


#[tauri::command]
fn save_text_file_with_dialog(
    app: tauri::AppHandle,
    content: String,
    suggested_name: String,
    filter_name: String,
    extensions: Vec<String>,
) -> Result<Option<String>, String> {
    ensure_max_bytes("content", &content, MAX_TEXT_PAYLOAD_BYTES)?;
    ensure_max_bytes("suggestedName", suggested_name.trim(), MAX_SUGGESTED_NAME_BYTES)?;
    ensure_max_bytes("filterName", filter_name.trim(), MAX_FILTER_NAME_BYTES)?;

    let safe_name = if suggested_name.trim().is_empty() {
        "export.txt".to_string()
    } else {
        suggested_name
    };

    let sanitized_extensions = sanitize_extension_list(extensions)?;

    let mut dialog = rfd::FileDialog::new().set_file_name(&safe_name);
    if !sanitized_extensions.is_empty() {
        let extension_refs: Vec<&str> = sanitized_extensions.iter().map(String::as_str).collect();
        dialog = dialog.add_filter(&filter_name, &extension_refs);
    }

    let selected_path: Option<PathBuf> = with_native_dialog_window_state(&app, || dialog.save_file())?;
    let Some(path) = selected_path else {
        append_structured_log(
            &app,
            "info",
            "file.export.dialog.cancelled",
            "User cancelled export dialog",
            serde_json::json!({}),
        );
        return Ok(None);
    };
    let destination = canonicalize_destination_path("path", &path)?;

    fs::write(&destination, content).map_err(|error| error.to_string())?;
    append_structured_log(
        &app,
        "info",
        "file.export.dialog.success",
        "Saved export file via native dialog",
        serde_json::json!({ "path": destination.to_string_lossy(), "filterName": filter_name }),
    );
    Ok(Some(destination.to_string_lossy().into_owned()))
}

#[tauri::command]
fn rename_markdown_file_with_dialog(
    app: tauri::AppHandle,
    current_path: String,
    suggested_name: String,
) -> Result<Option<String>, String> {
    ensure_max_bytes("suggestedName", suggested_name.trim(), MAX_SUGGESTED_NAME_BYTES)?;
    let source_path = canonicalize_existing_file_path("currentPath", &current_path)?;
    if !has_markdown_extension(&source_path) {
        return Err("ERR_INVALID_PATH:currentPath must use a .md extension".to_string());
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

    let selected_path: Option<PathBuf> = with_native_dialog_window_state(&app, || dialog.save_file())?;
    let Some(destination_path) = selected_path else {
        append_structured_log(
            &app,
            "info",
            "file.rename.dialog.cancelled",
            "User cancelled rename dialog",
            serde_json::json!({ "sourcePath": source_path.to_string_lossy() }),
        );
        return Ok(None);
    };
    let destination_path = canonicalize_destination_path("destinationPath", &destination_path)?;
    if !has_markdown_extension(&destination_path) {
        return Err("ERR_INVALID_PATH:destinationPath must use a .md extension".to_string());
    }

    if destination_path == source_path {
        return Ok(Some(source_path.to_string_lossy().into_owned()));
    }

    match fs::rename(&source_path, &destination_path) {
        Ok(()) => {}
        Err(error) => {
            if is_cross_device_rename_error(&error) {
                fs::copy(&source_path, &destination_path).map_err(|copy_error| copy_error.to_string())?;
                fs::remove_file(&source_path).map_err(|remove_error| remove_error.to_string())?;
            } else {
                return Err(error.to_string());
            }
        }
    }
    allow_asset_scope_for_path(&app, &destination_path);
    push_recent_file_path(&app, &destination_path);
    append_structured_log(
        &app,
        "info",
        "file.rename.success",
        "Renamed markdown file",
        serde_json::json!({
            "sourcePath": source_path.to_string_lossy(),
            "destinationPath": destination_path.to_string_lossy()
        }),
    );
    Ok(Some(destination_path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn open_markdown_file(app: tauri::AppHandle) -> Result<Option<OpenRecentPayload>, String> {
    let selected_path: Option<PathBuf> = with_native_dialog_window_state(&app, || {
        rfd::FileDialog::new()
            .add_filter("Markdown", &["md"])
            .pick_file()
    })?;

    let Some(path) = selected_path else {
        append_structured_log(
            &app,
            "info",
            "file.open.dialog.cancelled",
            "User cancelled open dialog",
            serde_json::json!({}),
        );
        return Ok(None);
    };
    let path = canonicalize_existing_file_path("path", &path.to_string_lossy())?;
    if !has_markdown_extension(&path) {
        return Err("ERR_INVALID_PATH:path must use a .md extension".to_string());
    }

    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    ensure_max_bytes("content", &content, MAX_TEXT_PAYLOAD_BYTES)?;
    allow_asset_scope_for_path(&app, &path);
    push_recent_file_path(&app, &path);
    append_structured_log(
        &app,
        "info",
        "file.open.dialog.success",
        "Opened markdown file",
        serde_json::json!({ "path": path.to_string_lossy() }),
    );
    Ok(Some(OpenRecentPayload {
        path: path.to_string_lossy().into_owned(),
        content,
    }))
}

#[tauri::command]
fn load_markdown_files_by_paths(
    app: tauri::AppHandle,
    paths: Vec<String>,
) -> Result<Vec<OpenRecentPayload>, String> {
    if paths.len() > MAX_PATHS_PER_REQUEST {
        return Err(format!(
            "ERR_INVALID_FIELD:paths exceeds {} items",
            MAX_PATHS_PER_REQUEST
        ));
    }

    let mut results = Vec::new();

    for raw_path in paths {
        let path = match validate_path_string("paths[]", &raw_path) {
            Ok(path) => path,
            Err(_) => continue,
        };
        let canonical = match fs::canonicalize(&path) {
            Ok(value) => value,
            Err(_) => continue,
        };
        if !canonical.is_file() || !has_markdown_extension(&canonical) {
            continue;
        }

        let content = match fs::read_to_string(&canonical) {
            Ok(content) => content,
            Err(_) => continue,
        };
        if ensure_max_bytes("content", &content, MAX_TEXT_PAYLOAD_BYTES).is_err() {
            continue;
        }

        allow_asset_scope_for_path(&app, &canonical);
        results.push(OpenRecentPayload {
            path: canonical.to_string_lossy().into_owned(),
            content,
        });
    }

    Ok(results)
}

#[tauri::command]
fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    ensure_max_bytes("url", url.trim(), MAX_PATH_BYTES)?;
    if !is_allowed_external_url(&url) {
        return Err(
            "ERR_INVALID_FIELD:url only http, https, mailto, and tel are allowed".to_string(),
        );
    }
    open::that(url.clone()).map_err(|error| error.to_string())?;
    append_structured_log(
        &app,
        "info",
        "url.open.success",
        "Opened external URL",
        serde_json::json!({ "scheme": url::Url::parse(&url).ok().map(|parsed| parsed.scheme().to_string()) }),
    );
    Ok(())
}

#[tauri::command]
fn print_current_webview(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        window
            .with_webview(|webview| unsafe {
                let view: &WKWebView = &*webview.inner().cast();
                let ns_window: &NSWindow = &*webview.ns_window().cast();
                let print_info = NSPrintInfo::sharedPrintInfo();

                // Values are in points (72 pt = 1 in).
                // Keep top tighter and bottom roomier for Word-like balance.
                print_info.setTopMargin(30.0);
                print_info.setRightMargin(50.0);
                print_info.setBottomMargin(78.0);
                print_info.setLeftMargin(50.0);

                let print_operation = view.printOperationWithPrintInfo(&print_info);
                print_operation.runOperationModalForWindow_delegate_didRunSelector_contextInfo(
                    ns_window,
                    None,
                    None,
                    std::ptr::null_mut(),
                );
            })
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        window.print().map_err(|error| error.to_string())
    }
}

#[tauri::command]
fn prepare_macos_editor_input(window: tauri::WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let command_result = Arc::new(Mutex::new(Ok(())));
        let command_result_handle = Arc::clone(&command_result);
        window
            .with_webview(move |webview| unsafe {
                let next_result = (|| {
                    let ns_window: &NSWindow = &*webview.ns_window().cast();
                    let responder = ns_window
                        .firstResponder()
                        .ok_or_else(|| "ERR_MACOS_EDITOR_INPUT_NO_RESPONDER".to_string())?;
                    let text_view = responder
                        .downcast::<NSTextView>()
                        .map_err(|_| "ERR_MACOS_EDITOR_INPUT_NO_TEXT_VIEW".to_string())?;

                    text_view.setAutomaticDashSubstitutionEnabled(false);
                    text_view.setAutomaticTextReplacementEnabled(false);
                    text_view.setAutomaticSpellingCorrectionEnabled(false);
                    Ok::<(), String>(())
                })();

                if let Ok(mut guard) = command_result_handle.lock() {
                    *guard = next_result;
                }
            })
            .map_err(|error| error.to_string())?;

        let result = command_result
            .lock()
            .map_err(|_| "ERR_MACOS_EDITOR_INPUT_RESULT_LOCK".to_string())?
            .clone();
        result
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window;
        Ok(())
    }
}

fn logs_dir_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("ERR_DIAGNOSTICS_PATH:{error}"))?;
    dir.push("logs");
    Ok(dir)
}

fn base_log_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = logs_dir_path(app)?;
    path.push(LOG_FILE_NAME);
    Ok(path)
}

fn rotated_log_file_path(app: &tauri::AppHandle, index: usize) -> Result<PathBuf, String> {
    let mut path = logs_dir_path(app)?;
    path.push(format!("{LOG_FILE_ROTATED_PREFIX}{index}"));
    Ok(path)
}

fn rotate_logs_if_needed(app: &tauri::AppHandle) -> Result<(), String> {
    let base_path = base_log_file_path(app)?;
    let metadata = match fs::metadata(&base_path) {
        Ok(metadata) => metadata,
        Err(_) => return Ok(()),
    };

    if metadata.len() < LOG_MAX_FILE_BYTES {
        return Ok(());
    }

    for index in (1..=LOG_MAX_FILES).rev() {
        let path = rotated_log_file_path(app, index)?;
        if index == LOG_MAX_FILES && path.exists() {
            let _ = fs::remove_file(&path);
        }

        if index > 1 {
            let previous = rotated_log_file_path(app, index - 1)?;
            if previous.exists() {
                let _ = fs::rename(&previous, &path);
            }
        }
    }

    let first_rotated = rotated_log_file_path(app, 1)?;
    if base_path.exists() {
        let _ = fs::rename(base_path, first_rotated);
    }
    Ok(())
}

fn build_log_entry(
    app: &tauri::AppHandle,
    level: &str,
    event: &str,
    msg: &str,
    ctx: serde_json::Value,
) -> serde_json::Value {
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or(0);
    serde_json::json!({
        "ts": ts,
        "level": level,
        "event": event,
        "msg": msg,
        "app": {
            "name": app.package_info().name.clone(),
            "version": app.package_info().version.to_string(),
            "env": "desktop",
        },
        "runtime": {
            "platform": env::consts::OS,
            "arch": env::consts::ARCH,
        },
        "ctx": ctx,
    })
}

fn append_structured_log(
    app: &tauri::AppHandle,
    level: &str,
    event: &str,
    msg: &str,
    ctx: serde_json::Value,
) {
    let Ok(log_dir) = logs_dir_path(app) else {
        return;
    };
    if fs::create_dir_all(&log_dir).is_err() {
        return;
    }

    if rotate_logs_if_needed(app).is_err() {
        return;
    }

    let Ok(path) = base_log_file_path(app) else {
        return;
    };

    let entry = build_log_entry(app, level, event, msg, ctx);
    let Ok(serialized) = serde_json::to_string(&entry) else {
        return;
    };

    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{serialized}");
    }
}

fn collect_recent_log_lines(app: &tauri::AppHandle, max_lines: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut sources = Vec::new();

    if let Ok(base) = base_log_file_path(app) {
        sources.push(base);
    }
    for index in 1..=LOG_MAX_FILES {
        if let Ok(path) = rotated_log_file_path(app, index) {
            sources.push(path);
        }
    }

    for path in sources {
        let content = match fs::read_to_string(path) {
            Ok(content) => content,
            Err(_) => continue,
        };
        for line in content.lines().rev() {
            if line.trim().is_empty() {
                continue;
            }
            lines.push(line.to_string());
            if lines.len() >= max_lines {
                break;
            }
        }
        if lines.len() >= max_lines {
            break;
        }
    }

    lines.reverse();
    lines
}

fn ensure_max_bytes(field: &str, value: &str, max_bytes: usize) -> Result<(), String> {
    if value.len() > max_bytes {
        return Err(format!(
            "ERR_PAYLOAD_TOO_LARGE:{field} exceeds {max_bytes} bytes"
        ));
    }
    Ok(())
}

fn validate_path_string(field: &str, raw: &str) -> Result<PathBuf, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(format!("ERR_MISSING_FIELD:{field} is required"));
    }
    ensure_max_bytes(field, trimmed, MAX_PATH_BYTES)?;
    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err(format!("ERR_INVALID_PATH:{field} must be an absolute path"));
    }
    Ok(path)
}

fn canonicalize_existing_file_path(field: &str, raw: &str) -> Result<PathBuf, String> {
    let path = validate_path_string(field, raw)?;
    let canonical = fs::canonicalize(&path)
        .map_err(|_| format!("ERR_PATH_NOT_FOUND:{field} does not exist"))?;
    if !canonical.is_file() {
        return Err(format!("ERR_PATH_NOT_FILE:{field} must point to a file"));
    }
    Ok(canonical)
}

fn canonicalize_destination_path(field: &str, destination: &Path) -> Result<PathBuf, String> {
    let destination_text = destination.to_string_lossy();
    ensure_max_bytes(field, destination_text.trim(), MAX_PATH_BYTES)?;
    if !destination.is_absolute() {
        return Err(format!("ERR_INVALID_PATH:{field} must be an absolute path"));
    }

    let file_name = destination
        .file_name()
        .and_then(|name| name.to_str())
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .ok_or_else(|| format!("ERR_INVALID_PATH:{field} file name is missing"))?;
    ensure_max_bytes(field, file_name, MAX_SUGGESTED_NAME_BYTES)?;

    let parent = destination
        .parent()
        .ok_or_else(|| format!("ERR_INVALID_PATH:{field} parent directory is missing"))?;
    let canonical_parent = fs::canonicalize(parent)
        .map_err(|_| format!("ERR_INVALID_PATH:{field} parent directory does not exist"))?;
    if !canonical_parent.is_dir() {
        return Err(format!(
            "ERR_INVALID_PATH:{field} parent directory is not a directory"
        ));
    }

    Ok(canonical_parent.join(file_name))
}

fn is_valid_extension(value: &str) -> bool {
    value
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
}

fn sanitize_extension_list(extensions: Vec<String>) -> Result<Vec<String>, String> {
    if extensions.len() > MAX_EXTENSIONS_COUNT {
        return Err(format!(
            "ERR_INVALID_FIELD:extensions exceeds {} items",
            MAX_EXTENSIONS_COUNT
        ));
    }

    let mut sanitized = Vec::new();
    for value in extensions {
        let extension = value.trim().trim_start_matches('.').to_lowercase();
        if extension.is_empty() {
            continue;
        }
        ensure_max_bytes("extensions[]", &extension, MAX_EXTENSION_BYTES)?;
        if !is_valid_extension(&extension) {
            return Err("ERR_INVALID_FIELD:extensions[] contains unsupported characters".to_string());
        }
        if sanitized.iter().any(|existing| existing == &extension) {
            continue;
        }
        sanitized.push(extension);
    }
    Ok(sanitized)
}

fn sanitize_word_list(field: &str, values: Vec<String>) -> Result<Vec<String>, String> {
    if values.len() > MAX_WORD_LIST_ITEMS {
        return Err(format!(
            "ERR_INVALID_FIELD:{field} exceeds {} items",
            MAX_WORD_LIST_ITEMS
        ));
    }

    let mut normalized = Vec::new();
    for value in values {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            continue;
        }
        ensure_max_bytes(field, trimmed, MAX_WORD_BYTES)?;
        if normalized.iter().any(|existing| existing == trimmed) {
            continue;
        }
        normalized.push(trimmed.to_string());
    }
    Ok(normalized)
}

fn validate_and_normalize_settings(mut settings: AppSettings) -> Result<AppSettings, String> {
    settings.default_theme = settings.default_theme.trim().to_lowercase();
    if !ALLOWED_THEMES.contains(&settings.default_theme.as_str()) {
        return Err("ERR_INVALID_FIELD:defaultTheme must be one of dark|light".to_string());
    }

    settings.default_text_zoom = settings.default_text_zoom.trim().to_string();
    if !ALLOWED_TEXT_ZOOMS.contains(&settings.default_text_zoom.as_str()) {
        return Err("ERR_INVALID_FIELD:defaultTextZoom is not supported".to_string());
    }

    settings.default_model = settings.default_model.trim().to_string();
    ensure_max_bytes("defaultModel", &settings.default_model, MAX_MODEL_NAME_BYTES)?;

    if !(AUTO_SAVE_INTERVAL_MIN_SECONDS..=AUTO_SAVE_INTERVAL_MAX_SECONDS)
        .contains(&settings.auto_save_interval_seconds)
    {
        return Err(format!(
            "ERR_INVALID_FIELD:autoSaveIntervalSeconds must be between {} and {}",
            AUTO_SAVE_INTERVAL_MIN_SECONDS, AUTO_SAVE_INTERVAL_MAX_SECONDS
        ));
    }

    settings.ollama_base_url = normalize_ollama_base_url(&settings.ollama_base_url)?;

    settings.custom_word_list = sanitize_word_list("customWordList", settings.custom_word_list)?;
    settings.custom_word_list_disabled =
        sanitize_word_list("customWordListDisabled", settings.custom_word_list_disabled)?;

    if settings.session_tabs.len() > MAX_SESSION_SAVED_TAB_PATHS {
        return Err(format!(
            "ERR_INVALID_FIELD:sessionTabs exceeds {} items",
            MAX_SESSION_SAVED_TAB_PATHS
        ));
    }
    settings.session_tabs = settings
        .session_tabs
        .into_iter()
        .map(|mut tab| {
            tab.id = tab.id.trim().to_string();
            ensure_max_bytes("sessionTabs[].id", &tab.id, MAX_PATH_BYTES)?;
            tab.title = tab.title.trim().to_string();
            ensure_max_bytes("sessionTabs[].title", &tab.title, MAX_SUGGESTED_NAME_BYTES)?;
            ensure_max_bytes("sessionTabs[].content", &tab.content, MAX_TEXT_PAYLOAD_BYTES)?;
            tab.file_path = tab.file_path.trim().to_string();
            if !tab.file_path.is_empty() {
                ensure_max_bytes("sessionTabs[].filePath", &tab.file_path, MAX_PATH_BYTES)?;
                if !PathBuf::from(&tab.file_path).is_absolute() {
                    return Err(
                        "ERR_INVALID_FIELD:sessionTabs[].filePath must be an absolute path".to_string(),
                    );
                }
            }
            ensure_max_bytes(
                "sessionTabs[].lastSavedContent",
                &tab.last_saved_content,
                MAX_TEXT_PAYLOAD_BYTES,
            )?;
            Ok(tab)
        })
        .collect::<Result<Vec<_>, String>>()?;

    settings.session_active_tab_id = settings.session_active_tab_id.trim().to_string();
    ensure_max_bytes(
        "sessionActiveTabId",
        &settings.session_active_tab_id,
        MAX_PATH_BYTES,
    )?;
    if settings.session_next_untitled_index < 2 {
        settings.session_next_untitled_index = default_session_next_untitled_index();
    }

    if settings.session_saved_tab_paths.len() > MAX_SESSION_SAVED_TAB_PATHS {
        return Err(format!(
            "ERR_INVALID_FIELD:sessionSavedTabPaths exceeds {} items",
            MAX_SESSION_SAVED_TAB_PATHS
        ));
    }
    settings.session_saved_tab_paths = settings
        .session_saved_tab_paths
        .into_iter()
        .filter_map(|value| {
            let trimmed = value.trim().to_string();
            if trimmed.is_empty() {
                return None;
            }
            if ensure_max_bytes("sessionSavedTabPaths[]", &trimmed, MAX_PATH_BYTES).is_err() {
                return None;
            }
            let path = PathBuf::from(&trimmed);
            if !path.is_absolute() {
                return None;
            }
            Some(trimmed)
        })
        .collect();

    settings.session_active_tab_path = settings.session_active_tab_path.trim().to_string();
    if !settings.session_active_tab_path.is_empty() {
        ensure_max_bytes(
            "sessionActiveTabPath",
            &settings.session_active_tab_path,
            MAX_PATH_BYTES,
        )?;
        let active_path = PathBuf::from(&settings.session_active_tab_path);
        if !active_path.is_absolute() {
            return Err("ERR_INVALID_FIELD:sessionActiveTabPath must be an absolute path".to_string());
        }
    }

    settings.recent_files = normalize_recent_files(&settings.recent_files);
    Ok(settings)
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

fn normalize_ollama_base_url(raw_base_url: &str) -> Result<String, String> {
    let trimmed = raw_base_url.trim();
    if trimmed.is_empty() {
        return Ok(default_ollama_base_url());
    }

    let parsed = url::Url::parse(trimmed)
        .map_err(|_| "ERR_INVALID_FIELD:ollamaBaseUrl must be a valid URL".to_string())?;
    let scheme = parsed.scheme().to_lowercase();
    if scheme != "http" && scheme != "https" {
        return Err("ERR_INVALID_FIELD:ollamaBaseUrl must use http or https".to_string());
    }
    if parsed.host_str().is_none() {
        return Err("ERR_INVALID_FIELD:ollamaBaseUrl must include a host".to_string());
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("ERR_INVALID_FIELD:ollamaBaseUrl must not include credentials".to_string());
    }
    if !parsed.path().is_empty() && parsed.path() != "/" {
        return Err("ERR_INVALID_FIELD:ollamaBaseUrl cannot include a path".to_string());
    }
    if parsed.query().is_some() || parsed.fragment().is_some() {
        return Err("ERR_INVALID_FIELD:ollamaBaseUrl cannot include query or fragment".to_string());
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| "ERR_INVALID_FIELD:ollamaBaseUrl must include a host".to_string())?;
    let normalized = if let Some(port) = parsed.port() {
        format!("{scheme}://{host}:{port}")
    } else {
        format!("{scheme}://{host}")
    };
    Ok(normalized)
}

fn is_allowed_external_url(raw_url: &str) -> bool {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return false;
    }

    let Ok(parsed) = url::Url::parse(trimmed) else {
        return false;
    };

    matches!(parsed.scheme(), "http" | "https" | "mailto" | "tel")
}

fn is_cross_device_rename_error(error: &io::Error) -> bool {
    error.raw_os_error() == Some(18)
}

fn has_markdown_extension(path: &Path) -> bool {
    path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
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
                append_structured_log(
                    app,
                    "error",
                    "menu.refresh.failed",
                    "Failed to refresh app menu",
                    serde_json::json!({ "error": error.to_string() }),
                );
            }
        }
        Err(error) => {
            append_structured_log(
                app,
                "error",
                "menu.rebuild.failed",
                "Failed to rebuild app menu",
                serde_json::json!({ "error": error.to_string() }),
            );
        }
    }
}

fn sync_md_prompts_menu_state(app: &tauri::AppHandle, is_visible: bool) -> bool {
    let Some(state) = app.try_state::<MdPromptsMenuState>() else {
        return false;
    };

    let previous = state.0.swap(is_visible, Ordering::SeqCst);
    previous != is_visible
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
        append_structured_log(
            app,
            "error",
            "recent_files.update.failed",
            "Failed to update recent files",
            serde_json::json!({ "error": error }),
        );
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

    let path_buf = PathBuf::from(&path);
    if !has_markdown_extension(&path_buf) {
        let mut next_settings = settings.clone();
        next_settings.recent_files.retain(|entry| entry != &path);
        if write_settings(app, &next_settings).is_ok() {
            refresh_app_menu(app);
        }
        return Err("Recent file is not a Markdown file.".to_string());
    }

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
    if sync_md_prompts_menu_state(&app, settings.default_show_md_prompts) {
        refresh_app_menu(&app);
    }
    append_structured_log(
        &app,
        "info",
        "settings.load.success",
        "Loaded app settings",
        serde_json::json!({ "hasFile": has_file }),
    );
    Ok(SettingsResponse { settings, has_file })
}

#[tauri::command]
fn export_diagnostics_bundle(
    app: tauri::AppHandle,
    frontend_diagnostics: Option<serde_json::Value>,
) -> Result<String, String> {
    let logs = collect_recent_log_lines(&app, DIAGNOSTICS_LOG_LINES_LIMIT);
    let bundle = DiagnosticsBundle {
        generated_at_unix_ms: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|value| value.as_millis())
            .unwrap_or(0),
        app_name: app.package_info().name.clone(),
        app_version: app.package_info().version.to_string(),
        runtime_platform: env::consts::OS.to_string(),
        runtime_arch: env::consts::ARCH.to_string(),
        log_file_count: LOG_MAX_FILES + 1,
        frontend_diagnostics,
        logs,
    };
    append_structured_log(
        &app,
        "info",
        "diagnostics.export.bundle",
        "Built diagnostics bundle",
        serde_json::json!({
            "lineCount": bundle.logs.len(),
            "hasFrontendDiagnostics": bundle.frontend_diagnostics.is_some()
        }),
    );
    serde_json::to_string_pretty(&bundle).map_err(|error| error.to_string())
}

#[tauri::command]
fn log_frontend_warning(
    app: tauri::AppHandle,
    event: String,
    message: String,
    detail: Option<String>,
) -> Result<(), String> {
    let event = event.trim();
    if event.is_empty() {
        return Err("ERR_MISSING_FIELD:event is required".to_string());
    }
    ensure_max_bytes("event", event, MAX_LOG_EVENT_BYTES)?;

    let message = message.trim();
    if message.is_empty() {
        return Err("ERR_MISSING_FIELD:message is required".to_string());
    }
    ensure_max_bytes("message", message, MAX_LOG_MESSAGE_BYTES)?;

    let detail = detail
        .map(|value| value.trim().to_string())
        .unwrap_or_default();
    ensure_max_bytes("detail", &detail, MAX_LOG_DETAIL_BYTES)?;

    append_structured_log(
        &app,
        "warn",
        event,
        message,
        serde_json::json!({
            "source": "frontend",
            "detail": detail
        }),
    );
    Ok(())
}

#[tauri::command]
fn save_settings(
    app: tauri::AppHandle,
    mut settings: AppSettings,
) -> Result<SettingsResponse, String> {
    settings = validate_and_normalize_settings(settings)?;
    let current_recent_files = read_settings(&app)
        .map(|(existing, _)| existing.recent_files)
        .unwrap_or_default();
    settings.recent_files = current_recent_files;
    write_settings(&app, &settings)?;
    if sync_md_prompts_menu_state(&app, settings.default_show_md_prompts) {
        refresh_app_menu(&app);
    }
    append_structured_log(
        &app,
        "info",
        "settings.save.success",
        "Saved app settings",
        serde_json::json!({
            "defaultTheme": settings.default_theme,
            "autoSaveEnabled": settings.auto_save_enabled
        }),
    );

    Ok(SettingsResponse {
        settings,
        has_file: true,
    })
}

fn read_ollama_base_url(app: &tauri::AppHandle) -> String {
    let (settings, _) = read_settings(app).unwrap_or((AppSettings::default(), false));
    normalize_ollama_base_url(&settings.ollama_base_url).unwrap_or_else(|_| default_ollama_base_url())
}

fn parse_ollama_addr(base_url: &str) -> Option<SocketAddr> {
    let parsed = url::Url::parse(base_url).ok()?;
    let host = parsed.host_str()?;
    let port = parsed.port_or_known_default()?;
    format!("{host}:{port}").to_socket_addrs().ok()?.next()
}

fn is_local_ollama_endpoint(base_url: &str) -> bool {
    let Ok(parsed) = url::Url::parse(base_url) else {
        return false;
    };
    let Some(host) = parsed.host_str() else {
        return false;
    };
    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }
    host.parse::<IpAddr>()
        .map(|ip| ip.is_loopback())
        .unwrap_or(false)
}

fn is_ollama_running(base_url: &str) -> bool {
    let Some(addr) = parse_ollama_addr(base_url) else {
        return false;
    };
    TcpStream::connect_timeout(&addr, Duration::from_millis(OLLAMA_CONNECT_TIMEOUT_MS)).is_ok()
}

#[cfg(target_os = "macos")]
fn ollama_exe_fallback() -> Option<PathBuf> {
    let candidates = [
        "/opt/homebrew/bin/ollama",
        "/usr/local/bin/ollama",
        "/Applications/Ollama.app/Contents/Resources/ollama",
        "/Applications/Ollama.app/Contents/MacOS/Ollama",
    ];

    candidates
        .iter()
        .map(PathBuf::from)
        .find(|candidate| candidate.is_file())
}

#[cfg(target_os = "windows")]
fn ollama_exe_fallback() -> Option<PathBuf> {
    env::var_os("LOCALAPPDATA").and_then(|local_app_data| {
        let path = Path::new(&local_app_data)
            .join("Programs")
            .join("Ollama")
            .join("ollama.exe");
        if path.is_file() {
            Some(path)
        } else {
            None
        }
    })
}

fn launch_ollama_server() -> Result<(), String> {
    fn spawn_ollama_command(executable: &Path) -> io::Result<()> {
        let mut command = Command::new(executable);
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

        command.spawn().map(|_| ())
    }

    match spawn_ollama_command(Path::new("ollama")) {
        Ok(_) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            if let Some(fallback) = ollama_exe_fallback() {
                return spawn_ollama_command(&fallback)
                    .map_err(|e| format!("Failed to start Ollama from {}: {e}", fallback.display()));
            }

            Err("Ollama not found. Install from https://ollama.com and ensure it is on your PATH. On macOS, standard app locations are checked automatically; on Windows, %LOCALAPPDATA%\\Programs\\Ollama is also checked.".to_string())
        }
        Err(e) => Err(format!("Failed to launch Ollama: {e}")),
    }
}

fn ensure_ollama_running_result(app: &tauri::AppHandle) -> Result<(), String> {
    let ollama_base_url = read_ollama_base_url(app);
    if is_ollama_running(&ollama_base_url) {
        return Ok(());
    }

    if !is_local_ollama_endpoint(&ollama_base_url) {
        return Err(format!(
            "Ollama is not reachable at configured endpoint {ollama_base_url}. Auto-launch is only supported for localhost endpoints."
        ));
    }

    launch_ollama_server()?;

    for _ in 0..OLLAMA_BOOT_WAIT_RETRIES {
        if is_ollama_running(&ollama_base_url) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(OLLAMA_BOOT_WAIT_INTERVAL_MS));
    }

    Err(format!(
        "Ollama did not become reachable at {ollama_base_url} after launch (wait a few seconds and try again)."
    ))
}

fn ensure_ollama_running(app: &tauri::AppHandle) {
    if let Err(e) = ensure_ollama_running_result(app) {
        eprintln!("{e}");
    }
}

#[tauri::command]
fn ensure_ollama_running_command(app: tauri::AppHandle) -> Result<(), String> {
    let ollama_base_url = read_ollama_base_url(&app);
    let result = ensure_ollama_running_result(&app);
    match &result {
        Ok(_) => append_structured_log(
            &app,
            "info",
            "ollama.ensure.success",
            "Ollama is reachable",
            serde_json::json!({ "baseUrl": ollama_base_url }),
        ),
        Err(error) => append_structured_log(
            &app,
            "error",
            "ollama.ensure.failed",
            "Failed to ensure Ollama running",
            serde_json::json!({ "baseUrl": ollama_base_url, "error": error }),
        ),
    }
    result
}

/// Shared flag so the frontend can cancel an in-flight Ollama stream.
pub struct OllamaStreamCancel(pub Arc<AtomicBool>);

#[derive(Debug, Default)]
struct StreamChunkProcessResult {
    cancelled: bool,
    responses: Vec<String>,
}

fn extract_ollama_response(line_bytes: &[u8]) -> Option<String> {
    let line = String::from_utf8_lossy(line_bytes).trim().to_string();
    if line.is_empty() {
        return None;
    }

    serde_json::from_str::<serde_json::Value>(&line)
        .ok()
        .and_then(|parsed| {
            parsed
                .get("response")
                .and_then(|value| value.as_str())
                .map(|response| response.to_string())
        })
}

fn process_ollama_stream_chunk(
    cancel: &AtomicBool,
    buf: &mut Vec<u8>,
    chunk: &[u8],
) -> Result<StreamChunkProcessResult, String> {
    if cancel.load(Ordering::SeqCst) {
        return Ok(StreamChunkProcessResult {
            cancelled: true,
            responses: Vec::new(),
        });
    }

    if buf.len().saturating_add(chunk.len()) > MAX_OLLAMA_STREAM_BUFFER_BYTES
        && !chunk.contains(&b'\n')
    {
        buf.clear();
        return Err(format!(
            "Ollama stream payload exceeded {MAX_OLLAMA_STREAM_BUFFER_BYTES} bytes without newline delimiter"
        ));
    }

    buf.extend_from_slice(chunk);

    let mut responses: Vec<String> = Vec::new();
    while let Some(pos) = buf.iter().position(|&b| b == b'\n') {
        let line_bytes: Vec<u8> = buf.drain(..=pos).collect();
        if let Some(response) = extract_ollama_response(&line_bytes) {
            responses.push(response);
        }
    }

    if buf.len() > MAX_OLLAMA_STREAM_BUFFER_BYTES {
        buf.clear();
        return Err(format!(
            "Ollama stream payload exceeded {MAX_OLLAMA_STREAM_BUFFER_BYTES} bytes without newline delimiter"
        ));
    }

    Ok(StreamChunkProcessResult {
        cancelled: false,
        responses,
    })
}

#[tauri::command]
async fn ollama_generate_stream(
    app: tauri::AppHandle,
    model: String,
    prompt: String,
    cancel: tauri::State<'_, OllamaStreamCancel>,
) -> Result<(), String> {
    let model = model.trim().to_string();
    if model.is_empty() {
        return Err("ERR_INVALID_FIELD:model is required".to_string());
    }
    ensure_max_bytes("model", &model, MAX_MODEL_NAME_BYTES)?;
    ensure_max_bytes("prompt", &prompt, MAX_PROMPT_BYTES)?;
    append_structured_log(
        &app,
        "info",
        "ollama.stream.start",
        "Starting Ollama stream generation",
        serde_json::json!({ "model": &model }),
    );

    cancel.0.store(false, Ordering::SeqCst);

    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let ollama_base_url = read_ollama_base_url(&app);
    let url = format!("{ollama_base_url}/api/generate");
    let body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": true,
        "options": { "num_predict": -1 }
    });

    let client_builder = reqwest::Client::builder();
    let client_builder = if OLLAMA_STREAM_REQUEST_TIMEOUT_MS > 0 {
        client_builder.timeout(Duration::from_millis(OLLAMA_STREAM_REQUEST_TIMEOUT_MS))
    } else {
        client_builder
    };
    let client = client_builder.build().map_err(|e| e.to_string())?;

    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let msg = format!("Ollama request failed: {}", res.status());
        let _ = window.emit("ollama-stream-error", &msg);
        append_structured_log(
            &app,
            "error",
            "ollama.stream.http_error",
            "Ollama responded with non-success status",
            serde_json::json!({ "model": &model, "status": res.status().as_u16() }),
        );
        return Err(msg);
    }

    let mut stream = res.bytes_stream();
    let mut buf: Vec<u8> = Vec::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        let processed = match process_ollama_stream_chunk(&cancel.0, &mut buf, &chunk) {
            Ok(processed) => processed,
            Err(error) => {
                let _ = window.emit("ollama-stream-error", &error);
                append_structured_log(
                    &app,
                    "error",
                    "ollama.stream.buffer_overflow",
                    "Ollama stream buffer exceeded safe limit",
                    serde_json::json!({ "model": &model, "limitBytes": MAX_OLLAMA_STREAM_BUFFER_BYTES, "error": &error }),
                );
                return Err(error);
            }
        };

        if processed.cancelled {
            let _ = window.emit("ollama-stream-cancelled", ());
            append_structured_log(
                &app,
                "warn",
                "ollama.stream.cancelled",
                "Ollama stream cancelled by user",
                serde_json::json!({ "model": &model }),
            );
            return Ok(());
        }

        for response in processed.responses {
            if window.emit("ollama-stream-chunk", response).is_err() {
                return Ok(());
            }
        }
    }

    if !buf.is_empty() {
        if let Some(response) = extract_ollama_response(&buf) {
            let _ = window.emit("ollama-stream-chunk", response);
        }
    }

    let _ = window.emit("ollama-stream-done", ());
    append_structured_log(
        &app,
        "info",
        "ollama.stream.done",
        "Ollama stream completed",
        serde_json::json!({ "model": &model }),
    );
    Ok(())
}

#[tauri::command]
fn ollama_cancel_stream(cancel: tauri::State<'_, OllamaStreamCancel>) {
    cancel.0.store(true, Ordering::SeqCst);
}

#[tauri::command]
async fn load_ollama_models(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    ensure_ollama_running_result(&app)?;

    let ollama_base_url = read_ollama_base_url(&app);
    let url = format!("{ollama_base_url}/api/tags");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(OLLAMA_TAGS_REQUEST_TIMEOUT_MS))
        .build()
        .map_err(|error| error.to_string())?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        let error = format!("Ollama models request failed: {}", response.status());
        append_structured_log(
            &app,
            "error",
            "ollama.models.http_error",
            "Ollama models request returned non-success status",
            serde_json::json!({ "baseUrl": &ollama_base_url, "status": response.status().as_u16() }),
        );
        return Err(error);
    }

    let payload = response
        .json::<OllamaTagsResponse>()
        .await
        .map_err(|error| error.to_string())?;

    let mut models: Vec<String> = Vec::new();
    for model in payload.models {
        let name = model.name.trim();
        if name.is_empty() || models.iter().any(|existing| existing == name) {
            continue;
        }
        models.push(name.to_string());
    }

    append_structured_log(
        &app,
        "info",
        "ollama.models.loaded",
        "Loaded Ollama models",
        serde_json::json!({ "baseUrl": &ollama_base_url, "count": models.len() }),
    );

    Ok(models)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    #[test]
    fn rejects_invalid_theme_in_settings() {
        let mut settings = AppSettings::default();
        settings.default_theme = "neon".to_string();
        let result = validate_and_normalize_settings(settings);
        assert!(result.is_err());
    }

    #[test]
    fn rejects_out_of_range_auto_save_interval() {
        let mut settings = AppSettings::default();
        settings.auto_save_interval_seconds = 2;
        let result = validate_and_normalize_settings(settings);
        assert!(result.is_err());
    }

    #[test]
    fn rejects_ollama_base_url_with_unsupported_scheme() {
        let mut settings = AppSettings::default();
        settings.ollama_base_url = "ws://localhost:11434".to_string();
        let result = validate_and_normalize_settings(settings);
        assert!(result.is_err());
    }

    #[test]
    fn rejects_ollama_base_url_with_path() {
        let mut settings = AppSettings::default();
        settings.ollama_base_url = "http://localhost:11434/api".to_string();
        let result = validate_and_normalize_settings(settings);
        assert!(result.is_err());
    }

    #[test]
    fn normalizes_ollama_base_url() {
        let mut settings = AppSettings::default();
        settings.ollama_base_url = " http://localhost:11435/ ".to_string();
        let normalized = validate_and_normalize_settings(settings).expect("settings should normalize");
        assert_eq!(normalized.ollama_base_url, "http://localhost:11435");
    }

    #[test]
    fn deduplicates_and_normalizes_extensions() {
        let sanitized = sanitize_extension_list(vec![
            ".TXT".to_string(),
            "txt".to_string(),
            "md".to_string(),
            "  ".to_string(),
        ])
        .expect("extensions should be valid");
        assert_eq!(sanitized, vec!["txt".to_string(), "md".to_string()]);
    }

    #[test]
    fn validates_absolute_path_strings() {
        let relative = validate_path_string("path", "notes.md");
        assert!(relative.is_err());
    }

    #[test]
    fn processes_newline_delimited_stream_chunk() {
        let cancel = AtomicBool::new(false);
        let mut buf: Vec<u8> = Vec::new();
        let chunk = b"{\"response\":\"Hello\"}\n{\"response\":\" world\"}\n";

        let result =
            process_ollama_stream_chunk(&cancel, &mut buf, chunk).expect("chunk should parse");
        assert!(!result.cancelled);
        assert_eq!(
            result.responses,
            vec!["Hello".to_string(), " world".to_string()]
        );
        assert!(buf.is_empty());
    }

    #[test]
    fn fails_fast_on_long_chunk_without_newline() {
        let cancel = AtomicBool::new(false);
        let mut buf: Vec<u8> = Vec::new();
        let chunk = vec![b'x'; MAX_OLLAMA_STREAM_BUFFER_BYTES + 1];

        let err = process_ollama_stream_chunk(&cancel, &mut buf, &chunk)
            .expect_err("oversized non-delimited chunk should fail");
        assert!(err.contains("without newline delimiter"));
        assert!(buf.is_empty());
    }

    #[test]
    fn returns_cancelled_without_mutating_buffer() {
        let cancel = AtomicBool::new(true);
        let mut buf: Vec<u8> = b"pending".to_vec();
        let chunk = b"{\"response\":\"ignored\"}\n";

        let result =
            process_ollama_stream_chunk(&cancel, &mut buf, chunk).expect("cancel should short-circuit");
        assert!(result.cancelled);
        assert!(result.responses.is_empty());
        assert_eq!(buf, b"pending".to_vec());
    }

    #[test]
    fn windows_dialog_guard_temporarily_disables_always_on_top() {
        let calls = Arc::new(Mutex::new(Vec::<bool>::new()));
        let calls_handle = Arc::clone(&calls);

        let result = with_windows_dialog_z_order_guard(
            true,
            || Ok(true),
            move |enabled| {
                calls_handle.lock().expect("calls should lock").push(enabled);
                Ok(())
            },
            || "dialog-result",
        )
        .expect("dialog guard should succeed");

        assert_eq!(result, "dialog-result");
        assert_eq!(*calls.lock().expect("calls should lock"), vec![false, true]);
    }

    #[test]
    fn windows_dialog_guard_leaves_non_pinned_window_unchanged() {
        let calls = Arc::new(Mutex::new(Vec::<bool>::new()));
        let calls_handle = Arc::clone(&calls);

        let result = with_windows_dialog_z_order_guard(
            true,
            || Ok(false),
            move |enabled| {
                calls_handle.lock().expect("calls should lock").push(enabled);
                Ok(())
            },
            || "dialog-result",
        )
        .expect("dialog guard should succeed");

        assert_eq!(result, "dialog-result");
        assert!(calls.lock().expect("calls should lock").is_empty());
    }

    #[test]
    fn windows_dialog_guard_is_noop_outside_windows() {
        let calls = Arc::new(Mutex::new(Vec::<bool>::new()));
        let calls_handle = Arc::clone(&calls);

        let result = with_windows_dialog_z_order_guard(
            false,
            || Ok(true),
            move |enabled| {
                calls_handle.lock().expect("calls should lock").push(enabled);
                Ok(())
            },
            || "dialog-result",
        )
        .expect("dialog guard should succeed");

        assert_eq!(result, "dialog-result");
        assert!(calls.lock().expect("calls should lock").is_empty());
    }

    #[test]
    fn windows_dialog_guard_stops_before_dialog_when_unpin_fails() {
        let dialog_ran = Arc::new(AtomicBool::new(false));
        let dialog_ran_handle = Arc::clone(&dialog_ran);

        let error = with_windows_dialog_z_order_guard(
            true,
            || Ok(true),
            |_| Err("unpin failed".to_string()),
            move || {
                dialog_ran_handle.store(true, Ordering::SeqCst);
            },
        )
        .expect_err("unpin failure should be returned");

        assert_eq!(error, "unpin failed");
        assert!(!dialog_ran.load(Ordering::SeqCst));
    }

    #[test]
    fn windows_dialog_guard_returns_restore_error_after_dialog_runs() {
        let calls = Arc::new(Mutex::new(Vec::<bool>::new()));
        let calls_handle = Arc::clone(&calls);
        let dialog_ran = Arc::new(AtomicBool::new(false));
        let dialog_ran_handle = Arc::clone(&dialog_ran);

        let error = with_windows_dialog_z_order_guard(
            true,
            || Ok(true),
            move |enabled| {
                calls_handle.lock().expect("calls should lock").push(enabled);
                if enabled {
                    return Err("restore failed".to_string());
                }
                Ok(())
            },
            move || {
                dialog_ran_handle.store(true, Ordering::SeqCst);
            },
        )
        .expect_err("restore failure should be returned");

        assert_eq!(error, "restore failed");
        assert!(dialog_ran.load(Ordering::SeqCst));
        assert_eq!(*calls.lock().expect("calls should lock"), vec![false, true]);
    }
}

fn main() {
    let ollama_cancel = OllamaStreamCancel(Arc::new(AtomicBool::new(false)));
    let colored_output_menu_state = ColoredOutputMenuState(Arc::new(AtomicBool::new(true)));
    let md_prompts_menu_state = MdPromptsMenuState(Arc::new(AtomicBool::new(default_show_md_prompts())));
    let tab_bar_menu_state = TabBarMenuState(Arc::new(AtomicBool::new(true)));
    let prompt_panel_menu_state = PromptPanelMenuState(Arc::new(AtomicBool::new(true)));
    let allow_window_close_state = AllowWindowCloseState(Arc::new(AtomicBool::new(false)));

    tauri::Builder::default()
        .manage(ollama_cancel)
        .manage(colored_output_menu_state)
        .manage(md_prompts_menu_state)
        .manage(tab_bar_menu_state)
        .manage(prompt_panel_menu_state)
        .manage(allow_window_close_state)
        .invoke_handler(tauri::generate_handler![
            set_always_on_top,
            exit_app,
            close_main_window,
            save_markdown_file,
            save_markdown_to_path,
            save_text_file_with_dialog,
            rename_markdown_file_with_dialog,
            open_markdown_file,
            load_markdown_files_by_paths,
            open_external_url,
            print_current_webview,
            prepare_macos_editor_input,
            load_settings,
            save_settings,
            export_diagnostics_bundle,
            log_frontend_warning,
            ensure_ollama_running_command,
            load_ollama_models,
            ollama_generate_stream,
            ollama_cancel_stream
        ])
        .setup(|app| {
            let (settings, _) = read_settings(&app.handle()).unwrap_or_default();
            let _ = sync_md_prompts_menu_state(&app.handle(), settings.default_show_md_prompts);
            let menu = build_app_menu(&app.handle())?;
            app.set_menu(menu)?;
            append_structured_log(
                &app.handle(),
                "info",
                "app.startup",
                "Ghost Writer desktop runtime started",
                serde_json::json!({}),
            );
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn_blocking(move || ensure_ollama_running(&app_handle));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                let Some(allow_close) = app.try_state::<AllowWindowCloseState>() else {
                    return;
                };

                if allow_close.0.swap(false, Ordering::SeqCst) {
                    return;
                }

                api.prevent_close();
                if let Err(error) = window.emit("ghost-writer://window-close-requested", ()) {
                    append_structured_log(
                        &app,
                        "error",
                        "window.close_requested.emit.failed",
                        "Failed to emit close-requested event to renderer",
                        serde_json::json!({ "error": error.to_string() }),
                    );
                }
            }
        })
        .on_menu_event(|app, event| {
            let Some(window) = app.get_webview_window("main") else {
                return;
            };

            let emit_menu_event = |event_name: &str| {
                if let Err(error) = window.emit(event_name, ()) {
                    append_structured_log(
                        app,
                        "error",
                        "menu.emit.failed",
                        "Failed to emit menu event",
                        serde_json::json!({ "eventName": event_name, "error": error.to_string() }),
                    );
                }
            };

            match event.id().as_ref() {
                "file_new" => emit_menu_event("ghost-writer://menu-new"),
                "file_open" => emit_menu_event("ghost-writer://menu-open"),
                "file_close" => emit_menu_event("ghost-writer://menu-close"),
                "file_close_all" => emit_menu_event("ghost-writer://menu-close-all"),
                "file_save" => emit_menu_event("ghost-writer://menu-save"),
                "file_save_as" => emit_menu_event("ghost-writer://menu-save-as"),
                "file_duplicate" => emit_menu_event("ghost-writer://menu-duplicate"),
                "file_rename" => emit_menu_event("ghost-writer://menu-rename"),
                "file_print" => emit_menu_event("ghost-writer://menu-print"),
                "file_quit" => emit_menu_event("ghost-writer://menu-request-quit"),
                "file_export_copy_html" => emit_menu_event("ghost-writer://menu-export-copy-html"),
                "file_export_copy_rich_text" => {
                    emit_menu_event("ghost-writer://menu-export-copy-rich-text")
                }
                "file_export_html" => emit_menu_event("ghost-writer://menu-export-html"),
                "file_export_pdf" => emit_menu_event("ghost-writer://menu-export-pdf"),
                "file_export_rtf" => emit_menu_event("ghost-writer://menu-export-rtf"),
                "file_export_word" => emit_menu_event("ghost-writer://menu-export-word"),
                "file_export_latex" => emit_menu_event("ghost-writer://menu-export-latex"),
                "file_export_diagnostics" => emit_menu_event("ghost-writer://menu-export-diagnostics"),
                "edit_find_replace" => emit_menu_event("ghost-writer://menu-find-replace"),
                "edit_spell_check" => emit_menu_event("ghost-writer://menu-spell-check"),
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
                                append_structured_log(
                                    app,
                                    "error",
                                    "menu.open_recent.emit.failed",
                                    "Failed to emit open recent event",
                                    serde_json::json!({ "error": error.to_string() }),
                                );
                            }
                        }
                        Err(error_message) => {
                            if let Err(error) =
                                window.emit("ghost-writer://menu-open-recent-error", error_message)
                            {
                                append_structured_log(
                                    app,
                                    "error",
                                    "menu.open_recent_error.emit.failed",
                                    "Failed to emit open recent error event",
                                    serde_json::json!({ "error": error.to_string() }),
                                );
                            }
                        }
                    }
                }
                "view_preview" => emit_menu_event("ghost-writer://menu-preview"),
                "view_text_edit" => emit_menu_event("ghost-writer://menu-text-edit"),
                "view_toggle_footer" => emit_menu_event("ghost-writer://menu-toggle-footer"),
                "view_toggle_tab_bar" => {
                    if let Some(state) = app.try_state::<TabBarMenuState>() {
                        let current = state.0.load(Ordering::SeqCst);
                        state.0.store(!current, Ordering::SeqCst);
                        refresh_app_menu(app);
                    }
                    emit_menu_event("ghost-writer://menu-toggle-tab-bar")
                }
                "view_toggle_prompt_panel" => {
                    if let Some(state) = app.try_state::<PromptPanelMenuState>() {
                        let current = state.0.load(Ordering::SeqCst);
                        state.0.store(!current, Ordering::SeqCst);
                        refresh_app_menu(app);
                    }
                    emit_menu_event("ghost-writer://menu-toggle-prompt-panel")
                }
                "view_toggle_md_prompts" => {
                    if let Some(state) = app.try_state::<MdPromptsMenuState>() {
                        let current = state.0.load(Ordering::SeqCst);
                        state.0.store(!current, Ordering::SeqCst);
                        refresh_app_menu(app);
                    }
                    emit_menu_event("ghost-writer://menu-toggle-md-prompts")
                }
                "view_toggle_colored_output" => {
                    if let Some(state) = app.try_state::<ColoredOutputMenuState>() {
                        let current = state.0.load(Ordering::SeqCst);
                        state.0.store(!current, Ordering::SeqCst);
                        refresh_app_menu(app);
                    }
                    emit_menu_event("ghost-writer://menu-toggle-colored-output")
                }
                "view_pin_top" => emit_menu_event("ghost-writer://menu-pin-top"),
                "settings_open" => emit_menu_event("ghost-writer://menu-settings"),
                "settings_word_list" => emit_menu_event("ghost-writer://menu-word-list"),
                "settings_text_zoom" => emit_menu_event("ghost-writer://menu-text-zoom"),
                "settings_auto_save" => emit_menu_event("ghost-writer://menu-auto-save"),
                "about_show" => emit_menu_event("ghost-writer://menu-about"),
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
#[cfg(target_os = "macos")]
use objc2_app_kit::{NSPrintInfo, NSTextView, NSWindow};
#[cfg(target_os = "macos")]
use objc2_web_kit::WKWebView;
