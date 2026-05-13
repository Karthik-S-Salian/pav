import { invoke } from "@tauri-apps/api/core";

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  is_symlink: boolean;
  size: number;
  modified_ms: number;
  extension: string | null;
  item_count: number | null;
}

export interface Location {
  name: string;
  path: string;
  icon: string;
}

export interface Drive {
  name: string;
  path: string;
}

export const api = {
  listDir: (path: string, showHidden: boolean) =>
    invoke<DirEntry[]>("list_dir", { path, showHidden }),
  pathExists: (path: string) => invoke<boolean>("path_exists", { path }),
  parentDir: (path: string) => invoke<string | null>("parent_dir", { path }),
  createDir: (parent: string, name: string) =>
    invoke<string>("create_dir", { parent, name }),
  rename: (from: string, to: string) =>
    invoke<void>("rename", { from, to }),
  moveToTrash: (paths: string[]) =>
    invoke<void>("move_to_trash", { paths }),
  copyPaths: (src: string[], destDir: string) =>
    invoke<void>("copy_paths", { src, destDir }),
  movePaths: (src: string[], destDir: string) =>
    invoke<void>("move_paths", { src, destDir }),
  homeDir: () => invoke<string>("home_dir"),
  commonLocations: () => invoke<Location[]>("common_locations"),
  getDrives: () => invoke<Drive[]>("get_drives"),
  openPath: (path: string) => invoke<void>("open_path", { path }),
  openTerminal: (path: string) => invoke<void>("open_terminal", { path }),
};
