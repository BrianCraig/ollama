import { useEffect, useRef, useState } from "react";
import { RefreshCw, X, Copy } from "lucide-react";
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

  const {
    connectionStatus,
    version,
    errorRecord,
    models,
    reconnect,
  } = useConnection();

  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  const handleReconnect = async (light = false) => {
    setIsReconnecting(true);
    try {
      await reconnect(light);
    } finally {
      setIsReconnecting(false);
    }
  };

  // OS detection
  const ua = typeof navigator !== "undefined" ? (navigator.userAgent || "") : "";
  const platform = typeof navigator !== "undefined" ? (navigator.platform || "") : "";
  const detectOS = () => {
    const u = ua.toLowerCase();
    const p = platform.toLowerCase();
    if (u.includes("windows") || p.includes("win")) return "Windows";
    if (u.includes("mac") || p.includes("mac")) return "macOS";
    if (u.includes("linux") || p.includes("linux")) return "Linux";
    return "Unknown";
  };
  const detectedOS = detectOS();

  const host = url ? url.replace(/\/+$/, "") : "http://localhost:11434";
  const curlWithOrigin = `curl '${host}/api/version' -H 'Origin: https://briancraig.github.io' -i`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { }
      ta.remove();
    }
  };

  const runQuickTest = async () => {
    setIsTesting(true);
    try {
      await reconnect(true);
    } finally {
      setIsTesting(false);
    }
  };

  const statusLabel = connectionStatus === "ok" ? `Connected • v${version ?? "—"}` :
    connectionStatus === "connecting" ? "Connecting…" :
    connectionStatus === "failed" ? "Failed" : "Idle";

  const errorMessage = errorRecord?.message ?? null;

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
              onClick={() => handleReconnect(false)}
              disabled={isReconnecting || connectionStatus === "connecting"}
              className={`px-3 py-1.5 text-xs font-medium rounded-sm flex items-center gap-2 transition-colors
                ${isReconnecting || connectionStatus === "connecting" ? 'bg-gray-100 dark:bg-gray-900 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              aria-live="polite"
            >
              {connectionStatus === "connecting" || isReconnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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

        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Diagnostic tutorial when failed */}
          {connectionStatus === "failed" && (
            <section className="p-4 border border-red-100 dark:border-red-900 rounded text-sm text-gray-800 dark:text-gray-200">
              <div>
                <h3 className="text-sm font-semibold">Connection diagnostics</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Detected OS: <span className="font-mono">{detectedOS}</span>
                </p>
                <p className="mt-3 text-sm">
                  The same low-level error can mean one of three things. Follow the steps and the quick curl test below to identify which applies:
                </p>
                <ol className="mt-2 list-decimal list-inside text-sm space-y-1">
                  <li><strong>Ollama is not running at domain:port</strong> — curl will show a connection error (e.g. "Failed to connect").</li>
                  <li><strong>Ollama is running but CORS origins not configured</strong> — curl with an Origin header returns <code>HTTP/1.1 403 Forbidden</code> and no body.</li>
                  <li><strong>Ollama accepts the origin but the browser blocks access</strong> — curl returns <code>200 OK</code> and an <code>Access-Control-Allow-Origin</code> header but the browser still blocks access.</li>
                </ol>

                <div className="mt-4 text-xs text-gray-500 mb-1">Quick test (copy & run)</div>
                <div className="bg-gray-50 dark:bg-[#0b0b0b] rounded p-2 font-mono text-xs break-words">
                  <div className="mb-2">{curlWithOrigin}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(curlWithOrigin)}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-xs flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={runQuickTest}
                      disabled={isTesting}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                    >
                      {isTesting ? "Testing…" : "Run quick test"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-semibold">Canonical expected responses</h4>
                <div className="mt-2 text-xs space-y-2">
                  <div className="bg-white dark:bg-[#090909] border border-gray-100 dark:border-gray-800 rounded p-2">
                    <div className="font-mono text-[13px]">curl: (7) Failed to connect to localhost port 11434 ... Could not connect to server</div>
                    <div className="text-gray-500 text-[12px] mt-1">Interpretation: Ollama is not running at domain:port.</div>
                  </div>

                  <div className="bg-white dark:bg-[#090909] border border-gray-100 dark:border-gray-800 rounded p-2">
                    <div className="font-mono text-[13px]">HTTP/1.1 403 Forbidden
Content-Length: 0</div>
                    <div className="text-gray-500 text-[12px] mt-1">Interpretation: Ollama is running but CORS origins not configured (OLLAMA_ORIGINS missing or incorrect).</div>
                  </div>

                  <div className="bg-white dark:bg-[#090909] border border-gray-100 dark:border-gray-800 rounded p-2">
                    <div className="font-mono text-[13px]">HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://briancraig.github.io
{`{ "version": "..." }`}</div>
                    <div className="text-gray-500 text-[12px] mt-1">Interpretation: Ollama accepts the origin; the browser is blocking access (page setting, extension, rule, or blocked localhost).</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-semibold">OS-specific fixes & commands</h4>
                <div className="mt-2 text-xs space-y-2">
                  {detectedOS === "Linux" && (
                    <div className="bg-white dark:bg-[#090909] border border-gray-100 dark:border-gray-800 rounded p-3">
                      <div className="font-medium">Linux</div>
                      <div className="mt-2">
                        <div className="font-mono text-[13px]">Start Ollama (systemd):</div>
                        <div className="mt-1"><code className="font-mono">sudo systemctl start ollama</code> — start the Ollama service</div>

                        <div className="mt-2 font-mono text-[13px]">If using Docker:</div>
                        <div className="mt-1"><code className="font-mono">docker run --rm -p 11434:11434 ollama/ollama</code> — start container exposing port</div>

                        <div className="mt-2 font-mono text-[13px]">Set OLLAMA_ORIGINS and restart:</div>
                        <div className="mt-1"><code className="font-mono">export OLLAMA_ORIGINS="https://briancraig.github.io" && sudo systemctl restart ollama</code></div>
                      </div>
                    </div>
                  )}

                  {detectedOS === "macOS" && (
                    <div className="bg-white dark:bg-[#090909] border border-gray-100 dark:border-gray-800 rounded p-3">
                      <div className="font-medium">macOS</div>
                      <div className="mt-2">
                        <div className="font-mono text-[13px]">Start Ollama (Homebrew):</div>
                        <div className="mt-1"><code className="font-mono">brew services start ollama</code> — start via Homebrew services</div>

                        <div className="mt-2 font-mono text-[13px]">Or with launchctl:</div>
                        <div className="mt-1"><code className="font-mono">launchctl load ~/Library/LaunchAgents/your.ollama.plist</code></div>

                        <div className="mt-2 font-mono text-[13px]">Set OLLAMA_ORIGINS and restart:</div>
                        <div className="mt-1"><code className="font-mono">export OLLAMA_ORIGINS="https://briancraig.github.io" && brew services restart ollama</code></div>
                      </div>
                    </div>
                  )}

                  {detectedOS === "Windows" && (
                    <div className="bg-white dark:bg-[#090909] border border-gray-100 dark:border-gray-800 rounded p-3">
                      <div className="font-medium">Windows</div>
                      <div className="mt-2">
                        <div className="font-mono text-[13px]">Start Ollama (PowerShell):</div>
                        <div className="mt-1"><code className="font-mono">Start-Service ollama</code> — start the Ollama service</div>

                        <div className="mt-2 font-mono text-[13px]">Set environment variable:</div>
                        <div className="mt-1"><code className="font-mono">[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS","https://briancraig.github.io","Machine")</code> — set system variable and restart service</div>
                      </div>
                    </div>
                  )}

                  {detectedOS === "Unknown" && (
                    <div className="bg-white dark:bg-[#090909] border border-gray-100 dark:border-gray-800 rounded p-3">
                      <div className="font-medium">Generic</div>
                      <div className="mt-2">
                        <div className="font-mono text-[13px]">Start Ollama:</div>
                        <div className="mt-1"><code className="font-mono">ollama start</code> — or consult your service manager</div>

                        <div className="mt-2 font-mono text-[13px]">Set OLLAMA_ORIGINS:</div>
                        <div className="mt-1"><code className="font-mono">export OLLAMA_ORIGINS="https://briancraig.github.io"</code></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs">
                <div className="font-semibold">Browser troubleshooting (if curl returns 200 OK)</div>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Disable extensions or test in an incognito/private window.</li>
                  <li>Check site settings that might block access to localhost.</li>
                  <li>Try the curl command on the same machine to confirm whether the browser is the blocker.</li>
                  <li>Temporarily allow insecure origins or adjust site permissions if applicable.</li>
                </ul>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => setShowDetails(s => !s)}
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-xs"
                >
                  {showDetails ? "Hide details" : "Show error details"}
                </button>

                <button
                  onClick={() => handleReconnect(false)}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                >
                  Attempt full reconnect
                </button>
              </div>

              {showDetails && errorRecord && (
                <pre className="mt-3 p-3 bg-black/5 dark:bg-white/5 rounded text-xs overflow-auto">
{JSON.stringify({ name: errorRecord.name, message: errorRecord.message, code: errorRecord.code, timestamp: errorRecord.timestamp, urlAttempted: errorRecord.urlAttempted }, null, 2)}
                </pre>
              )}
            </section>
          )}

          {/* Standard settings + models UI */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Ollama Host</label>
              <input
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="http://localhost:11434"
              />
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

          {connectionStatus !== "failed" && (
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-500 mb-2">Models</h3>

              {connectionStatus === "connecting" && (!models || models.length === 0) ? (
                <div className="p-4 border border-gray-100 dark:border-gray-800 rounded text-sm text-gray-500 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Loading models…</span>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;