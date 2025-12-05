import { RefreshCw, Settings, Check } from 'lucide-react';
import { useConnection } from '../stores/ConnectionStore';
import { useSettings } from '../contexts/SettingsContext';

export default function ConnectionButton({}) {
  const { connecting, version, error } = useConnection();
  const toggleSettingsModal = useSettings(s => s.toggleSettingsModal);
  

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSettingsModal();
  };

  return (
    <button
      onClick={handleClick}
      className={`
        w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all
        text-sm
        ${!connecting && !error ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm' : ''}
        ${!connecting && error ? 'hover:bg-gray-200 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400' : ''}
      `}
      title={!connecting && error ? 'Click to retry connection' : 'Connection Settings'}
    >
      <div className="flex items-center gap-2">
        <div className="relative flex items-center gap-2">
          {connecting && !error && <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />}
          {!connecting && !error && <Check className="w-4 h-4 text-green-600" />}
          {!connecting && error && <Settings className="w-4 h-4 text-red-500" />}
        </div>

        <div className="flex flex-col items-start leading-tight">
          <span className="font-semibold text-sm">Connection</span>
          <span className={`text-xs font-mono transition-opacity ${!connecting && !error ? 'opacity-100' : 'opacity-70'}`}>
            {!connecting && !error ? `v${version ?? 'unknown'}` : (connecting ? 'Connecting…' : 'Failed')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* show small hint when offline+error */}
        {!connecting && error ? (
          <div className="text-xs text-red-500 font-medium">Retry</div>
        ) : (
          <div className="text-xs text-gray-400 dark:text-gray-500">Settings</div>
        )}
      </div>
    </button>
  );
}