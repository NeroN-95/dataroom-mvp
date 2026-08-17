import { Folder, FileText, File } from 'lucide-react';

export function FolderIcon({ size = 20 }: { size?: number }) {
  return <Folder size={size} className="text-brand-500" fill="currentColor" fillOpacity={0.15} />;
}

export function FileTypeIcon({ mimeType, size = 20 }: { mimeType: string; size?: number }) {
  if (mimeType === 'application/pdf') {
    return <FileText size={size} className="text-red-500" />;
  }
  return <File size={size} className="text-slate-400" />;
}
