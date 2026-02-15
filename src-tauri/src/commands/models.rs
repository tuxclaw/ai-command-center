use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use futures::StreamExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub digest: String,
    pub modified_at: String,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}

#[derive(Debug, Serialize, Clone)]
struct PullProgressPayload {
    status: String,
    completed: Option<u64>,
    total: Option<u64>,
}

#[tauri::command]
pub async fn list_models() -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: OllamaTagsResponse = resp.json().await.map_err(|e| e.to_string())?;
    Ok(data.models.unwrap_or_default())
}

#[tauri::command]
pub async fn pull_model(app: AppHandle, name: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let resp = client
        .post("http://localhost:11434/api/pull")
        .json(&serde_json::json!({ "name": name }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();
            if line.is_empty() { continue; }

            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&line) {
                let _ = app.emit("pull-progress", PullProgressPayload {
                    status: parsed["status"].as_str().unwrap_or("").to_string(),
                    completed: parsed["completed"].as_u64(),
                    total: parsed["total"].as_u64(),
                });
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_model(name: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    client
        .delete("http://localhost:11434/api/delete")
        .json(&serde_json::json!({ "name": name }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
