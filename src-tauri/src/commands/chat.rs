use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use futures::StreamExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    stream: bool,
}

#[derive(Debug, Deserialize)]
struct OllamaChatChunk {
    message: Option<OllamaChunkMessage>,
    done: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct OllamaChunkMessage {
    content: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct ChatTokenPayload {
    token: String,
    conversation_id: String,
}

#[derive(Debug, Serialize, Clone)]
struct ChatDonePayload {
    conversation_id: String,
}

#[tauri::command]
pub async fn stream_chat(
    app: AppHandle,
    model: String,
    messages: Vec<ChatMessage>,
    conversation_id: String,
) -> Result<(), String> {
    let client = reqwest::Client::new();

    let body = OllamaChatRequest {
        model,
        messages,
        stream: true,
    };

    let response = client
        .post("http://localhost:11434/api/chat")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned status {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete JSON lines
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Ok(parsed) = serde_json::from_str::<OllamaChatChunk>(&line) {
                if let Some(msg) = &parsed.message {
                    if let Some(content) = &msg.content {
                        if !content.is_empty() {
                            let _ = app.emit("chat-token", ChatTokenPayload {
                                token: content.clone(),
                                conversation_id: conversation_id.clone(),
                            });
                        }
                    }
                }

                if parsed.done.unwrap_or(false) {
                    let _ = app.emit("chat-done", ChatDonePayload {
                        conversation_id: conversation_id.clone(),
                    });
                    return Ok(());
                }
            }
        }
    }

    let _ = app.emit("chat-done", ChatDonePayload {
        conversation_id: conversation_id.clone(),
    });

    Ok(())
}
