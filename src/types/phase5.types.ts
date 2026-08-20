export interface ToolStats {
  toolName: string;
  totalRuns: number;
  todayRuns: number;
  thisWeekRuns: number;
  lastRunAt: string | null;
}

export interface ToolStatsWithHistory extends ToolStats {
  dailyHistory: Record<string, number>;
  weeklyHistory: Record<string, number>;
}

export interface TextStatistics {
  wordCount: number;
  uniqueWords: number;
  averageWordLength: number;
  longestWord: string;
  shortestWord: string;
  characterCount: number;
  characterCountNoSpaces: number;
  sentenceCount: number;
  averageSentenceLength: number;
  longestSentence: string;
  shortestSentence: string;
  paragraphCount: number;
  averageParagraphLength: number;
  syllableCount: number;
  averageSyllablesPerWord: number;
  vocabularyRichness: number;
  complexWords: number;
  simpleWords: number;
  estimatedReadingTime: number;
  estimatedSpeakingTime: number;
}

export interface ParaphraseOptions {
  style: 'standard' | 'academic' | 'creative' | 'simple';
  length: 'short' | 'medium' | 'long';
  preserveKeywords?: boolean;
}

export interface ParaphraseResult {
  original: string;
  paraphrased: string;
  confidence: number;
  alternatives: string[];
  wordCountDiff: number;
}

export interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  smogIndex: number;
  colemanLiauIndex: number;
  automatedReadabilityIndex: number;
  averageGradeLevel: number;
}

export interface GrammarError {
  type: 'spelling' | 'grammar' | 'punctuation' | 'style';
  message: string;
  suggestion: string;
  position: { start: number; end: number };
}

export interface GrammarAnalysis {
  errors: GrammarError[];
  suggestions: string[];
  score: number;
}

export interface TextComplexity {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  score: number;
  description: string;
}

export interface CitationSource {
  type: 'book' | 'article' | 'website' | 'journal' | 'video' | 'other';
  authors: string[];
  title: string;
  year: string;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  doi?: string;
  accessedDate?: string;
}

export interface CitationResult {
  apa: string;
  mla: string;
  chicago: string;
  harvard: string;
  vancouver: string;
}

export interface SummarizerOptions {
  length: 'short' | 'medium' | 'long';
  style: 'extractive' | 'abstractive';
  preserveKeywords?: boolean;
  focusPoints?: number;
}

export interface SummarizerResult {
  original: string;
  summary: string;
  originalLength: number;
  summaryLength: number;
  compression: number;
  confidence: number;
  keyPoints: string[];
  topics: string[];
}
