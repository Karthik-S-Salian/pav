import { create } from "zustand";
import { api, type DirEntry } from "../lib/tauri";

export type ViewMode = "list" | "grid";
export type SortKey = "name" | "size" | "modified" | "type";
export type SortDir = "asc" | "desc";

interface Clipboard {
  paths: string[];
  mode: "copy" | "cut";
}

interface FileState {
  currentPath: string;
  past: string[];
  future: string[];
  entries: DirEntry[];
  loading: boolean;
  error: string | null;

  selection: Set<string>;
  lastClickedPath: string | null;
  clipboard: Clipboard | null;

  viewMode: ViewMode;
  sortBy: SortKey;
  sortDir: SortDir;
  showHidden: boolean;
  search: string;

  navigate: (path: string) => Promise<void>;
  back: () => Promise<void>;
  forward: () => Promise<void>;
  up: () => Promise<void>;
  refresh: () => Promise<void>;

  select: (path: string) => void;
  toggleSelect: (path: string) => void;
  rangeSelect: (path: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  setClipboard: (paths: string[], mode: "copy" | "cut") => void;
  paste: () => Promise<void>;

  setViewMode: (mode: ViewMode) => void;
  setSort: (key: SortKey) => void;
  setShowHidden: (v: boolean) => void;
  setSearch: (v: string) => void;
}

function sortEntries(
  entries: DirEntry[],
  sortBy: SortKey,
  sortDir: SortDir,
): DirEntry[] {
  const sign = sortDir === "asc" ? 1 : -1;
  const cmp = (a: DirEntry, b: DirEntry) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    switch (sortBy) {
      case "size": {
        const av = a.is_dir ? (a.item_count ?? 0) : a.size;
        const bv = b.is_dir ? (b.item_count ?? 0) : b.size;
        return sign * (av - bv);
      }
      case "modified":
        return sign * (a.modified_ms - b.modified_ms);
      case "type": {
        const ea = a.extension ?? "";
        const eb = b.extension ?? "";
        const c = ea.localeCompare(eb);
        return sign * (c !== 0 ? c : a.name.localeCompare(b.name));
      }
      default:
        return sign * a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
          numeric: true,
        });
    }
  };
  return [...entries].sort(cmp);
}

export const useFileStore = create<FileState>((set, get) => ({
  currentPath: "",
  past: [],
  future: [],
  entries: [],
  loading: false,
  error: null,

  selection: new Set(),
  lastClickedPath: null,
  clipboard: null,

  viewMode: "list",
  sortBy: "name",
  sortDir: "asc",
  showHidden: false,
  search: "",

  async navigate(path: string) {
    const { currentPath, past } = get();
    set({ loading: true, error: null });
    try {
      const raw = await api.listDir(path, get().showHidden);
      const entries = sortEntries(raw, get().sortBy, get().sortDir);
      set({
        currentPath: path,
        past: currentPath && currentPath !== path ? [...past, currentPath] : past,
        future: [],
        entries,
        selection: new Set(),
        lastClickedPath: null,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: String(e) });
    }
  },

  async back() {
    const { past, currentPath, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({ past: past.slice(0, -1), future: [currentPath, ...future] });
    try {
      const raw = await api.listDir(prev, get().showHidden);
      set({
        currentPath: prev,
        entries: sortEntries(raw, get().sortBy, get().sortDir),
        selection: new Set(),
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async forward() {
    const { future, currentPath, past } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({ future: future.slice(1), past: [...past, currentPath] });
    try {
      const raw = await api.listDir(next, get().showHidden);
      set({
        currentPath: next,
        entries: sortEntries(raw, get().sortBy, get().sortDir),
        selection: new Set(),
      });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  async up() {
    const { currentPath } = get();
    if (!currentPath) return;
    const parent = await api.parentDir(currentPath);
    if (parent) await get().navigate(parent);
  },

  async refresh() {
    const { currentPath } = get();
    if (!currentPath) return;
    try {
      const raw = await api.listDir(currentPath, get().showHidden);
      set({ entries: sortEntries(raw, get().sortBy, get().sortDir) });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  select(path) {
    set({ selection: new Set([path]), lastClickedPath: path });
  },

  toggleSelect(path) {
    const s = new Set(get().selection);
    if (s.has(path)) s.delete(path);
    else s.add(path);
    set({ selection: s, lastClickedPath: path });
  },

  rangeSelect(path) {
    const { entries, lastClickedPath, selection } = get();
    if (!lastClickedPath) {
      set({ selection: new Set([path]), lastClickedPath: path });
      return;
    }
    const a = entries.findIndex((e) => e.path === lastClickedPath);
    const b = entries.findIndex((e) => e.path === path);
    if (a === -1 || b === -1) {
      set({ selection: new Set([path]), lastClickedPath: path });
      return;
    }
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const next = new Set(selection);
    for (let i = lo; i <= hi; i++) next.add(entries[i].path);
    set({ selection: next });
  },

  selectAll() {
    set({ selection: new Set(get().entries.map((e) => e.path)) });
  },

  clearSelection() {
    set({ selection: new Set(), lastClickedPath: null });
  },

  setClipboard(paths, mode) {
    set({ clipboard: { paths, mode } });
  },

  async paste() {
    const { clipboard, currentPath } = get();
    if (!clipboard || !currentPath) return;
    try {
      if (clipboard.mode === "copy") {
        await api.copyPaths(clipboard.paths, currentPath);
      } else {
        await api.movePaths(clipboard.paths, currentPath);
        set({ clipboard: null });
      }
      await get().refresh();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  setViewMode(mode) {
    set({ viewMode: mode });
  },

  setSort(key) {
    const { sortBy, sortDir, entries } = get();
    const dir: SortDir = sortBy === key && sortDir === "asc" ? "desc" : "asc";
    set({
      sortBy: key,
      sortDir: dir,
      entries: sortEntries(entries, key, dir),
    });
  },

  setShowHidden(v) {
    set({ showHidden: v });
    void get().refresh();
  },

  setSearch(v) {
    set({ search: v });
  },
}));
