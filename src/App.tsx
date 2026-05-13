import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { FileList } from "./components/FileList";
import { FileGrid } from "./components/FileGrid";
import { ContextMenu, ICONS, type MenuItem } from "./components/ContextMenu";
import { ConfirmDialog, PromptDialog } from "./components/dialogs";
import { useKeyboard } from "./hooks/useKeyboard";
import { api, type DirEntry } from "./lib/tauri";
import { useFileStore } from "./store/useFileStore";

interface MenuState {
  x: number;
  y: number;
  entry: DirEntry | null;
}

export default function App() {
  const currentPath = useFileStore((s) => s.currentPath);
  const entries = useFileStore((s) => s.entries);
  const loading = useFileStore((s) => s.loading);
  const error = useFileStore((s) => s.error);
  const viewMode = useFileStore((s) => s.viewMode);
  const search = useFileStore((s) => s.search);
  const selection = useFileStore((s) => s.selection);
  const clipboard = useFileStore((s) => s.clipboard);
  const navigate = useFileStore((s) => s.navigate);
  const refresh = useFileStore((s) => s.refresh);
  const setClipboard = useFileStore((s) => s.setClipboard);
  const paste = useFileStore((s) => s.paste);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DirEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);

  useEffect(() => {
    void (async () => {
      const home = await api.homeDir();
      await navigate(home);
    })();
  }, [navigate]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, search]);

  const openRename = useCallback(() => {
    const { selection: s, entries: es } = useFileStore.getState();
    if (s.size !== 1) return;
    const [p] = [...s];
    const entry = es.find((e) => e.path === p);
    if (entry) setRenameTarget(entry);
  }, []);

  const openDelete = useCallback(() => {
    const { selection: s } = useFileStore.getState();
    if (s.size === 0) return;
    setConfirmDelete([...s]);
  }, []);

  useKeyboard({
    onNewFolder: () => setNewFolderOpen(true),
    onRename: openRename,
    onDelete: openDelete,
  });

  function onContextMenu(e: React.MouseEvent, entry: DirEntry | null) {
    setMenu({ x: e.clientX, y: e.clientY, entry });
  }

  function menuItems(): MenuItem[] {
    const sel = [...selection];
    const hasSel = sel.length > 0;
    const items: MenuItem[] = [];

    if (menu?.entry) {
      items.push({
        label: menu.entry.is_dir ? "Open" : "Open with default app",
        icon: ICONS.open,
        onClick: () => {
          if (menu.entry!.is_dir) void navigate(menu.entry!.path);
          else void api.openPath(menu.entry!.path);
        },
      });
    }
    items.push({
      label: "Copy",
      icon: ICONS.copy,
      disabled: !hasSel,
      onClick: () => setClipboard(sel, "copy"),
    });
    items.push({
      label: "Cut",
      icon: ICONS.cut,
      disabled: !hasSel,
      onClick: () => setClipboard(sel, "cut"),
    });
    items.push({
      label: "Paste",
      icon: ICONS.paste,
      disabled: !clipboard,
      onClick: () => void paste(),
    });
    const pathToCopy = hasSel
      ? sel.join("\n")
      : !menu?.entry && currentPath
        ? currentPath
        : null;
    if (pathToCopy) {
      items.push({
        label: hasSel && sel.length > 1 ? "Copy as Paths" : "Copy as Path",
        icon: ICONS.copyPath,
        onClick: () => void navigator.clipboard.writeText(pathToCopy),
      });
    }
    const terminalTarget =
      menu?.entry && menu.entry.is_dir
        ? menu.entry.path
        : !menu?.entry && currentPath
          ? currentPath
          : null;
    if (terminalTarget) {
      items.push({ divider: true, label: "", icon: ICONS.open, onClick: () => {} });
      items.push({
        label: "Open in Terminal",
        icon: ICONS.terminal,
        onClick: () => void api.openTerminal(terminalTarget),
      });
    }
    if (selection.size === 1) {
      items.push({ divider: true, label: "", icon: ICONS.open, onClick: () => {} });
      items.push({
        label: "Rename",
        icon: ICONS.rename,
        onClick: openRename,
      });
    }
    if (hasSel) {
      items.push({
        label: "Move to Trash",
        icon: ICONS.trash,
        onClick: openDelete,
      });
    }
    return items;
  }

  async function handleCreateFolder(name: string) {
    if (!currentPath) return;
    try {
      await api.createDir(currentPath, name);
      await refresh();
    } catch (e) {
      useFileStore.setState({ error: String(e) });
    }
    setNewFolderOpen(false);
  }

  async function handleRename(name: string) {
    const entry = renameTarget;
    if (!entry) return;
    const sep = entry.path.includes("\\") ? "\\" : "/";
    const idx = entry.path.lastIndexOf(sep);
    const parent = idx >= 0 ? entry.path.slice(0, idx) : "";
    const to = parent ? `${parent}${sep}${name}` : name;
    try {
      await api.rename(entry.path, to);
      await refresh();
    } catch (e) {
      useFileStore.setState({ error: String(e) });
    }
    setRenameTarget(null);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await api.moveToTrash(confirmDelete);
      await refresh();
    } catch (e) {
      useFileStore.setState({ error: String(e) });
    }
    setConfirmDelete(null);
  }

  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Toolbar onNewFolder={() => setNewFolderOpen(true)} />
        <div className="px-2 py-1 border-b border-app-border bg-app-panel">
          <Breadcrumbs />
        </div>
        {error && (
          <div className="px-3 py-1.5 text-xs bg-red-50 text-red-700 border-b border-red-200">
            {error}
            <button
              onClick={() => useFileStore.setState({ error: null })}
              className="ml-2 underline"
            >
              dismiss
            </button>
          </div>
        )}
        {loading && (
          <div className="px-3 py-1 text-xs text-app-muted">loading…</div>
        )}
        {viewMode === "list" ? (
          <FileList entries={filtered} onContextMenu={onContextMenu} />
        ) : (
          <FileGrid entries={filtered} onContextMenu={onContextMenu} />
        )}
        <div className="px-3 py-1 border-t border-app-border bg-app-panel text-xs text-app-muted flex justify-between">
          <span>
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
            {selection.size > 0 && ` · ${selection.size} selected`}
          </span>
          {clipboard && (
            <span>
              Clipboard: {clipboard.paths.length} · {clipboard.mode}
            </span>
          )}
        </div>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems()}
          onClose={() => setMenu(null)}
        />
      )}
      {newFolderOpen && (
        <PromptDialog
          title="New folder"
          label="Folder name"
          initial="untitled folder"
          submitLabel="Create"
          onSubmit={handleCreateFolder}
          onClose={() => setNewFolderOpen(false)}
        />
      )}
      {renameTarget && (
        <PromptDialog
          title="Rename"
          label="New name"
          initial={renameTarget.name}
          submitLabel="Rename"
          onSubmit={handleRename}
          onClose={() => setRenameTarget(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Move to Trash"
          message={
            confirmDelete.length === 1
              ? `Move “${confirmDelete[0].split(/[\\/]/).pop()}” to the Trash?`
              : `Move ${confirmDelete.length} items to the Trash?`
          }
          confirmLabel="Move to Trash"
          destructive
          onConfirm={handleDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
