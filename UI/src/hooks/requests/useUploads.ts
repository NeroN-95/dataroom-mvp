import { useState } from 'react';
import { NodesApi, apiError } from '../../lib/api';
import type { UploadItem } from '../../components/UploadTray';

export function useUploads(onSettled: () => void) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const upload = (
    roomId: string,
    folderId: string | null,
    files: File[],
  ) => {
    files.forEach((file) => {
      const id = crypto.randomUUID();
      setItems((list) => [
        ...list,
        { id, name: file.name, progress: 0, status: 'uploading' },
      ]);
      NodesApi.upload(roomId, folderId, file, (pct) => update(id, { progress: pct }))
        .then(() => {
          update(id, { status: 'done', progress: 100 });
          onSettled();
        })
        .catch((e) => update(id, { status: 'error', error: apiError(e) }));
    });
  };

  const clear = () => setItems([]);

  return { items, upload, clear };
}
