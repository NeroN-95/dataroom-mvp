import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Spinner } from './ui/Spinner';
import { apiError } from '../lib/api';

interface Props {
  name: string;
  mimeType: string;
  load: () => Promise<Blob>;
  onClose: () => void;
}

export function FileViewer({ name, mimeType, load, onClose }: Props) {
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');
  const previewable = isPdf || isImage;

  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!previewable) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    load()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e) => !cancelled && setError(apiError(e)));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const download = async () => {
    try {
      setError(null);
      setDownloading(true);
      const href = url ?? URL.createObjectURL(await load());
      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (href !== url) setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="truncate text-sm font-medium">{name}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={download}
            disabled={downloading}
            className="rounded-md p-2 hover:bg-white/10 disabled:opacity-50"
            title="Download"
          >
            {downloading ? (
              <Spinner className="h-[18px] w-[18px] text-white" />
            ) : (
              <Download size={18} />
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-white/10"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        {error ? (
          <p className="text-sm text-red-200">{error}</p>
        ) : !previewable ? (
          <div className="text-center text-white">
            <p className="mb-3 text-sm">Preview isn't available for this file type.</p>
            <button
              onClick={download}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
            >
              <Download size={16} />
              {downloading ? 'Downloading…' : `Download ${name}`}
            </button>
          </div>
        ) : !url ? (
          <Spinner className="h-6 w-6 text-white" />
        ) : isPdf ? (
          <iframe title={name} src={url} className="h-full w-full rounded-lg bg-white" />
        ) : (
          <img src={url} alt={name} className="max-h-full max-w-full rounded-lg" />
        )}
      </div>
    </div>
  );
}
