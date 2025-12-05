import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useSettings } from '../contexts/SettingsContext';
import { useConnection } from '../stores/ConnectionStore';
import ModelTable from './SettingModal/ModelTable';
import DiagnosticsPanel from './SettingModal/DiagnosticsPanel';

const SettingsModal = () => {
  const modalOpen = useSettings(s => s.settingsModal);
  const toggleSettingsModal = useSettings(s => s.toggleSettingsModal);
  const { settings: { url, model }, setUrl, setModel } = useSettings();

  const {
    connecting,
    version,
    error,
    models,
    reconnect,
  } = useConnection();

  const [isReconnecting, setIsReconnecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [urlInput, setUrlInput] = useState<string>(url);
  const [urlError, setUrlError] = useState<boolean>(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const previousActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;

    // mount animation
    setMounted(true);

    // focus first focusable element inside modal after open
    requestAnimationFrame(() => {
      const el = modalRef.current;
      if (!el) return;
      const focusable = el.querySelector<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? el).focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMounted(false);
        // small delay to allow animation, then close
        setTimeout(() => toggleSettingsModal(), 180);
      }
      if (e.key === "Tab") {
        // basic focus trap
        const container = modalRef.current;
        if (!container) return;
        const focusables = Array.from(container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )).filter(Boolean);
        if (focusables.length === 0) return;
        const idx = focusables.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && idx === 0) {
          focusables[focusables.length - 1].focus();
          e.preventDefault();
        } else if (!e.shiftKey && idx === focusables.length - 1) {
          focusables[0].focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      try { previousActiveRef.current?.focus(); } catch { }
    };
  }, [modalOpen, toggleSettingsModal]);

  if (!modalOpen) return null;

  const onOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setMounted(false);
      setTimeout(() => toggleSettingsModal(), 160);
    }
  };

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const statusLabel = !connecting && !error ? `Connected • v${version ?? "—"}` :
    connecting && !error ? "Connecting…" :
      !connecting && error ? "Failed" : "Connecting…";

  const errorMessage = error?.message ?? null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={onOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black/30 backdrop-blur-sm p-6"
      aria-hidden={false}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className={`w-full max-w-5xl bg-white/80 dark:bg-[#0b0b0b]/80 backdrop-filter backdrop-blur-sm rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/5 outline-none transform transition-all duration-180 ease-out ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800/50 select-none">
          <div>
            <h2 id="settings-modal-title" className="text-sm font-semibold">Settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{`Connection: ${statusLabel}`}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReconnect}
              disabled={isReconnecting || connecting}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm flex items-center gap-2 transition-colors
                ${isReconnecting || connecting ? 'bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              aria-live="polite"
            >
              {connecting || isReconnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Retry
            </button>
            <button
              onClick={() => { setMounted(false); setTimeout(() => toggleSettingsModal(), 140); }}
              aria-label="Close settings"
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">
          <div className="py-4 pt-0">
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Ollama Host</label>
            <input
              className={`w-full bg-gray-100 dark:bg-gray-900 border rounded p-2 text-sm ${urlError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
              value={urlInput}
              onChange={e => {
                const val = e.target.value;
                setUrlInput(val);
                const isValid = /^https?:\/\/[a-zA-Z0-9.-]+(?:\:[0-9]+)?$/.test(val);
                setUrlError(!isValid && val.length > 0);
                if (isValid) setUrl(val);
              }}
              placeholder="http://localhost:11434"
            />
            {urlError && (
              <p className="mt-1 text-xs text-red-500">Invalid URL — use e.g. http://localhost:11434</p>
            )}
          </div>
          {error && (
            <DiagnosticsPanel />
          )}
          {!error && (
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Models</h3>
              <ModelTable connectionStatus={connecting ? "connecting" : "ok"} models={models} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
