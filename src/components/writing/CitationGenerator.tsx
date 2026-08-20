import React, { useState } from 'react';
import { Copy, Check, Bookmark, Sparkles, Plus, Trash2 } from 'lucide-react';
import { citationGeneratorService } from '../../services/citationGeneratorService';
import { publicCounterService } from '../../services/publicCounterService';
import { CitationSource, CitationResult } from '../../types/phase5.types';

export const CitationGenerator: React.FC = () => {
  const [type, setType] = useState<CitationSource['type']>('book');
  const [authors, setAuthors] = useState<string[]>(['Chinua Achebe']);
  const [authorInput, setAuthorInput] = useState('');
  const [title, setTitle] = useState('Things Fall Apart');
  const [year, setYear] = useState('1958');
  const [publisher, setPublisher] = useState('Heinemann');
  const [journal, setJournal] = useState('African Literature Review');
  const [url, setUrl] = useState('https://example.edu');

  const [activeTab, setActiveTab] = useState<'apa' | 'mla' | 'chicago' | 'harvard' | 'vancouver'>('apa');
  const [copied, setCopied] = useState(false);

  const source: CitationSource = {
    type,
    authors: authors.length > 0 ? authors : ['Unknown Author'],
    title: title || 'Untitled Work',
    year: year || '2026',
    publisher,
    journal,
    url
  };

  const citations: CitationResult = citationGeneratorService.generateCitations(source);

  const handleAddAuthor = () => {
    if (authorInput.trim()) {
      setAuthors([...authors, authorInput.trim()]);
      setAuthorInput('');
    }
  };

  const handleRemoveAuthor = (idx: number) => {
    setAuthors(authors.filter((_, i) => i !== idx));
  };

  const currentCitation = citations[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCitation);
    setCopied(true);
    publicCounterService.incrementCounter('citation-generator');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-emerald-600" />
            <span>Instant Citation Generator</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">Generate APA 7, MLA 9, Chicago, Harvard & Vancouver citations instantly</p>
        </div>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          100% Free Lead Generator
        </span>
      </div>

      {/* Form Fields */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Source Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CitationSource['type'])}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="book">Book</option>
            <option value="journal">Journal Article</option>
            <option value="website">Website / Web Page</option>
            <option value="article">News Article</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Work Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Author(s)</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Wole Soyinka"
              value={authorInput}
              onChange={(e) => setAuthorInput(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleAddAuthor}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {authors.map((a, idx) => (
              <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                {a}
                <Trash2 className="w-3 h-3 text-rose-500 cursor-pointer hover:text-rose-700" onClick={() => handleRemoveAuthor(idx)} />
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Year of Publication</label>
          <input
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {type === 'book' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Publisher</label>
            <input
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}

        {(type === 'journal' || type === 'article') && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Journal Name</label>
            <input
              type="text"
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Generated Citation Tabs */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {(['apa', 'mla', 'chicago', 'harvard', 'vancouver'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg uppercase cursor-pointer transition-all ${
                  activeTab === tab ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Citation!' : 'Copy Citation'}</span>
          </button>
        </div>

        <div className="p-4 bg-slate-900 text-emerald-400 font-serif text-sm rounded-2xl border border-slate-800 leading-relaxed select-all">
          {currentCitation}
        </div>
      </div>
    </div>
  );
};
