mod commands;
mod db;

use db::DbState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let db_state = DbState::new(&app.handle())?;
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::chat::stream_chat,
            commands::models::list_models,
            commands::models::pull_model,
            commands::models::delete_model,
            commands::system::get_system_stats,
            db::list_conversations,
            db::get_conversation,
            db::create_conversation,
            db::save_message,
            db::delete_conversation,
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
