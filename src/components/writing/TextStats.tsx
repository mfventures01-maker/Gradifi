import React from 'react';
import { 
  FileText, Type, Hash, BookOpen, Clock, Mic
} from 'lucide-react';
import { wordCounterService } from '../../services/wordCounterService';

interface TextStatsProps {
  text: string;
  showDetailed?: boolean;
  className?: string;
}

export const TextStats: React.FC<TextStatsProps> = ({ 
  text, 
  showDetailed = false, 
  className = '' 
}) => {
  const stats = wordCounterService.getTextStatistics(text);
  
  const statCards = [
    { icon: FileText, label: 'Words', value: stats.wordCount, color: 'blue' },
    { icon: Type, label: 'Characters', value: stats.characterCount, color: 'emerald' },
    { icon: Hash, label: 'Sentences', value: stats.sentenceCount, color: 'purple' },
    { icon: BookOpen, label: 'Paragraphs', value: stats.paragraphCount, color: 'orange' },
    { icon: Clock, label: 'Reading Time', value: stats.estimatedReadingTime + ' min', color: 'rose' },
    { icon: Mic, label: 'Speaking Time', value: stats.estimatedSpeakingTime + ' min', color: 'teal' }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      blue: { bg: 'bg-blue-50/80', text: 'text-blue-700' },
      emerald: { bg: 'bg-emerald-50/80', text: 'text-emerald-700' },
      purple: { bg: 'bg-purple-50/80', text: 'text-purple-700' },
      orange: { bg: 'bg-orange-50/80', text: 'text-orange-700' },
      rose: { bg: 'bg-rose-50/80', text: 'text-rose-700' },
      teal: { bg: 'bg-teal-50/80', text: 'text-teal-700' }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-xs ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 text-sm">Comprehensive Text Statistics</h3>
        <span className="text-xs font-semibold text-slate-400 font-mono">
          {stats.wordCount > 0 ? `${stats.wordCount} words analyzed` : 'No text entered'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, index) => {
          const colors = getColorClasses(card.color);
          return (
            <div key={index} className={`${colors.bg} rounded-xl p-3 text-center border border-slate-100`}>
              <card.icon className={`w-4 h-4 ${colors.text} mx-auto mb-1`} />
              <p className={`text-lg font-bold ${colors.text} font-mono`}>{card.value}</p>
              <p className="text-[11px] text-slate-500 font-medium">{card.label}</p>
            </div>
          );
        })}
      </div>

      {showDetailed && stats.wordCount > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400">Avg Word Length</span>
            <p className="font-bold text-slate-800 font-mono">{stats.averageWordLength} chars</p>
          </div>
          <div>
            <span className="text-slate-400">Unique Words</span>
            <p className="font-bold text-slate-800 font-mono">{stats.uniqueWords}</p>
          </div>
          <div>
            <span className="text-slate-400">Vocabulary Richness</span>
            <p className="font-bold text-slate-800 font-mono">{Math.round(stats.vocabularyRichness * 100)}%</p>
          </div>
          <div>
            <span className="text-slate-400">Syllables</span>
            <p className="font-bold text-slate-800 font-mono">{stats.syllableCount}</p>
          </div>
        </div>
      )}
    </div>
  );
};
