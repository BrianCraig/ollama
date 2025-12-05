import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

interface DropdownProps<T> {
  options: T[];
  selected: T | null;
  onSelect: (item: T | null) => void;
  renderItem: (item: T) => ReactNode;
  keyExtractor: (item: T) => string;
  placeholder?: string;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function Dropdown<T>({
  options,
  selected,
  onSelect,
  renderItem,
  keyExtractor,
  placeholder = "Select...",
  triggerRef,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: T | null) => {
    onSelect(item);
    setIsOpen(false);
    triggerRef?.current?.focus(); 
  };

  const isSelected = (item: T) => selected && keyExtractor(selected) === keyExtractor(item);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
            flex items-center justify-between gap-3 px-3 py-1.5 
            border border-gray-200 dark:border-gray-700 rounded-lg 
            bg-gray-50 dark:bg-[#0b0b0b] 
            hover:bg-gray-100 dark:hover:bg-gray-800 
            transition-all duration-200 text-left min-w-[200px]
            
            /* Focus Styles */
            focus:outline-none 
            focus:ring-2 focus:ring-offset-1 focus:ring-blue-500/60 dark:focus:ring-blue-500/60
            focus:border-blue-500 dark:focus:border-blue-500
            dark:focus:ring-offset-gray-900
        `}
      >
        <div className="flex-1 truncate">
          {selected ? (
            renderItem(selected)
          ) : (
            <span className="text-sm text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 max-h-[400px] overflow-y-auto bg-white dark:bg-[#0b0b0b] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-50 p-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            onClick={() => handleSelect(null)}
            className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg mb-1 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800"
          >
            No selection
          </button>

          {options.map((item) => (
            <button
              key={keyExtractor(item)}
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between group transition-colors 
                focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800
                ${
                  isSelected(item)
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
            >
              <div className="flex-1 pr-2">{renderItem(item)}</div>
              {isSelected(item) && (
                <Check className="w-4 h-4 text-blue-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}