import { detectOSFromNavigator } from "../../utils/browser";

export default function OSSpecificHelp({ }) {
  const detectedOS = detectOSFromNavigator();
  return (
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
  );
}