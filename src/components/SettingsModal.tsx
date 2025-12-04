import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { useSettings } from '../contexts/SettingsContext';
import { useConnection } from '../stores/ConnectionStore';
import { OllamaTagModel } from '../api/Ollama';

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function humanizeRelative(iso?: string) {
  if (!iso) return "—";
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = Math.floor((then - now) / 1000); // seconds (negative if past)
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

    const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [30, "day"],
      [12, "month"],
      [Number.POSITIVE_INFINITY, "year"],
    ];

    let duration = diff;
    for (let i = 0; i < divisions.length; i++) {
      const [amount, unit] = divisions[i];
      if (Math.abs(duration) < amount) {
        return rtf.format(Math.round(duration), unit);
      }
      duration = Math.round(duration / amount);
    }
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const SettingsModal = () => {
  const modalOpen = useSettings(s => s.settingsModal);
  const toggleSettingsModal = useSettings(s => s.toggleSettingsModal);
  const { settings: { url, model }, setUrl, setModel } = useSettings();

  const { status, version, error, models, reconnect } = useConnection();
  const [isReconnecting, setIsReconnecting] = useState(false);

  // for entrance animation
  const [mounted, setMounted] = useState(false);

  // focus trap refs
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
      // restore focus
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
            <p className="text-xs text-gray-500 dark:text-gray-400">{`Connection: ${status}${status === 'Connected' && version ? ` • v${version}` : ''}`}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReconnect}
              disabled={isReconnecting || status === "Connecting"}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm flex items-center gap-2 transition-colors
                ${isReconnecting || status === "Connecting" ? 'bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              aria-live="polite"
            >
              {status === "Connecting" || isReconnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reconnect
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

        <div className="p-5 space-y-6">
          {status === "Offline" && error && (
            <div className="p-4 border border-red-100 dark:border-red-900 rounded text-sm text-red-600">
              Failed to connect: <span className="font-mono">{error}</span>
            </div>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Ollama Host</label>
              <input
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="http://localhost:11434"
              />
              <p className="text-xs text-yellow-600 mt-1">Requires <code>OLLAMA_ORIGINS="https://briancraig.github.io"</code> env var on server.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Model Name</label>
              <input
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="llama3.2, mistral, etc."
              />
            </div>
          </div>

          {/* Models list */}
          <div>
            <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Models</h3>

            {status === "Connecting" && (!models || models.length === 0) ? (
              <div className="p-4 border border-gray-100 dark:border-gray-800 rounded text-sm text-gray-500 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                <span>Loading models…</span>
              </div>
            ) : status === "Offline" && error ? (
              <div className="p-4 border border-red-100 dark:border-red-900 rounded text-sm text-red-600">
                Failed to connect
              </div>
            ) : (models && models.length > 0) ? (
              <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-[#0f0f0f]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Model</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Quantization</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Parameters</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Disk usage</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m: OllamaTagModel) => (
                      <tr key={m.digest} className="odd:bg-white even:bg-gray-50 dark:odd:bg-[#090909] dark:even:bg-[#0b0b0b]">
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{m.digest.slice(0, 8)}</div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm text-gray-700 dark:text-gray-300 font-mono">{m.model}</div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{m.details?.format ?? m.details?.family ?? '—'}</div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{m.details?.quantization_level ?? '—'}</div>
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <div className="text-sm text-gray-700 dark:text-gray-300 font-mono">{m.details?.parameter_size ?? '—'}</div>
                        </td>
                        <td className="px-3 py-2 align-top text-right">
                          <div className="text-sm text-gray-700 dark:text-gray-300 font-mono">{formatBytes(m.size)}</div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm text-gray-600 dark:text-gray-400">{humanizeRelative(m.modified_at)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 border border-gray-100 dark:border-gray-800 rounded text-sm text-gray-500">
                No models found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;