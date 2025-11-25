import { Lock, Key } from 'lucide-react';
import { useConversations, useConversationsActions } from '../contexts/ConversationsContext';

const LoginScreen = ({ }) => {
  const hasData = localStorage.getItem('ollama_secure_data');

  const { password } = useConversations();
  const { setPassword, login, } = useConversationsActions();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    login();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-2">Secure Local Chat</h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          Enter your vault password. If this is your first time, this password will be used to encrypt your local storage.
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Vault Password</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                autoFocus
              />
              <Key className="absolute right-3 top-3.5 text-gray-500 w-5 h-5" />
            </div>
          </div>
          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Unlock Vault
          </button>
        </form>
        {hasData && (
          <p className="mt-4 text-xs text-red-400 text-center">
            Warning: If you lost your password, your previous chats cannot be recovered. Clear browser data to reset.
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;