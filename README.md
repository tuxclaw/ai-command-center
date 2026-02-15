# AI Command Center

A local AI chat desktop app built with Tauri 2 + React. Connects to [Ollama](https://ollama.ai) — no API keys needed.

## Features

- 💬 **Chat with streaming** — real-time token streaming via Tauri events
- 🤖 **Model selector** — switch between installed Ollama models
- 📝 **Conversation history** — SQLite-backed (rusqlite) chat persistence
- 📊 **System monitor** — CPU, RAM (sysinfo crate), and Ollama status
- 🌙 **Dark theme** — sleek modern UI with Tailwind CSS
- 🖥️ **Markdown rendering** — code blocks with syntax highlighting

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) toolchain
- [Ollama](https://ollama.ai) running locally on port 11434
- System deps for Tauri: `webkit2gtk`, `libappindicator`, etc.

## Development

```bash
npm install
cargo tauri dev
```

## Build

```bash
cargo tauri build
```

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Tauri 2 (Rust) — reqwest, rusqlite, sysinfo
- **AI:** Ollama (local)
