#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::{SocketAddr, TcpStream};
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

use serde::Deserialize;

const OLLAMA_ADDR: &str = "127.0.0.1:11434";
const OLLAMA_TAGS_URL: &str = "http://127.0.0.1:11434/api/tags";
const OLLAMA_CONNECT_TIMEOUT_MS: u64 = 800;
const OLLAMA_HTTP_TIMEOUT_MS: u64 = 2_000;
const OLLAMA_BOOT_WAIT_RETRIES: u8 = 20;
const OLLAMA_BOOT_WAIT_INTERVAL_MS: u64 = 500;

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

fn parse_models_from_ollama_list(stdout: &str) -> Vec<String> {
    let mut models = Vec::new();

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("NAME") {
            continue;
        }

        if let Some(name) = trimmed.split_whitespace().next() {
            if !name.is_empty() && !models.iter().any(|model| model == name) {
                models.push(name.to_string());
            }
        }
    }

    models
}

fn list_ollama_models_via_cli() -> Result<Vec<String>, String> {
    let output = Command::new("ollama")
        .arg("list")
        .output()
        .map_err(|error| format!("Failed to run `ollama list`: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            format!("`ollama list` failed with status {}.", output.status)
        } else {
            format!("`ollama list` failed: {stderr}")
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let models = parse_models_from_ollama_list(&stdout);

    if models.is_empty() {
        return Err("No Ollama models found via `ollama list`.".to_string());
    }

    Ok(models)
}

fn list_ollama_models_via_http() -> Result<Vec<String>, String> {
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_millis(OLLAMA_HTTP_TIMEOUT_MS))
        .timeout_read(Duration::from_millis(OLLAMA_HTTP_TIMEOUT_MS))
        .timeout_write(Duration::from_millis(OLLAMA_HTTP_TIMEOUT_MS))
        .build();

    let response = agent
        .get(OLLAMA_TAGS_URL)
        .call()
        .map_err(|error| format!("HTTP model lookup failed: {error}"))?;

    if response.status() != 200 {
        return Err(format!(
            "HTTP model lookup failed with status {}.",
            response.status()
        ));
    }

    let payload: OllamaTagsResponse = response
        .into_json()
        .map_err(|error| format!("Unable to parse Ollama model list: {error}"))?;
    let models = payload
        .models
        .unwrap_or_default()
        .into_iter()
        .filter_map(|model| model.name)
        .collect::<Vec<_>>();

    if models.is_empty() {
        return Err("No Ollama models found via HTTP.".to_string());
    }

    Ok(models)
}

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}

#[derive(Deserialize)]
struct OllamaModel {
    name: Option<String>,
}

#[tauri::command]
fn list_ollama_models_native() -> Result<Vec<String>, String> {
    eprintln!("[ghost_writer] list_ollama_models_native invoked");
    ensure_ollama_running();

    let cli_models = list_ollama_models_via_cli();
    if let Ok(models) = &cli_models {
        eprintln!(
            "[ghost_writer] list_ollama_models_native returning {} model(s) via CLI",
            models.len()
        );
        return Ok(models.clone());
    }
    let cli_error = cli_models
        .err()
        .unwrap_or_else(|| "Unknown CLI lookup error.".to_string());

    let http_models = list_ollama_models_via_http();
    if let Ok(models) = &http_models {
        eprintln!(
            "[ghost_writer] list_ollama_models_native returning {} model(s) via HTTP",
            models.len()
        );
        return Ok(models.clone());
    }
    let http_error = http_models
        .err()
        .unwrap_or_else(|| "Unknown HTTP lookup error.".to_string());

    let combined_error = format!("CLI lookup failed: {cli_error} | HTTP lookup failed: {http_error}");
    eprintln!("[ghost_writer] list_ollama_models_native failed: {combined_error}");
    Err(combined_error)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![list_ollama_models_native])
        .setup(|_| {
            tauri::async_runtime::spawn_blocking(ensure_ollama_running);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
