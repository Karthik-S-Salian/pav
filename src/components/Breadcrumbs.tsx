import { ChevronRight } from "lucide-react";
import { useFileStore } from "../store/useFileStore";

function splitPath(path: string): { label: string; path: string }[] {
  if (!path) return [];
  const isWin = /^[A-Za-z]:\\/.test(path) || path.includes("\\");
  const sep = isWin ? "\\" : "/";
  const parts = path.split(sep).filter(Boolean);
  const out: { label: string; path: string }[] = [];
  if (!isWin) {
    out.push({ label: "/", path: "/" });
  }
  let acc = isWin ? "" : "";
  for (let i = 0; i < parts.length; i++) {
    acc = isWin ? (i === 0 ? parts[0] : `${acc}${sep}${parts[i]}`) : `${acc}/${parts[i]}`;
    out.push({ label: parts[i], path: acc });
  }
  return out;
}

export function Breadcrumbs() {
  const currentPath = useFileStore((s) => s.currentPath);
  const navigate = useFileStore((s) => s.navigate);
  const parts = splitPath(currentPath);

  return (
    <div className="flex items-center gap-0.5 min-w-0 overflow-x-auto text-app-text">
      {parts.map((p, i) => (
        <div key={p.path} className="flex items-center gap-0.5">
          {i > 0 && <ChevronRight size={14} className="text-app-muted" />}
          <button
            onClick={() => void navigate(p.path)}
            className="px-2 py-1 rounded hover:bg-app-hover whitespace-nowrap"
          >
            {p.label}
          </button>
        </div>
      ))}
    </div>
  );
}
