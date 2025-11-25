import React from 'react';

const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return (
    <div className="text-sm leading-relaxed space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const content = part.slice(3, -3).replace(/^[a-z]+\n/, '');
          const lang = part.match(/```([a-z]*)\n/)?.[1] || 'text';
          return (
            <div key={i} className="bg-gray-900 rounded-md p-3 overflow-x-auto my-2 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1 select-none font-mono uppercase">{lang}</div>
              <pre className="font-mono text-gray-100 whitespace-pre-wrap">{content.trim()}</pre>
            </div>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((seg, j) => {
              if (seg.startsWith('`') && seg.endsWith('`')) {
                return <code key={j} className="bg-gray-200 dark:bg-gray-700 px-1 rounded font-mono text-red-500 dark:text-red-300">{seg.slice(1, -1)}</code>;
              }
              if (seg.startsWith('**') && seg.endsWith('**')) {
                return <strong key={j}>{seg.slice(2, -2)}</strong>;
              }
              return seg;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownRenderer;