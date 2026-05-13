import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef, useState } from "react";
import { api, type DirEntry } from "../lib/tauri";
import { getFileIcon } from "../lib/format";
import { useFileStore } from "../store/useFileStore";

interface Props {
  entries: DirEntry[];
  onContextMenu: (e: React.MouseEvent, entry: DirEntry | null) => void;
}

const TILE = 112;
const ROW = 124;

export function FileGrid({ entries, onContextMenu }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(1);

  const selection = useFileStore((s) => s.selection);
  const select = useFileStore((s) => s.select);
  const toggleSelect = useFileStore((s) => s.toggleSelect);
  const rangeSelect = useFileStore((s) => s.rangeSelect);
  const clearSelection = useFileStore((s) => s.clearSelection);
  const navigate = useFileStore((s) => s.navigate);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const recompute = () => {
      const w = el.clientWidth;
      setCols(Math.max(1, Math.floor(w / TILE)));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowCount = Math.ceil(entries.length / cols);

  const virt = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW,
    overscan: 4,
  });

  function handleTileClick(e: React.MouseEvent, entry: DirEntry) {
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

  function handleTileDouble(entry: DirEntry) {
    if (!entry.is_dir) void api.openPath(entry.path);
  }

  return (
    <div
      ref={parentRef}
      className="flex-1 min-h-0 overflow-auto bg-app-panel p-3"
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
        style={{
          height: virt.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virt.getVirtualItems().map((v) => {
          const rowStart = v.index * cols;
          const rowEntries = entries.slice(rowStart, rowStart + cols);
          return (
            <div
              key={v.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: v.size,
                transform: `translateY(${v.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {rowEntries.map((entry) => {
                const Icon = getFileIcon(entry.is_dir, entry.extension);
                const selected = selection.has(entry.path);
                return (
                  <div
                    key={entry.path}
                    onClick={(e) => handleTileClick(e, entry)}
                    onDoubleClick={() => handleTileDouble(entry)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!selection.has(entry.path)) select(entry.path);
                      onContextMenu(e, entry);
                    }}
                    className={
                      "flex flex-col items-center justify-start pt-3 pb-2 px-1 rounded cursor-default " +
                      (selected
                        ? "bg-app-accent text-white"
                        : "hover:bg-app-hover")
                    }
                  >
                    <Icon
                      size={44}
                      strokeWidth={1.25}
                      className={
                        selected
                          ? ""
                          : entry.is_dir
                            ? "text-app-accent"
                            : "text-app-muted"
                      }
                    />
                    <span
                      className="mt-2 text-xs text-center break-words line-clamp-2 px-1"
                      title={entry.name}
                    >
                      {entry.name}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
