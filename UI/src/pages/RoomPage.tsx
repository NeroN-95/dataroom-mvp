import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { RoomToolbar } from '../components/RoomToolbar';
import { FileDropOverlay } from '../components/FileDropOverlay';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EntryTable } from '../components/EntryTable';
import { EntryMenu } from '../components/EntryMenu';
import { InfiniteSentinel } from '../components/InfiniteSentinel';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { FullPageSpinner } from '../components/ui/Spinner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ShareDialog } from '../components/ShareDialog';
import { MoveDialog } from '../components/MoveDialog';
import { FileViewer } from '../components/FileViewer';
import { UploadTray } from '../components/UploadTray';
import { useToast } from '../components/ui/Toast';
import { useRoom } from '../hooks/requests/useRooms';
import { useListing } from '../hooks/requests/useListing';
import { useSearch } from '../hooks/requests/useSearch';
import { useEntryMutations } from '../hooks/requests/useEntryMutations';
import { useUploads } from '../hooks/requests/useUploads';
import { useFileDrop } from '../hooks/ui/useFileDrop';
import { NodesApi, apiError } from '../lib/api';
import type { Entry, FileEntry, FolderEntry } from '../lib/types';

export function RoomPage() {
  const { roomId = '' } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data: room, isError } = useRoom(roomId);
  const listing = useListing(roomId, folderId);
  const searchResults = useSearch(roomId, search);
  const mut = useEntryMutations(roomId);
  const uploads = useUploads(() => mut.invalidate());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = (files: File[]) => {
    if (files.length) uploads.upload(roomId, folderId, files);
  };
  const { isDragging, onDrop } = useFileDrop(uploadFiles);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [renameEntry, setRenameEntry] = useState<Entry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteEntry, setDeleteEntry] = useState<Entry | null>(null);
  const [deleteCounts, setDeleteCounts] = useState<{ f: number; d: number } | null>(null);
  const [moveEntry, setMoveEntry] = useState<Entry | null>(null);
  const [viewFile, setViewFile] = useState<FileEntry | null>(null);
  const [shareTarget, setShareTarget] = useState<
    { nodeId: string; name: string } | null
  >(null);

  const searching = search.trim().length > 0;
  const rootLabel = room?.name ?? 'Data Room';
  const currentFolderName = listing.folder?.name;

  if (isError) {
    navigate('/');
    return null;
  }

  const run = async (p: Promise<unknown>, ok?: string) => {
    try {
      await p;
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const createFolder = async () => {
    if (!folderName.trim()) return;
    await run(mut.createFolder.mutateAsync({ name: folderName.trim(), parentId: folderId }));
    setNewFolderOpen(false);
    setFolderName('');
  };

  const doRename = async () => {
    if (!renameEntry) return;
    await run(mut.rename.mutateAsync({ id: renameEntry.id, name: renameValue.trim() }));
    setRenameEntry(null);
  };

  const openDelete = async (entry: Entry) => {
    setDeleteEntry(entry);
    setDeleteCounts(null);
    if (entry.type === 'folder') {
      const preview = await NodesApi.deletePreview(entry.id).catch(() => null);
      if (preview) setDeleteCounts({ f: preview.fileCount, d: preview.folderCount });
    }
  };

  const confirmDelete = async () => {
    if (!deleteEntry) return;
    await run(mut.remove.mutateAsync(deleteEntry.id), 'Deleted');
  };

  const rowActions = (entry: Entry) => (
    <EntryMenu
      items={[
        {
          label: 'Rename',
          onClick: () => {
            setRenameEntry(entry);
            setRenameValue(entry.name);
          },
        },
        { label: 'Move', onClick: () => setMoveEntry(entry) },
        {
          label: 'Share',
          onClick: () => setShareTarget({ nodeId: entry.id, name: entry.name }),
        },
        { label: 'Delete', danger: true, onClick: () => openDelete(entry) },
      ]}
    />
  );

  const searchEntries = useMemo<Entry[]>(() => searchResults.files, [searchResults.files]);

  if (listing.isLoading && !searching) return <FullPageSpinner />;

  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <RoomToolbar
          search={search}
          onSearch={setSearch}
          onBack={() => navigate('/')}
          onNewFolder={() => setNewFolderOpen(true)}
          onUpload={() => fileInputRef.current?.click()}
          onShare={() =>
            setShareTarget(
              folderId && currentFolderName
                ? { nodeId: folderId, name: currentFolderName }
                : room?.rootId
                  ? { nodeId: room.rootId, name: rootLabel }
                  : null,
            )
          }
        />

        {searching ? (
          <div>
            <div className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Search results for{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">“{search}”</span>
            </div>
            <EntryTable
              entries={searchEntries}
              onOpenFolder={() => {}}
              onOpenFile={(f) => setViewFile(f)}
              renderActions={rowActions}
              emptyLabel={searchResults.isLoading ? 'Searching…' : 'No files match your search'}
            />
            <InfiniteSentinel
              hasNextPage={!!searchResults.hasNextPage}
              isFetchingNextPage={searchResults.isFetchingNextPage}
              fetchNextPage={searchResults.fetchNextPage}
            />
          </div>
        ) : (
          <>
            <Breadcrumbs
              rootLabel={rootLabel}
              crumbs={listing.breadcrumb}
              onNavigate={setFolderId}
            />
            <div className="mt-3" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
              <EntryTable
                entries={listing.items}
                onOpenFolder={(f: FolderEntry) => setFolderId(f.id)}
                onOpenFile={(f: FileEntry) => setViewFile(f)}
                renderActions={rowActions}
              />
              <InfiniteSentinel
                hasNextPage={!!listing.hasNextPage}
                isFetchingNextPage={listing.isFetchingNextPage}
                fetchNextPage={listing.fetchNextPage}
              />
            </div>
          </>
        )}
      </main>

      <FileDropOverlay
        active={isDragging}
        label={currentFolderName ? `into “${currentFolderName}”` : 'to this Data Room'}
        onDrop={onDrop}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) uploadFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />

      <UploadTray items={uploads.items} onDismiss={uploads.clear} />

      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="New folder"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder}>Create</Button>
          </>
        }
      >
        <Input
          autoFocus
          placeholder="Folder name"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createFolder()}
        />
      </Modal>

      <Modal
        open={!!renameEntry}
        onClose={() => setRenameEntry(null)}
        title={`Rename ${renameEntry?.type}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenameEntry(null)}>
              Cancel
            </Button>
            <Button onClick={doRename}>Save</Button>
          </>
        }
      >
        <Input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doRename()}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteEntry}
        title={`Delete ${deleteEntry?.type}?`}
        danger
        confirmLabel="Delete"
        body={
          deleteEntry?.type === 'folder' ? (
            <>
              Deleting <strong>{deleteEntry.name}</strong> will permanently remove{' '}
              {deleteCounts
                ? `${deleteCounts.f} file(s) and ${deleteCounts.d} subfolder(s)`
                : 'its contents'}
              . This cannot be undone.
            </>
          ) : (
            <>
              <strong>{deleteEntry?.name}</strong> will be permanently deleted.
            </>
          )
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleteEntry(null)}
      />

      {moveEntry && (
        <MoveDialog
          entry={moveEntry}
          roomName={rootLabel}
          onClose={() => setMoveEntry(null)}
          onDoMove={async (target) => {
            await mut.move.mutateAsync({ id: moveEntry.id, targetParentId: target });
            toast.success('Moved');
          }}
        />
      )}

      {shareTarget && (
        <ShareDialog
          nodeId={shareTarget.nodeId}
          nodeName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}

      {viewFile && (
        <FileViewer
          name={viewFile.name}
          mimeType={viewFile.mimeType ?? 'application/octet-stream'}
          load={() => NodesApi.content(viewFile.id)}
          onClose={() => setViewFile(null)}
        />
      )}
    </div>
  );
}
