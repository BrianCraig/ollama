import React, { useState } from "react";
import DiagnosticsQuickTest from "./DiagnosticsQuickTest";
import OSSpecificHelp from "./OSSpecificHelp";
import { useConnection } from '../../stores/ConnectionStore';
import { detectOSFromNavigator, copyToClipboard } from "../../utils/browser";
import { useSettings } from "../../contexts/SettingsContext";

const DiagnosticsPanel: React.FC = () => {
  const { error, reconnect } = useConnection();
  const host = useSettings(s => s.settings.url);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const detectedOS = detectOSFromNavigator();

  const curlWithOrigin = `curl '${host}/api/version' -H 'Origin: https://briancraig.github.io' -i`;

  const runQuickTest = async () => {
    setIsTesting(true);
    try {
      await reconnect();
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopy = async (text: string) => {
    await copyToClipboard(text, (flag: boolean) => {
      setCopied(flag);
      if (flag) setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
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

        <DiagnosticsQuickTest
          curlWithOrigin={curlWithOrigin}
          copied={copied}
          onCopy={handleCopy}
          onRun={runQuickTest}
          isTesting={isTesting}
        />
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
        <div className="mt-4">
          <h4 className="text-xs font-semibold">OS-specific fixes & commands</h4>
          <OSSpecificHelp />
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
          onClick={() => { setIsTesting(true); reconnect().finally(() => setIsTesting(false)); }}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
        >
          Attempt full reconnect
        </button>
      </div>

      {showDetails && error && (
        <pre className="mt-3 p-3 bg-black/5 dark:bg-white/5 rounded text-xs overflow-auto">
          {JSON.stringify({ name: error.name, message: error.message, code: error.code, timestamp: error.timestamp, urlAttempted: error.urlAttempted }, null, 2)}
        </pre>
      )}
    </section>
  );
};

export default DiagnosticsPanel;