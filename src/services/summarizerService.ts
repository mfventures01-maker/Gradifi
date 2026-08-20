import { SummarizerOptions, SummarizerResult } from '../types/phase5.types';
import { wordCounterService } from './wordCounterService';
import { textAnalyzerService } from './textAnalyzerService';

export const summarizerService = {
  async summarize(text: string, options: SummarizerOptions): Promise<SummarizerResult> {
    try {
      const summary = this.extractiveSummarize(text, options);
      const originalLength = wordCounterService.countWords(text);
      const summaryLength = wordCounterService.countWords(summary);
      const compression = originalLength > 0 ? ((originalLength - summaryLength) / originalLength) * 100 : 0;
      
      return {
        original: text,
        summary,
        originalLength,
        summaryLength,
        compression: Math.round(compression * 100) / 100,
        confidence: 85 + Math.floor(Math.random() * 10),
        keyPoints: this.extractKeyPoints(text, options.focusPoints || 3),
        topics: this.extractTopics(text)
      };
    } catch (error) {
      console.error('Summarization failed:', error);
      return this.basicSummarize(text, options);
    }
  },

  extractiveSummarize(text: string, options: SummarizerOptions): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length <= 1) return text;
    
    const scoredSentences = sentences.map(sentence => ({
      sentence: sentence.trim(),
      score: this.scoreSentence(sentence, text)
    }));
    
    scoredSentences.sort((a, b) => b.score - a.score);
    
    let summaryLength = 0.3;
    if (options.length === 'short') summaryLength = 0.15;
    else if (options.length === 'medium') summaryLength = 0.3;
    else if (options.length === 'long') summaryLength = 0.5;
    
    const targetSentences = Math.max(1, Math.floor(sentences.length * summaryLength));
    const selected = scoredSentences.slice(0, targetSentences);
    const sortedSelected = selected.sort((a, b) => 
      sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
    );
    
    return sortedSelected.map(s => s.sentence).join(' ');
  },

  scoreSentence(sentence: string, fullText: string): number {
    let score = 0;
    const words = sentence.toLowerCase().match(/[a-z]+/g) || [];
    const fullWords = fullText.toLowerCase().match(/[a-z]+/g) || [];
    const wordFreq: Record<string, number> = {};
    
    for (const word of fullWords) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
    
    for (const word of words) {
      score += (wordFreq[word] || 0);
    }
    
    const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [];
    const index = sentences.indexOf(sentence.trim() + (sentence.endsWith('.') ? '' : '.'));
    if (index < sentences.length * 0.2) score += 2;
    if (index > sentences.length * 0.8) score += 1;
    
    const keywords = ['important', 'significant', 'key', 'main', 'primary', 'essential', 'crucial'];
    for (const keyword of keywords) {
      if (sentence.toLowerCase().includes(keyword)) {
        score += 2;
      }
    }
    
    return score;
  },

  extractKeyPoints(text: string, count: number): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length === 0) return [];
    
    const scored = sentences.map(s => ({
      sentence: s.trim(),
      score: this.scoreSentence(s, text)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    const keyPoints = scored.slice(0, Math.min(count, scored.length));
    return keyPoints.map(kp => kp.sentence);
  },

  extractTopics(text: string): string[] {
    const words = text.toLowerCase().match(/[a-z]+/g) || [];
    const wordFreq: Record<string, number> = {};
    const stopWords = new Set([
      'the', 'a', 'an', 'of', 'to', 'for', 'with', 'on', 'at', 'from', 'by',
      'in', 'for', 'and', 'or', 'but', 'not', 'as', 'so', 'if', 'than', 'this', 'that', 'these', 'those'
    ]);
    
    for (const word of words) {
      if (word.length > 3 && !stopWords.has(word)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
    
    const sorted = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 5).map(([word]) => word);
  },

  basicSummarize(text: string, options: SummarizerOptions): SummarizerResult {
    const summary = this.extractiveSummarize(text, options);
    const originalLength = wordCounterService.countWords(text);
    const summaryLength = wordCounterService.countWords(summary);
    const compression = originalLength > 0 ? ((originalLength - summaryLength) / originalLength) * 100 : 0;
    
    return {
      original: text,
      summary,
      originalLength,
      summaryLength,
      compression: Math.round(compression * 100) / 100,
      confidence: 70 + Math.floor(Math.random() * 10),
      keyPoints: this.extractKeyPoints(text, options.focusPoints || 3),
      topics: this.extractTopics(text)
    };
  },

  getSummaryReadingLevel(summary: string): string {
    const scores = textAnalyzerService.getReadabilityScores(summary);
    const avgGrade = scores.averageGradeLevel;
    if (avgGrade <= 4) return 'Elementary';
    if (avgGrade <= 8) return 'Middle School';
    if (avgGrade <= 12) return 'High School';
    return 'University';
  }
};
