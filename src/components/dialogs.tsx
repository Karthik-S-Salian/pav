import { useEffect, useRef, useState } from "react";

interface ShellProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

function DialogShell({ title, children, onClose }: ShellProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/30">
      <div className="w-[380px] rounded-md border border-app-border bg-app-panel shadow-xl">
        <div className="px-4 py-2 border-b border-app-border text-sm font-medium">
          {title}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

interface PromptProps {
  title: string;
  label: string;
  initial?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function PromptDialog({
  title,
  label,
  initial = "",
  submitLabel = "OK",
  onSubmit,
  onClose,
}: PromptProps) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initial) {
      const dot = initial.lastIndexOf(".");
      if (dot > 0) inputRef.current?.setSelectionRange(0, dot);
      else inputRef.current?.select();
    }
  }, [initial]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <DialogShell title={title} onClose={onClose}>
      <label className="block text-xs text-app-muted mb-1">{label}</label>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="w-full px-2 py-1.5 rounded border border-app-border bg-app-bg focus:outline-none focus:border-app-accent text-sm"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm rounded hover:bg-app-hover"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          className="px-3 py-1 text-sm rounded bg-app-accent text-white hover:opacity-90"
        >
          {submitLabel}
        </button>
      </div>
    </DialogShell>
  );
}

interface ConfirmProps {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
  onConfirm,
  onClose,
}: ConfirmProps) {
  return (
    <DialogShell title={title} onClose={onClose}>
      <p className="text-sm">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm rounded hover:bg-app-hover"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={
            "px-3 py-1 text-sm rounded text-white hover:opacity-90 " +
            (destructive ? "bg-red-600" : "bg-app-accent")
          }
        >
          {confirmLabel}
        </button>
      </div>
    </DialogShell>
  );
}
