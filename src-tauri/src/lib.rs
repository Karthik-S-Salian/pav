mod error;
mod fs_ops;
mod locations;

use tauri_plugin_opener::OpenerExt;

use crate::error::{AppError, AppResult};

#[tauri::command]
fn open_path(app: tauri::AppHandle, path: String) -> AppResult<()> {
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            fs_ops::list_dir,
            fs_ops::path_exists,
            fs_ops::parent_dir,
            fs_ops::create_dir,
            fs_ops::rename,
            fs_ops::move_to_trash,
            fs_ops::copy_paths,
            fs_ops::move_paths,
            fs_ops::open_terminal,
            locations::home_dir,
            locations::common_locations,
            locations::get_drives,
            open_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
