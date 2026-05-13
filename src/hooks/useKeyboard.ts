import { useEffect } from "react";
import { api } from "../lib/tauri";
import { useFileStore } from "../store/useFileStore";

interface Opts {
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function useKeyboard({ onNewFolder, onRename, onDelete }: Opts) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      const s = useFileStore.getState();
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        s.selectAll();
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        if (s.selection.size > 0) {
          s.setClipboard([...s.selection], "copy");
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "x") {
        if (s.selection.size > 0) {
          s.setClipboard([...s.selection], "cut");
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        void s.paste();
        return;
      }
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        onNewFolder();
        return;
      }
      if (mod && e.key.toLowerCase() === "r") {
        e.preventDefault();
        void s.refresh();
        return;
      }
      if (e.key === "F2") {
        if (s.selection.size === 1) onRename();
        return;
      }
      if (e.key === "Delete" || (e.key === "Backspace" && mod)) {
        if (s.selection.size > 0) onDelete();
        return;
      }
      if (e.key === "Backspace") {
        void s.up();
        return;
      }
      if (e.key === "Enter") {
        if (s.selection.size === 1) {
          const p = [...s.selection][0];
          const entry = s.entries.find((x) => x.path === p);
          if (!entry) return;
          if (entry.is_dir) void s.navigate(entry.path);
          else void api.openPath(entry.path);
        }
        return;
      }
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        void s.back();
        return;
      }
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        void s.forward();
        return;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewFolder, onRename, onDelete]);
}
