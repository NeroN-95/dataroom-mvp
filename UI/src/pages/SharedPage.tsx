import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { FolderLock, Eye, Lock } from 'lucide-react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { EntryTable } from '../components/EntryTable';
import { InfiniteSentinel } from '../components/InfiniteSentinel';
import { FileViewer } from '../components/FileViewer';
import { Button } from '../components/ui/Button';
import { FullPageSpinner } from '../components/ui/Spinner';
import { SharedApi } from '../lib/api';
import { qk } from '../lib/queryKeys';
import type { Entry, FileEntry, FolderEntry, Listing, SharedResource } from '../lib/types';

function statusFrom(err: unknown): 'login' | 'forbidden' | 'notfound' {
  if (axios.isAxiosError(err)) {
    const s = err.response?.status;
    if (s === 401) return 'login';
    if (s === 403) return 'forbidden';
  }
  return 'notfound';
}

export function SharedPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [folderId, setFolderId] = useState<string | null>(null);
  const [viewFile, setViewFile] = useState<FileEntry | null>(null);

  const resolveQ = useQuery({
    queryKey: qk.shared(token),
    queryFn: () => SharedApi.resolve(token),
    retry: false,
  });

  const resource = resolveQ.data as SharedResource | undefined;
  const isFileShare = resource?.nodeType === 'FILE' && !!resource.file;

  const browseQ = useInfiniteQuery({
    queryKey: qk.sharedBrowse(token, folderId),
    enabled: !!resource && !isFileShare,
    retry: false,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => SharedApi.browse(token, folderId, pageParam),
    getNextPageParam: (last: Listing) => last.nextCursor ?? undefined,
  });

  if (resolveQ.isLoading) return <FullPageSpinner />;

  if (resolveQ.isError || !resource) {
    const status = statusFrom(resolveQ.error);
    if (status === 'login') {
      return (
        <Gate
          icon={<Lock className="text-brand-600" />}
          title="This link is restricted"
          body="Sign in with an account that has been granted access to view it."
          action={
            <Link to={`/login?redirect=/shared/${token}`}>
              <Button>Sign in</Button>
            </Link>
          }
        />
      );
    }
    if (status === 'forbidden') {
      return (
        <Gate
          icon={<Lock className="text-red-500" />}
          title="No access"
          body="Your account hasn't been granted access to this shared item."
        />
      );
    }
    return (
      <Gate
        icon={<FolderLock className="text-slate-400" />}
        title="Link not found"
        body="This share link is invalid or has been revoked by the owner."
      />
    );
  }

  const items: Entry[] = browseQ.data?.pages.flatMap((p) => p.items) ?? [];
  const breadcrumb = browseQ.data?.pages[0]?.breadcrumb ?? [];

  return (
    <div className="min-h-full">
      <SharedHeader resource={resource} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {isFileShare ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h2 className="mb-1 font-semibold text-slate-800 dark:text-slate-100">
              {resource.file!.name}
            </h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              A single file was shared with you.
            </p>
            <Button onClick={() => setViewFile(resource.file)}>
              <Eye size={16} /> Open file
            </Button>
          </div>
        ) : (
          <>
            <Breadcrumbs
              rootLabel={resource.resource.name}
              crumbs={breadcrumb}
              onNavigate={setFolderId}
            />
            <div className="mt-3">
              <EntryTable
                entries={items}
                onOpenFolder={(f: FolderEntry) => setFolderId(f.id)}
                onOpenFile={(f: FileEntry) => setViewFile(f)}
              />
              <InfiniteSentinel
                hasNextPage={!!browseQ.hasNextPage}
                isFetchingNextPage={browseQ.isFetchingNextPage}
                fetchNextPage={browseQ.fetchNextPage}
              />
            </div>
          </>
        )}
      </main>

      {viewFile && (
        <FileViewer
          name={viewFile.name}
          mimeType={viewFile.mimeType ?? 'application/octet-stream'}
          load={() => SharedApi.content(token, viewFile.id)}
          onClose={() => setViewFile(null)}
        />
      )}
    </div>
  );
}

function SharedHeader({ resource }: { resource: SharedResource }) {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <FolderLock size={18} />
        </span>
        <div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {resource.resource.name}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Shared by {resource.owner.name}
          </div>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          <Eye size={13} /> Read-only
        </span>
      </div>
    </header>
  );
}

function Gate({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
          {icon}
        </div>
        <h1 className="mb-1 text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{body}</p>
        {action}
      </div>
    </div>
  );
}
