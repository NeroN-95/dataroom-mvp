import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const MENU_WIDTH = 144;

export function EntryMenu({ items }: { items: MenuItem[] }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const top =
      r.bottom + 4 + 180 > window.innerHeight ? r.top - 4 - 180 : r.bottom + 4;
    setPos({ top, left: Math.max(8, r.right - MENU_WIDTH) });
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        !menuRef.current?.contains(t) &&
        !btnRef.current?.contains(t)
      ) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? setPos(null) : place())}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
        className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-200 focus:opacity-100 group-hover:opacity-100 data-[open=true]:opacity-100 dark:hover:bg-slate-700"
        data-open={open}
      >
        <MoreVertical size={18} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: MENU_WIDTH }}
            className="z-50 rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={() => {
                  setPos(null);
                  item.onClick();
                }}
                className={
                  'block w-full px-3 py-1.5 text-left text-sm focus:outline-none ' +
                  (item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40'
                    : 'text-slate-600 hover:bg-slate-50 focus:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus:bg-slate-700')
                }
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
