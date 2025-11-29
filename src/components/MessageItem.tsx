import { useState, useRef, useEffect } from 'react';
import {
  Edit2,
  Save,
  RefreshCw,
  Trash2,
  User,
  Bot,
  Terminal,
  Cpu,
  Plus,
  ChevronDown,
  Check
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { useConversationUI } from '../contexts/ConversationUIContext';
import { Message, Role, useConversations } from '../contexts/ConversationsContext';

const roleConfig: Record<Role, {
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  user: {
    icon: User,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50/50 dark:bg-blue-900/10',
    borderColor: 'border-blue-500',
    label: 'User'
  },
  assistant: {
    icon: Bot,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-white dark:bg-[#1e1e1e]',
    borderColor: 'border-purple-500',
    label: 'Assistant'
  },
  system: {
    icon: Terminal,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50/50 dark:bg-amber-900/10',
    borderColor: 'border-amber-500',
    label: 'System'
  }
};

function useOutsideClick<T extends HTMLElement = HTMLElement>(ref: React.RefObject<T | null>, handler: () => void) {
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = ref.current as HTMLElement | null;
      if (el && !el.contains(e.target as Node)) handler();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [ref, handler]);
}

const InsertZone = ({ onClick }: { onClick: () => void }) => (
  <div className="relative h-4 w-full group/insert flex items-center justify-center z-10 my-2">
    <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={onClick}>
      <div className="w-full h-px bg-blue-500/30 opacity-0 group-hover/insert:opacity-100 transition-opacity duration-200 absolute top-1/2 left-0 right-0"></div>
      <div className="opacity-0 group-hover/insert:opacity-100 transition-opacity duration-200 bg-blue-600 text-white rounded-full p-0.5 px-2 shadow-sm flex items-center gap-1 text-[10px] font-medium z-20 transform translate-y-[0.5px]">
        <Plus className="w-2.5 h-2.5" />
        <span>Insert</span>
      </div>
    </div>
  </div>
);

const ActionBtn = ({ icon: Icon, onClick, label, color = "hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100" }: any) => (
  <button onClick={onClick} className={`p-1.5 rounded-sm text-gray-400 transition-all duration-200 ${color}`} title={label}>
    <Icon className="w-3.5 h-3.5" />
  </button>
);

const RoleDropdown = ({ idx, msg, onClose }: { idx: number; msg: Message; onClose: () => void }) => {
  const updateCurrentChat = useConversations(s => s.updateCurrentChat);
  return (
    <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded shadow-xl z-50 overflow-hidden">
      {(['system', 'user', 'assistant'] as Role[]).map((role) => (
        <button
          key={role}
          onClick={() => { updateCurrentChat(chat => ({ ...chat, messages: chat.messages.map((m, i) => i === idx ? { ...m, role } : m) })); onClose(); }}
          className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="capitalize text-gray-700 dark:text-gray-200">{role}</span>
          {msg.role === role && <Check className="w-3 h-3 text-blue-500" />}
        </button>
      ))}
    </div>
  );
};

const Header = ({
  msg,
  idx,
  onEdit,
  onRegenerate,
  onDelete
}: {
  msg: Message;
  idx: number;
  onEdit: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}) => {
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  useOutsideClick(roleDropdownRef, () => setIsRoleOpen(false));
  const config = roleConfig[msg.role];
  const RoleIcon = config.icon;
  const timestamp = msg.createdAt ? new Date(msg.createdAt) : new Date();
  const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-gray-800/50 bg-black/5 dark:bg-white/5 select-none">
      <div className="flex items-center gap-3">
        <div className="relative" ref={roleDropdownRef}>
          <button onClick={() => setIsRoleOpen(!isRoleOpen)} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors group">
            <RoleIcon className={`w-3.5 h-3.5 ${config.color}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>{config.label}</span>
            <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
          </button>
          {isRoleOpen && <RoleDropdown idx={idx} msg={msg} onClose={() => setIsRoleOpen(false)} />}
        </div>

        <span className="text-gray-300 dark:text-gray-700">|</span>

        {msg.model && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 opacity-70 hover:opacity-100 transition-opacity" title="Model Used">
            <Cpu className="w-3 h-3" />
            <span className="font-mono">{msg.model}</span>
          </div>
        )}

        <span className="text-[10px] text-gray-400 font-mono ml-1 opacity-60">{timeString}</span>
      </div>

      <div className="flex items-center gap-0.5">
        <ActionBtn icon={Edit2} onClick={onEdit} label="Edit" />
        {msg.role === 'assistant' && <ActionBtn icon={RefreshCw} onClick={onRegenerate} label="Regenerate" />}
        <div className="w-px h-3 bg-gray-300 dark:bg-gray-700 mx-1.5" />
        <ActionBtn icon={Trash2} onClick={onDelete} label="Delete" color="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400" />
      </div>
    </div>
  );
};

const EditArea = ({
  value,
  onChange,
  onCancel,
  onSave,
  onSaveRun,
  showSaveRun
}: {
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onSaveRun: () => void;
  showSaveRun: boolean;
}) => (
  <div className="flex flex-col gap-2 animate-in fade-in duration-200">
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 p-3 rounded-sm text-sm font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y min-h-[120px]"
      autoFocus
      placeholder="Edit message..."
    />
    <div className="flex justify-end gap-2 mt-1">
      <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium rounded-sm border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
      <button onClick={onSave} className="px-3 py-1.5 text-xs font-medium rounded-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:opacity-90 transition-opacity flex items-center gap-1.5">
        <Save className="w-3 h-3" /> Save
      </button>
      {showSaveRun && (
        <button onClick={onSaveRun} className="px-3 py-1.5 text-xs font-medium rounded-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" /> Save & Run
        </button>
      )}
    </div>
  </div>
);

const DisplayArea = ({ content }: { content: string }) => (
  <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-gray-800 dark:text-gray-200 font-sans">
    <MarkdownRenderer content={content} />
  </div>
);

const MessageItem = ({
  msg,
  idx,
  onInsertMessage
}: {
  msg: Message;
  idx: number;
  onInsertMessage?: (index: number) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);
  const updateCurrentChat = useConversations(s => s.updateCurrentChat);
  const { saveEditFromIndex, regenerateFromIndex } = useConversationUI();
  const config = roleConfig[msg.role];

  useEffect(() => {
    setEditContent(msg.content);
  }, [msg.content]);

  const handleSave = (regenerate = false) => {
    setIsEditing(false);
    if (regenerate) regenerateFromIndex(idx, editContent);
    else saveEditFromIndex(idx, editContent);
  };

  return (
    <div className="w-full flex flex-col">
      {idx === 0 && <InsertZone onClick={() => onInsertMessage && onInsertMessage(idx)} />}

      <div className={`
        relative w-full border-l-2 transition-colors duration-200 shadow-sm
        ${config.borderColor}
        ${config.bgColor}
      `}>
        <Header
          msg={msg}
          idx={idx}
          onEdit={() => { setEditContent(msg.content); setIsEditing(true); }}
          onRegenerate={() => regenerateFromIndex(idx, null)}
          onDelete={() => updateCurrentChat(chat => ({ ...chat, messages: chat.messages.filter((_, i) => i !== idx) }))}
        />

        <div className="px-4 py-3 md:px-5 md:py-3">
          {isEditing ? (
            <EditArea
              value={editContent}
              onChange={setEditContent}
              onCancel={() => setIsEditing(false)}
              onSave={() => handleSave(false)}
              onSaveRun={() => handleSave(true)}
              showSaveRun={msg.role === 'assistant'}
            />
          ) : (
            <DisplayArea content={msg.content} />
          )}
        </div>
      </div>

      <InsertZone onClick={() => onInsertMessage && onInsertMessage(idx + 1)} />
    </div>
  );
};

export default MessageItem;