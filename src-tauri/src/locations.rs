use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::AppResult;

#[derive(Serialize)]
pub struct Location {
    pub name: String,
    pub path: String,
    pub icon: String,
}

#[derive(Serialize)]
pub struct Drive {
    pub name: String,
    pub path: String,
}

fn home() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Some(p) = std::env::var_os("USERPROFILE") {
            return PathBuf::from(p);
        }
    }
    if let Some(p) = std::env::var_os("HOME") {
        return PathBuf::from(p);
    }
    PathBuf::from("/")
}

#[tauri::command]
pub fn home_dir() -> String {
    home().to_string_lossy().to_string()
}

fn child(parent: &Path, name: &str) -> Option<String> {
    let p = parent.join(name);
    if p.is_dir() {
        Some(p.to_string_lossy().to_string())
    } else {
        None
    }
}

#[tauri::command]
pub fn common_locations() -> Vec<Location> {
    let h = home();
    let mut out = vec![Location {
        name: "Home".into(),
        path: h.to_string_lossy().to_string(),
        icon: "home".into(),
    }];
    let candidates = [
        ("Desktop", "desktop"),
        ("Documents", "documents"),
        ("Downloads", "downloads"),
        ("Pictures", "pictures"),
        ("Music", "music"),
        ("Videos", "videos"),
    ];
    for (name, icon) in candidates {
        if let Some(path) = child(&h, name) {
            out.push(Location {
                name: name.into(),
                path,
                icon: icon.into(),
            });
        }
    }
    if let Some(trash) = trash_path(&h) {
        out.push(Location {
            name: "Trash".into(),
            path: trash,
            icon: "trash".into(),
        });
    }
    out
}

fn trash_path(home: &Path) -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        let p = home.join(".Trash");
        if p.exists() {
            return Some(p.to_string_lossy().to_string());
        }
        None
    }
    #[cfg(target_os = "windows")]
    {
        let _ = home;
        None
    }
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        if let Some(xdg) = std::env::var_os("XDG_DATA_HOME") {
            let p = PathBuf::from(xdg).join("Trash/files");
            if p.is_dir() {
                return Some(p.to_string_lossy().to_string());
            }
        }
        let p = home.join(".local/share/Trash/files");
        if p.is_dir() {
            Some(p.to_string_lossy().to_string())
        } else {
            None
        }
    }
}

#[tauri::command]
#[allow(clippy::needless_return)]
pub fn get_drives() -> AppResult<Vec<Drive>> {
    #[cfg(target_os = "macos")]
    {
        let mut out = Vec::new();
        if let Ok(read) = std::fs::read_dir("/Volumes") {
            for entry in read.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                let path = entry.path().to_string_lossy().to_string();
                out.push(Drive { name, path });
            }
        }
        return Ok(out);
    }
    #[cfg(target_os = "windows")]
    {
        let mut out = Vec::new();
        for letter in b'A'..=b'Z' {
            let root = format!("{}:\\", letter as char);
            if std::path::Path::new(&root).exists() {
                out.push(Drive {
                    name: format!("{}:", letter as char),
                    path: root,
                });
            }
        }
        return Ok(out);
    }
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        Ok(vec![Drive {
            name: "/".into(),
            path: "/".into(),
        }])
    }
}
