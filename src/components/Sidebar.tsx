import { useEffect, useState } from "react";
import {
  Download,
  FileText,
  Folder,
  HardDrive,
  Home,
  Image,
  Monitor,
  Music,
  Trash2,
  Video,
  type LucideIcon,
} from "lucide-react";
import { api, type Drive, type Location } from "../lib/tauri";
import { useFileStore } from "../store/useFileStore";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  desktop: Monitor,
  documents: FileText,
  downloads: Download,
  pictures: Image,
  music: Music,
  videos: Video,
  trash: Trash2,
};

export function Sidebar() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const currentPath = useFileStore((s) => s.currentPath);
  const navigate = useFileStore((s) => s.navigate);

  useEffect(() => {
    void api.commonLocations().then(setLocations);
    void api.getDrives().then(setDrives).catch(() => setDrives([]));
  }, []);

  return (
    <aside className="w-56 shrink-0 h-full overflow-y-auto bg-app-sidebar border-r border-app-border py-2 select-none">
      <SidebarSection title="Places">
        {locations.map((loc) => {
          const Icon = ICONS[loc.icon] ?? Folder;
          return (
            <SidebarItem
              key={loc.path}
              icon={Icon}
              label={loc.name}
              active={currentPath === loc.path}
              onClick={() => void navigate(loc.path)}
            />
          );
        })}
      </SidebarSection>
      {drives.length > 0 && (
        <SidebarSection title="Drives">
          {drives.map((d) => (
            <SidebarItem
              key={d.path}
              icon={HardDrive}
              label={d.name}
              active={currentPath === d.path}
              onClick={() => void navigate(d.path)}
            />
          ))}
        </SidebarSection>
      )}
    </aside>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="px-3 pb-1 text-[11px] uppercase tracking-wide text-app-muted">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 px-3 py-1.5 text-left " +
        (active
          ? "bg-app-accent text-white"
          : "hover:bg-app-hover text-app-text")
      }
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
