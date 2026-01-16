import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface AutocompleteInputProps {
  label: string;
  placeholder: string;
  options: Array<{ id: string; name: string; meta?: string }>;
  selectedItems: Array<{ id: string; name: string; meta?: string }>;
  onAdd: (item: { id: string; name: string; meta?: string }) => void;
  onRemove: (id: string) => void;
}

export default function AutocompleteInput({
  label,
  placeholder,
  options,
  selectedItems,
  onAdd,
  onRemove,
}: AutocompleteInputProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(
    option =>
      !selectedItems.some(item => item.id === option.id) &&
      option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (option: { id: string; name: string; meta?: string }) => {
    onAdd(option);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {showSuggestions && filteredOptions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredOptions.map(option => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
              >
                <p className="text-sm font-medium text-slate-900">{option.name}</p>
                {option.meta && <p className="text-xs text-slate-500">{option.meta}</p>}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedItems.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-medium"
            >
              <span>{item.name}</span>
              <button onClick={() => onRemove(item.id)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
