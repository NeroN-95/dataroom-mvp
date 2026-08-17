import { useEffect, useState } from 'react';
import { ChevronRight, Folder, CornerLeftUp } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { NodesApi, apiError } from '../lib/api';
import { useToast } from './ui/Toast';
import type { Entry, FolderEntry } from '../lib/types';

interface Props {
  entry: Entry;
  roomName: string;
  onClose: () => void;
  onDoMove: (targetFolderId: string | null) => Promise<void>;
}

export function MoveDialog({ entry, roomName, onClose, onDoMove }: Props) {
  const toast = useToast();
  const [stack, setStack] = useState<{ id: string; name: string }[]>([]);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const current = stack.length ? stack[stack.length - 1].id : null;

  const load = (append: boolean, cur: string | null) => {
    setLoading(true);
    const p = current
      ? NodesApi.children(current, cur)
      : NodesApi.root(entry.dataRoomId, cur);
    p.then((page) => {
      const subfolders = page.items.filter(
        (i): i is FolderEntry => i.type === 'folder' && i.id !== entry.id,
      );
      setFolders((prev) => (append ? [...prev, ...subfolders] : subfolders));
      setCursor(page.nextCursor);
    })
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(false, null);
  }, [current]);

  const enter = (f: FolderEntry) => setStack((s) => [...s, { id: f.id, name: f.name }]);
  const up = () => setStack((s) => s.slice(0, -1));
  const goRoot = () => setStack([]);
  const jumpTo = (idx: number) => setStack((s) => s.slice(0, idx + 1));

  const sameFolder = (entry.parentId ?? null) === current;

  const move = async () => {
    setBusy(true);
    try {
      await onDoMove(current);
      onClose();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Move “${entry.name}”`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={move} disabled={busy || sameFolder}>
            {busy ? 'Moving…' : sameFolder ? 'Already here' : 'Move here'}
          </Button>
        </>
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        <button
          onClick={goRoot}
          className="rounded px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {roomName}
        </button>
        {stack.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-slate-300 dark:text-slate-600" />
            <button
              onClick={() => jumpTo(i)}
              className="rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {c.name}
            </button>
          </span>
        ))}
      </div>

      <div className="h-56 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
        {loading && folders.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Spinner className="h-5 w-5 text-slate-400" />
          </div>
        ) : folders.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
            No subfolders here
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => enter(f)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <Folder size={16} className="text-brand-500" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>
              </li>
            ))}
            {cursor && (
              <li>
                <button
                  onClick={() => load(true, cursor)}
                  className="w-full px-3 py-2 text-center text-xs text-brand-600 hover:bg-brand-50"
                >
                  Load more
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      {current && (
        <button
          onClick={up}
          className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <CornerLeftUp size={14} /> Up one level
        </button>
      )}
    </Modal>
  );
}
