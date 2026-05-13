import { useEffect, useRef } from "react";
import {
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Pencil,
  Scissors,
  Terminal,
  Trash2,
} from "lucide-react";

export interface MenuItem {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="fixed z-50 min-w-[180px] rounded-md border border-app-border bg-app-panel shadow-lg py-1 text-sm"
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="my-1 h-px bg-app-border" />
        ) : (
          <button
            key={i}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            className={
              "w-full flex items-center gap-2 px-3 py-1.5 text-left " +
              (item.disabled
                ? "text-app-muted opacity-50"
                : "hover:bg-app-accent hover:text-white")
            }
          >
            <item.icon size={14} />
            <span>{item.label}</span>
          </button>
        ),
      )}
    </div>
  );
}

export const ICONS = {
  open: ExternalLink,
  rename: Pencil,
  copy: Copy,
  cut: Scissors,
  paste: ClipboardPaste,
  copyPath: ClipboardCopy,
  terminal: Terminal,
  trash: Trash2,
};
