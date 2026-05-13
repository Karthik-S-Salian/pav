import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef } from "react";
import { api, type DirEntry } from "../lib/tauri";
import { formatBytes, formatDate, getFileIcon } from "../lib/format";
import {
  useFileStore,
  type SortKey,
} from "../store/useFileStore";

interface Props {
  entries: DirEntry[];
  onContextMenu: (e: React.MouseEvent, entry: DirEntry | null) => void;
}

const ROW = 28;

export function FileList({ entries, onContextMenu }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const selection = useFileStore((s) => s.selection);
  const select = useFileStore((s) => s.select);
  const toggleSelect = useFileStore((s) => s.toggleSelect);
  const rangeSelect = useFileStore((s) => s.rangeSelect);
  const clearSelection = useFileStore((s) => s.clearSelection);
  const navigate = useFileStore((s) => s.navigate);
  const sortBy = useFileStore((s) => s.sortBy);
  const sortDir = useFileStore((s) => s.sortDir);
  const setSort = useFileStore((s) => s.setSort);

  const virt = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW,
    overscan: 12,
  });

  function handleRowClick(e: React.MouseEvent, entry: DirEntry) {
    if (e.shiftKey) {
      rangeSelect(entry.path);
      return;
    }
    if (e.metaKey || e.ctrlKey) {
      toggleSelect(entry.path);
      return;
    }
    if (entry.is_dir) void navigate(entry.path);
    else select(entry.path);
  }

  function handleRowDouble(entry: DirEntry) {
    if (!entry.is_dir) void api.openPath(entry.path);
  }

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-app-panel"
      onClick={(e) => {
        if (e.target === e.currentTarget) clearSelection();
      }}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          clearSelection();
          onContextMenu(e, null);
        }
      }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_100px_170px_80px] border-b border-app-border bg-app-sidebar text-[11px] text-app-muted uppercase tracking-wide select-none">
        <ColHeader label="Name" col="name" sortBy={sortBy} sortDir={sortDir} onSort={setSort} />
        <ColHeader label="Size" col="size" sortBy={sortBy} sortDir={sortDir} onSort={setSort} />
        <ColHeader label="Modified" col="modified" sortBy={sortBy} sortDir={sortDir} onSort={setSort} />
        <ColHeader label="Type" col="type" sortBy={sortBy} sortDir={sortDir} onSort={setSort} />
      </div>

      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) clearSelection();
        }}
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            clearSelection();
            onContextMenu(e, null);
          }
        }}
      >
        <div
          style={{ height: virt.getTotalSize(), position: "relative", width: "100%" }}
        >
          {virt.getVirtualItems().map((v) => {
            const entry = entries[v.index];
            const Icon = getFileIcon(entry.is_dir, entry.extension);
            const selected = selection.has(entry.path);
            return (
              <div
                key={entry.path}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: v.size,
                  transform: `translateY(${v.start}px)`,
                }}
                className={
                  "grid grid-cols-[minmax(0,1fr)_100px_170px_80px] items-center px-2 cursor-default " +
                  (selected
                    ? "bg-app-accent text-white"
                    : "hover:bg-app-hover")
                }
                onClick={(e) => handleRowClick(e, entry)}
                onDoubleClick={() => handleRowDouble(entry)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!selection.has(entry.path)) select(entry.path);
                  onContextMenu(e, entry);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon
                    size={16}
                    className={
                      selected
                        ? "shrink-0"
                        : entry.is_dir
                          ? "shrink-0 text-app-accent"
                          : "shrink-0 text-app-muted"
                    }
                  />
                  <span className="truncate">{entry.name}</span>
                </div>
                <div
                  className={
                    "text-xs " + (selected ? "" : "text-app-muted")
                  }
                >
                  {entry.is_dir
                    ? entry.item_count == null
                      ? "—"
                      : `${entry.item_count} item${entry.item_count === 1 ? "" : "s"}`
                    : formatBytes(entry.size)}
                </div>
                <div
                  className={
                    "text-xs " + (selected ? "" : "text-app-muted")
                  }
                >
                  {formatDate(entry.modified_ms)}
                </div>
                <div
                  className={
                    "text-xs truncate " +
                    (selected ? "" : "text-app-muted")
                  }
                >
                  {entry.is_dir ? "Folder" : entry.extension ?? ""}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ColHeader({
  label,
  col,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortBy: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortBy === col;
  return (
    <button
      className="flex items-center gap-1 px-2 py-1.5 text-left hover:bg-app-hover"
      onClick={() => onSort(col)}
    >
      <span>{label}</span>
      {active &&
        (sortDir === "asc" ? (
          <ChevronUp size={12} />
        ) : (
          <ChevronDown size={12} />
        ))}
    </button>
  );
}
