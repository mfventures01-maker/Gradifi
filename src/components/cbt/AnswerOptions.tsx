import React, { useEffect } from 'react';
import { AnswerOptionsProps } from '../../types/phase4.types';
import { Check } from 'lucide-react';

export const AnswerOptions: React.FC<AnswerOptionsProps> = ({
  options,
  selectedOptionId,
  selectedOptionIds = [],
  multiple = false,
  onSelect,
  disabled = false,
}) => {
  // Keyboard Shortcut Listeners (Keys 1-4 or A-D)
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (['1', '2', '3', '4'].includes(key)) {
        const idx = parseInt(key, 10) - 1;
        if (options[idx]) onSelect(options[idx].id);
      } else if (['A', 'B', 'C', 'D'].includes(key)) {
        const opt = options.find((o) => o.letter.toUpperCase() === key);
        if (opt) onSelect(opt.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onSelect, disabled]);

  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const isSelected = multiple
          ? selectedOptionIds.includes(opt.id)
          : selectedOptionId === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.id)}
            className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between gap-4 transition-all cursor-pointer min-h-[56px] ${
              isSelected
                ? 'bg-blue-50/80 border-blue-600 shadow-sm text-blue-950 font-semibold ring-2 ring-blue-500/20'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-3.5">
              <span
                className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center text-sm font-mono shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {opt.letter}
              </span>
              <span className="text-sm leading-snug">{opt.text}</span>
            </div>

            {isSelected && (
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
