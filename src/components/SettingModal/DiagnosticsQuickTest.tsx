import { Copy } from "lucide-react";

type Props = {
  curlWithOrigin: string;
  copied: boolean;
  onCopy: (text: string) => void;
  onRun: () => void;
  isTesting: boolean;
};

export default function DiagnosticsQuickTest({ curlWithOrigin, copied, onCopy, onRun, isTesting }: Props) {
  return (
    <div>
      <div className="mt-4 text-xs text-gray-500 mb-1">Quick test (copy & run)</div>
      <div className="bg-gray-50 dark:bg-[#0b0b0b] rounded p-2 font-mono text-xs break-words">
        <div className="mb-2">{curlWithOrigin}</div>
        <div className="flex gap-2">
          <button
            onClick={() => onCopy(curlWithOrigin)}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-xs flex items-center gap-2"
          >
            <Copy className="w-4 h-4" /> {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={onRun}
            disabled={isTesting}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
          >
            {isTesting ? "Testing…" : "Run quick test"}
          </button>
        </div>
      </div>
    </div>
  );
}