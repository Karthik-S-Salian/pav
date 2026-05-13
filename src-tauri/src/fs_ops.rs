use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;

use serde::Serialize;

use crate::error::{AppError, AppResult};

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_symlink: bool,
    pub size: u64,
    pub modified_ms: i64,
    pub extension: Option<String>,
    pub item_count: Option<u64>,
}

fn is_hidden(name: &str) -> bool {
    name.starts_with('.')
}

fn count_items(path: &Path, show_hidden: bool) -> Option<u64> {
    let read = fs::read_dir(path).ok()?;
    let mut n: u64 = 0;
    for entry in read.flatten() {
        if !show_hidden {
            if let Some(name) = entry.file_name().to_str() {
                if is_hidden(name) {
                    continue;
                }
            }
        }
        n += 1;
    }
    Some(n)
}

fn modified_ms(meta: &fs::Metadata) -> i64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn entry_from_path(full: &Path, show_hidden: bool) -> Option<DirEntry> {
    let file_name = full.file_name()?.to_string_lossy().to_string();
    let meta = fs::symlink_metadata(full).ok()?;
    let ftype = meta.file_type();
    let is_symlink = ftype.is_symlink();
    let is_dir = if is_symlink {
        fs::metadata(full).map(|m| m.is_dir()).unwrap_or(false)
    } else {
        ftype.is_dir()
    };
    let size = if is_dir { 0 } else { meta.len() };
    let extension = full
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());
    let item_count = if is_dir {
        count_items(full, show_hidden)
    } else {
        None
    };
    Some(DirEntry {
        name: file_name,
        path: full.to_string_lossy().to_string(),
        is_dir,
        is_symlink,
        size,
        modified_ms: modified_ms(&meta),
        extension,
        item_count,
    })
}

