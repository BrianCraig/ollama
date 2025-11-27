import { useState } from 'react';
import { Edit2, Save, RefreshCw, X } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { useConversationUI } from '../contexts/ConversationUIContext';

const MessageItem = ({ msg, idx, isUser }: { msg: any; idx: number; isUser: boolean }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);

  const { saveEditFromIndex, regenerateFromIndex } = useConversationUI();

  const handleSaveEdit = (regenerate = false) => {
    setIsEditing(false);
    if (regenerate) {
      regenerateFromIndex(idx, editContent);
    } else {
      saveEditFromIndex(idx, editContent);
    }
  };

  return (
    <div className={`max-w-6xl mx-auto w-full flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative group max-w-[90%] rounded-2xl p-5 shadow-sm 
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
          }`}
      >
        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[500px]">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full bg-black/10 dark:bg-black/30 p-2 rounded text-sm outline-none resize-none min-h-[150px]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 px-3 text-xs rounded bg-gray-500/20 hover:bg-gray-500/40"
              >
                <X className="w-3 h-3 inline mr-1" /> Cancel
              </button>

              <button
                onClick={() => handleSaveEdit(false)}
                className="p-1 px-3 text-xs rounded bg-white/20 hover:bg-white/30 font-semibold flex items-center gap-1"
              >
                <Save className="w-3 h-3" /> Save
              </button>

              {isUser && (
                <button
                  onClick={() => handleSaveEdit(true)}
                  className="p-1 px-3 text-xs rounded bg-blue-700 hover:bg-blue-800 font-semibold text-white flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Save & Regenerate
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="prose prose-invert max-w-none">
              {isUser ? (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
            </div>

            <div className={`absolute -bottom-8 ${isUser ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
              <button
                onClick={() => { setEditContent(msg.content); setIsEditing(true); }}
                className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600"
                title="Edit Message"
              >
                <Edit2 className="w-3 h-3" />
              </button>

              {!isUser && (
                <button
                  onClick={() => regenerateFromIndex(idx, null)}
                  className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600"
                  title="Regenerate this response"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageItem;