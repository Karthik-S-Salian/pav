import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  type LucideIcon,
} from "lucide-react";

export function formatBytes(n: number): string {
  if (n === 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function formatDate(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    year: sameYear ? undefined : "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const IMAGE = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "heic", "avif"]);
const VIDEO = new Set(["mp4", "mkv", "mov", "avi", "webm", "m4v", "wmv"]);
const AUDIO = new Set(["mp3", "wav", "flac", "ogg", "m4a", "aac", "opus"]);
const ARCHIVE = new Set(["zip", "tar", "gz", "bz2", "7z", "rar", "xz", "zst"]);
const CODE = new Set([
  "ts", "tsx", "js", "jsx", "rs", "go", "py", "rb", "java", "c", "cpp", "h",
  "hpp", "cs", "swift", "kt", "php", "html", "css", "scss", "json", "yaml",
  "yml", "toml", "sh", "zsh", "bash", "fish", "lua", "sql",
]);
const TEXT = new Set(["txt", "md", "mdx", "rst", "log", "csv", "tsv"]);

export function getFileIcon(
  isDir: boolean,
  ext: string | null | undefined,
): LucideIcon {
  if (isDir) return Folder;
  if (!ext) return File;
  if (IMAGE.has(ext)) return FileImage;
  if (VIDEO.has(ext)) return FileVideo;
  if (AUDIO.has(ext)) return FileAudio;
  if (ARCHIVE.has(ext)) return FileArchive;
  if (CODE.has(ext)) return FileCode;
  if (TEXT.has(ext)) return FileText;
  return File;
}