#[cfg(target_os = "macos")]
fn list_dir_via_finder(path: &Path, show_hidden: bool) -> AppResult<Vec<DirEntry>> {
    let script = format!(
        r#"set out to ""
tell application "Finder"
    set theItems to items of (POSIX file "{p}" as alias)
    repeat with it in theItems
        set out to out & (POSIX path of (it as alias)) & linefeed
    end repeat
end tell
return out"#,
        p = path.to_string_lossy().replace('"', "\\\"")
    );
    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(AppError::Io)?;
    if !output.status.success() {
        return Err(AppError::PermissionDenied(path.to_string_lossy().to_string()));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut out = Vec::new();
    for line in stdout.lines() {
        let raw = line.trim_end_matches('/');
        if raw.is_empty() {
            continue;
        }
        let child = PathBuf::from(raw);
        if let Some(name) = child.file_name().and_then(|n| n.to_str()) {
            if !show_hidden && is_hidden(name) {
                continue;
            }
        }
        if let Some(e) = entry_from_path(&child, show_hidden) {
            out.push(e);
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn list_dir(path: String, show_hidden: bool) -> AppResult<Vec<DirEntry>> {
    let p = PathBuf::from(&path);
    if !p.exists() {
        return Err(AppError::NotFound(path));
    }
    let read = match fs::read_dir(&p) {
        Ok(r) => r,
        Err(e) => {
            #[cfg(target_os = "macos")]
            if matches!(
                e.kind(),
                std::io::ErrorKind::PermissionDenied | std::io::ErrorKind::Other
            ) {
                return list_dir_via_finder(&p, show_hidden);
            }
            return Err(AppError::Io(e));
        }
    };
    let mut out = Vec::new();
    for entry in read.flatten() {
        let file_name = entry.file_name().to_string_lossy().to_string();
        if !show_hidden && is_hidden(&file_name) {
            continue;
        }
        if let Some(e) = entry_from_path(&entry.path(), show_hidden) {
            out.push(e);
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn parent_dir(path: String) -> Option<String> {
    Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub fn create_dir(parent: String, name: String) -> AppResult<String> {
    let target = Path::new(&parent).join(&name);
    if target.exists() {
        return Err(AppError::AlreadyExists(target.to_string_lossy().to_string()));
    }
    fs::create_dir(&target)?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
pub fn rename(from: String, to: String) -> AppResult<()> {
    if Path::new(&to).exists() {
        return Err(AppError::AlreadyExists(to));
    }
    fs::rename(&from, &to)?;
    Ok(())
}

#[tauri::command]
pub fn move_to_trash(paths: Vec<String>) -> AppResult<()> {
    trash::delete_all(paths)?;
    Ok(())
}

fn copy_recursive(src: &Path, dest: &Path) -> AppResult<()> {
    if src.is_dir() {
        fs::create_dir_all(dest)?;
        for entry in fs::read_dir(src)?.flatten() {
            let child_src = entry.path();
            let child_dest = dest.join(entry.file_name());
            copy_recursive(&child_src, &child_dest)?;
        }
    } else {
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(src, dest)?;
    }
    Ok(())
}

fn unique_dest(dest_dir: &Path, name: &str) -> PathBuf {
    let initial = dest_dir.join(name);
    if !initial.exists() {
        return initial;
    }
    let (stem, ext) = match name.rsplit_once('.') {
        Some((s, e)) if !s.is_empty() => (s.to_string(), format!(".{e}")),
        _ => (name.to_string(), String::new()),
    };
    for i in 2..10000 {
        let candidate = dest_dir.join(format!("{stem} ({i}){ext}"));
        if !candidate.exists() {
            return candidate;
        }
    }
    initial
}

#[tauri::command]
pub fn copy_paths(src: Vec<String>, dest_dir: String) -> AppResult<()> {
    let dest = PathBuf::from(&dest_dir);
    if !dest.is_dir() {
        return Err(AppError::NotFound(dest_dir));
    }
    for s in src {
        let sp = PathBuf::from(&s);
        let Some(name) = sp.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let target = if sp.parent() == Some(dest.as_path()) {
            unique_dest(&dest, name)
        } else {
            let t = dest.join(name);
            if t.exists() {
                unique_dest(&dest, name)
            } else {
                t
            }
        };
        copy_recursive(&sp, &target)?;
    }
    Ok(())
}

#[tauri::command]
#[allow(clippy::needless_return)]
pub fn open_terminal(path: String) -> AppResult<()> {
    let p = PathBuf::from(&path);
    let dir = if p.is_dir() {
        p
    } else {
        p.parent().map(PathBuf::from).unwrap_or(p)
    };
    if !dir.exists() {
        return Err(AppError::NotFound(dir.to_string_lossy().to_string()));
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg("-a")
            .arg("Terminal")
            .arg(&dir)
            .spawn()
            .map_err(AppError::Io)?;
        return Ok(());
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", "cmd"])
            .current_dir(&dir)
            .spawn()
            .map_err(AppError::Io)?;
        return Ok(());
    }
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        let candidates = [
            "x-terminal-emulator",
            "gnome-terminal",
            "konsole",
            "xfce4-terminal",
            "alacritty",
            "kitty",
            "wezterm",
            "xterm",
        ];
        for term in candidates {
            if Command::new(term).current_dir(&dir).spawn().is_ok() {
                return Ok(());
            }
        }
        Err(AppError::Other("no terminal emulator found".into()))
    }
}

#[tauri::command]
pub fn move_paths(src: Vec<String>, dest_dir: String) -> AppResult<()> {
    let dest = PathBuf::from(&dest_dir);
    if !dest.is_dir() {
        return Err(AppError::NotFound(dest_dir));
    }
    for s in src {
        let sp = PathBuf::from(&s);
        let Some(name) = sp.file_name().and_then(|n| n.to_str()) else {
            continue;
        };
        let target = dest.join(name);
        if target == sp {
            continue;
        }
        let final_target = if target.exists() {
            unique_dest(&dest, name)
        } else {
            target
        };
        if fs::rename(&sp, &final_target).is_err() {
            copy_recursive(&sp, &final_target)?;
            if sp.is_dir() {
                fs::remove_dir_all(&sp)?;
            } else {
                fs::remove_file(&sp)?;
            }
        }
    }
    Ok(())
}
