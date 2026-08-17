import { useEffect, useState } from 'react';
import { Copy, Globe, Lock, Trash2, UserPlus, X } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Spinner } from './ui/Spinner';
import { useToast } from './ui/Toast';
import { SharesApi, apiError } from '../lib/api';
import type { Share } from '../lib/types';

interface Props {
  nodeId: string;
  nodeName: string;
  onClose: () => void;
}

export function ShareDialog({ nodeId, nodeName, onClose }: Props) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState<Share[]>([]);
  const [mode, setMode] = useState<'PUBLIC' | 'RESTRICTED'>('PUBLIC');
  const [emails, setEmails] = useState('');
  const [creating, setCreating] = useState(false);

  const refresh = () =>
    SharesApi.listForNode(nodeId)
      .then(setShares)
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, []);

  const create = async () => {
    setCreating(true);
    try {
      const grantEmails =
        mode === 'RESTRICTED'
          ? emails
              .split(/[\s,]+/)
              .map((e) => e.trim())
              .filter(Boolean)
          : undefined;
      const res = await SharesApi.create(nodeId, mode, grantEmails);
      if (res.notFoundEmails.length) {
        toast.error(
          `No account for: ${res.notFoundEmails.join(', ')} — they must sign up first`,
        );
      } else {
        toast.success('Share link created');
      }
      setEmails('');
      await refresh();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setCreating(false);
    }
  };

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  };

  const revoke = async (id: string) => {
    await SharesApi.revoke(id).catch((e) => toast.error(apiError(e)));
    toast.success('Access revoked');
    refresh();
  };

  const addGrant = async (shareId: string, email: string) => {
    if (!email.trim()) return;
    try {
      await SharesApi.addGrant(shareId, email.trim());
      refresh();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const removeGrant = async (shareId: string, userId: string) => {
    await SharesApi.removeGrant(shareId, userId).catch((e) =>
      toast.error(apiError(e)),
    );
    refresh();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Share “${nodeName}”`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('PUBLIC')}
            className={
              'flex items-center gap-2 rounded-lg border p-3 text-left text-sm ' +
              (mode === 'PUBLIC'
                ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40'
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')
            }
          >
            <Globe size={18} className="text-brand-600" />
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-100">Public link</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Anyone with the link</div>
            </div>
          </button>
          <button
            onClick={() => setMode('RESTRICTED')}
            className={
              'flex items-center gap-2 rounded-lg border p-3 text-left text-sm ' +
              (mode === 'RESTRICTED'
                ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40'
                : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800')
            }
          >
            <Lock size={18} className="text-brand-600" />
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-100">Restricted</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Only invited users</div>
            </div>
          </button>
        </div>

        {mode === 'RESTRICTED' && (
          <Input
            placeholder="Invite by email (comma or space separated)"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        )}

        <Button onClick={create} disabled={creating} className="w-full">
          {creating ? 'Creating…' : 'Create share link'}
        </Button>
      </div>

      <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Active links
        </h3>
        {loading ? (
          <Spinner className="h-4 w-4 text-slate-400" />
        ) : shares.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">No active shares yet.</p>
        ) : (
          <ul className="space-y-3">
            {shares.map((s) => (
              <ShareRow
                key={s.id}
                share={s}
                onCopy={copy}
                onRevoke={revoke}
                onAddGrant={addGrant}
                onRemoveGrant={removeGrant}
              />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function ShareRow({
  share,
  onCopy,
  onRevoke,
  onAddGrant,
  onRemoveGrant,
}: {
  share: Share;
  onCopy: (url: string) => void;
  onRevoke: (id: string) => void;
  onAddGrant: (shareId: string, email: string) => void;
  onRemoveGrant: (shareId: string, userId: string) => void;
}) {
  const [invite, setInvite] = useState('');
  return (
    <li className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="flex items-center gap-2">
        {share.mode === 'PUBLIC' ? (
          <Globe size={16} className="text-brand-600" />
        ) : (
          <Lock size={16} className="text-brand-600" />
        )}
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {share.mode === 'PUBLIC' ? 'Public link' : 'Restricted'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {share.url && (
            <Button size="sm" variant="ghost" onClick={() => onCopy(share.url!)}>
              <Copy size={14} /> Copy
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onRevoke(share.id)}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      </div>
      {share.url && (
        <div className="mt-1 truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {share.url}
        </div>
      )}
      {share.mode === 'RESTRICTED' && (
        <div className="mt-2 space-y-1">
          {share.grants.map((g) => (
            <div
              key={g.userId}
              className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
            >
              <span className="truncate">{g.email}</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                {g.role}
              </span>
              <button
                onClick={() => onRemoveGrant(share.id, g.userId)}
                className="ml-auto text-slate-400 hover:text-red-500"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <form
            className="mt-1 flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              onAddGrant(share.id, invite);
              setInvite('');
            }}
          >
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="Add email…"
              className="h-7 flex-1 rounded border border-slate-200 px-2 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="rounded p-1 text-brand-600 hover:bg-brand-50"
            >
              <UserPlus size={14} />
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
