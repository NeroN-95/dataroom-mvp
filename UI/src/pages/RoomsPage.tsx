import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, FolderPlus, Files, HardDrive } from 'lucide-react';
import { AppHeader } from '../components/AppHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import {
  useRooms,
  useCreateRoom,
  useRenameRoom,
  useDeleteRoom,
} from '../hooks/requests/useRooms';
import { apiError } from '../lib/api';
import { formatBytes, formatDate } from '../lib/format';
import type { DataRoom } from '../lib/types';

export function RoomsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { data: rooms, isLoading } = useRooms();
  const createRoom = useCreateRoom();
  const renameRoom = useRenameRoom();
  const deleteRoom = useDeleteRoom();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<DataRoom | null>(null);
  const [deleting, setDeleting] = useState<DataRoom | null>(null);

  const create = async () => {
    if (!name.trim()) return;
    try {
      const room = await createRoom.mutateAsync(name.trim());
      setCreateOpen(false);
      setName('');
      navigate(`/rooms/${room.id}`);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  if (isLoading) return <FullPageSpinner />;

  const list = rooms ?? [];

  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8" onClick={() => setMenuFor(null)}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              Data Rooms
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Secure repositories for your documents
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={18} /> New Data Room
          </Button>
        </div>

        {list.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((room) => (
              <div
                key={room.id}
                onClick={() => navigate(`/rooms/${room.id}`)}
                className="group relative cursor-pointer rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:ring-brand-200 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-brand-800"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                    <HardDrive size={20} />
                  </div>
                  <button
                    aria-label="Room actions"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === room.id ? null : room.id);
                    }}
                    className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 group-hover:opacity-100 dark:hover:bg-slate-800"
                  >
                    <MoreVertical size={18} />
                  </button>
                  {menuFor === room.id && (
                    <div
                      className="absolute right-4 top-12 z-10 w-32 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="block w-full px-3 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                        onClick={() => {
                          setRenaming(room);
                          setName(room.name);
                          setMenuFor(null);
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={() => {
                          setDeleting(room);
                          setMenuFor(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="truncate font-semibold text-slate-800 dark:text-slate-100">
                  {room.name}
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Created {formatDate(room.createdAt)}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Files size={14} /> {room.stats?.fileCount ?? 0} files
                  </span>
                  <span className="flex items-center gap-1">
                    <FolderPlus size={14} /> {room.stats?.folderCount ?? 0} folders
                  </span>
                  <span className="ml-auto">{formatBytes(room.stats?.totalSize ?? 0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Data Room"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create}>Create</Button>
          </>
        }
      >
        <Input
          autoFocus
          placeholder="e.g. Acme Acquisition"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
      </Modal>

      <Modal
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title="Rename Data Room"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!renaming) return;
                try {
                  await renameRoom.mutateAsync({ id: renaming.id, name: name.trim() });
                  setRenaming(null);
                } catch (e) {
                  toast.error(apiError(e));
                }
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Data Room?"
        danger
        confirmLabel="Delete"
        body={
          <>
            <strong>{deleting?.name}</strong> and all {deleting?.stats?.fileCount ?? 0}{' '}
            files / {deleting?.stats?.folderCount ?? 0} folders inside it will be
            permanently deleted. This cannot be undone.
          </>
        }
        onConfirm={async () => {
          if (!deleting) return;
          await deleteRoom.mutateAsync(deleting.id);
          toast.success('Data Room deleted');
        }}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 py-20 text-center dark:border-slate-800 dark:bg-slate-900/40">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
        <HardDrive size={28} />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">
        No Data Rooms yet
      </h3>
      <p className="mb-5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Create your first Data Room to start organizing and sharing documents.
      </p>
      <Button onClick={onCreate}>
        <Plus size={18} /> New Data Room
      </Button>
    </div>
  );
}
