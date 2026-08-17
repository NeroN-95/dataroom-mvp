import type { ReactNode } from 'react';
import { FolderIcon, FileTypeIcon } from './EntryIcon';
import { formatBytes, formatDate } from '../lib/format';
import type { Entry, FileEntry, FolderEntry } from '../lib/types';

interface Props {
  entries: Entry[];
  onOpenFolder: (folder: FolderEntry) => void;
  onOpenFile: (file: FileEntry) => void;
  renderActions?: (entry: Entry) => ReactNode;
  emptyLabel?: string;
}

export function EntryTable({
  entries,
  onOpenFolder,
  onOpenFile,
  renderActions,
  emptyLabel = 'This folder is empty',
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Modified</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Size</th>
            {renderActions && <th className="w-10 px-4 py-2.5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {entries.map((entry) =>
            entry.type === 'folder' ? (
              <tr
                key={`folder-${entry.id}`}
                className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                onClick={() => onOpenFolder(entry)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onOpenFolder(entry)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <FolderIcon />
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {entry.name}
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-2.5 text-slate-400 sm:table-cell">
                  {formatDate(entry.updatedAt)}
                </td>
                <td className="hidden px-4 py-2.5 text-slate-400 sm:table-cell">—</td>
                {renderActions && (
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {renderActions(entry)}
                  </td>
                )}
              </tr>
            ) : (
              <tr
                key={`file-${entry.id}`}
                className="group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                onClick={() => onOpenFile(entry)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onOpenFile(entry)}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <FileTypeIcon mimeType={entry.mimeType ?? ''} />
                    <span className="text-slate-700 dark:text-slate-200">{entry.name}</span>
                  </div>
                </td>
                <td className="hidden px-4 py-2.5 text-slate-400 sm:table-cell">
                  {formatDate(entry.updatedAt)}
                </td>
                <td className="hidden px-4 py-2.5 text-slate-400 sm:table-cell">
                  {formatBytes(entry.size ?? 0)}
                </td>
                {renderActions && (
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    {renderActions(entry)}
                  </td>
                )}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
