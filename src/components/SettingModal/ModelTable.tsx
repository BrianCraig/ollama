import { OllamaTagModel } from '../../api/Ollama';
import { RefreshCw } from "lucide-react";
import { formatBytes } from '../../utils/math';
import { humanizeRelative } from '../../utils/date';

type Props = {
  models?: OllamaTagModel[] | null;
  connectionStatus: string;
};

export default function ModelTable({ models, connectionStatus }: Props) {
  if (connectionStatus === "connecting" && (!models || models.length === 0)) {
    return (
      <div className="p-4 border border-gray-100 dark:border-gray-800 rounded text-sm text-gray-500 flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
        <span>Loading models…</span>
      </div>
    );
  }

  if (models && models.length > 0) {
    return (
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
            {models.map((m) => (
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
    );
  }

  return (
    <div className="p-4 border border-gray-100 dark:border-gray-800 rounded text-sm text-gray-500">
      No models found.
    </div>
  );
}