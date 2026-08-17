import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import { apiError } from '../lib/api';
import { useTheme } from '../context/ThemeContext';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

export function GoogleSignInButton() {
  const { googleLogin } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;
    let cancelled = false;

    loadGis()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (res) => {
            try {
              await googleLogin(res.credential);
              navigate(params.get('redirect') || '/');
            } catch (e) {
              toast.error(apiError(e));
            }
          },
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: 320,
          logo_alignment: 'center',
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
  }, [theme]);

  if (!CLIENT_ID) return null;

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        or
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>
      {failed ? (
        <p className="text-center text-xs text-red-500">
          Couldn’t load Google sign-in.
        </p>
      ) : (
        <div ref={ref} className="flex justify-center" />
      )}
    </div>
  );
}
