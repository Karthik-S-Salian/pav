import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Eye,
  EyeOff,
  FolderPlus,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
} from "lucide-react";
import { useFileStore } from "../store/useFileStore";

interface Props {
  onNewFolder: () => void;
}

export function Toolbar({ onNewFolder }: Props) {
  const past = useFileStore((s) => s.past);
  const future = useFileStore((s) => s.future);
  const viewMode = useFileStore((s) => s.viewMode);
  const showHidden = useFileStore((s) => s.showHidden);
  const search = useFileStore((s) => s.search);
  const back = useFileStore((s) => s.back);
  const forward = useFileStore((s) => s.forward);
  const up = useFileStore((s) => s.up);
  const refresh = useFileStore((s) => s.refresh);
  const setViewMode = useFileStore((s) => s.setViewMode);
  const setShowHidden = useFileStore((s) => s.setShowHidden);
  const setSearch = useFileStore((s) => s.setSearch);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-app-border bg-app-panel">
      <IconBtn onClick={() => void back()} disabled={past.length === 0} title="Back (Alt+←)">
        <ArrowLeft size={16} />
      </IconBtn>
      <IconBtn
        onClick={() => void forward()}
        disabled={future.length === 0}
        title="Forward (Alt+→)"
      >
        <ArrowRight size={16} />
      </IconBtn>
      <IconBtn onClick={() => void up()} title="Up (Backspace)">
        <ArrowUp size={16} />
      </IconBtn>
      <IconBtn onClick={() => void refresh()} title="Refresh (Ctrl/Cmd+R)">
        <RefreshCw size={16} />
      </IconBtn>

      <div className="w-px h-5 bg-app-border mx-1" />

      <IconBtn onClick={onNewFolder} title="New folder (Ctrl/Cmd+N)">
        <FolderPlus size={16} />
      </IconBtn>

      <div className="flex-1" />

      <div className="relative">
        <Search
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-app-muted"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter"
          className="pl-7 pr-2 py-1 text-xs rounded bg-app-bg border border-app-border focus:outline-none focus:border-app-accent w-40"
        />
      </div>

      <IconBtn
        onClick={() => setShowHidden(!showHidden)}
        title={showHidden ? "Hide hidden files" : "Show hidden files"}
        active={showHidden}
      >
        {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
      </IconBtn>

      <div className="w-px h-5 bg-app-border mx-1" />

      <div className="flex rounded overflow-hidden border border-app-border">
        <IconBtn
          onClick={() => setViewMode("list")}
          active={viewMode === "list"}
          title="List view"
          noBorder
        >
          <List size={16} />
        </IconBtn>
        <IconBtn
          onClick={() => setViewMode("grid")}
          active={viewMode === "grid"}
          title="Grid view"
          noBorder
        >
          <LayoutGrid size={16} />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
  active,
  noBorder,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
  noBorder?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={
        "p-1.5 rounded transition-colors " +
        (disabled
          ? "text-app-muted opacity-40 cursor-default"
          : active
            ? "bg-app-accent-soft text-app-accent"
            : "hover:bg-app-hover text-app-text") +
        (noBorder ? " rounded-none" : "")
      }
    >
      {children}
    </button>
  );
}
