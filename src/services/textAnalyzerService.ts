import { ReadabilityScores, GrammarAnalysis, GrammarError, TextComplexity } from '../types/phase5.types';
import { wordCounterService } from './wordCounterService';

export const textAnalyzerService = {
  calculateFleschReadingEase(text: string): number {
    const stats = wordCounterService.getTextStatistics(text);
    if (stats.sentenceCount === 0 || stats.wordCount === 0) return 0;
    const wordsPerSentence = stats.wordCount / stats.sentenceCount;
    const syllablesPerWord = stats.syllableCount / stats.wordCount;
    const score = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
    return Math.max(0, Math.min(100, score));
  },

  calculateFleschKincaidGrade(text: string): number {
    const stats = wordCounterService.getTextStatistics(text);
    if (stats.sentenceCount === 0 || stats.wordCount === 0) return 0;
    const wordsPerSentence = stats.wordCount / stats.sentenceCount;
    const syllablesPerWord = stats.syllableCount / stats.wordCount;
    return Math.max(0, 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59);
  },

  calculateSmogIndex(text: string): number {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const polysyllabicWords = text.split(/\s+/).filter(word => 
      wordCounterService.countSyllables(word) >= 3
    );
    if (sentences.length === 0) return 0;
    return Math.max(0, 1.043 * Math.sqrt(polysyllabicWords.length * (30 / sentences.length)) + 3.1291);
  },

  calculateColemanLiauIndex(text: string): number {
    const stats = wordCounterService.getTextStatistics(text);
    if (stats.wordCount === 0) return 0;
    const lettersPerWord = stats.characterCountNoSpaces / stats.wordCount;
    const sentencesPer100Words = (stats.sentenceCount / stats.wordCount) * 100;
    return Math.max(0, 0.0588 * lettersPerWord - 0.296 * sentencesPer100Words - 15.8);
  },

  calculateAutomatedReadabilityIndex(text: string): number {
    const stats = wordCounterService.getTextStatistics(text);
    if (stats.sentenceCount === 0 || stats.wordCount === 0) return 0;
    return Math.max(0, 4.71 * (stats.characterCount / stats.wordCount) + 0.5 * (stats.wordCount / stats.sentenceCount) - 21.43);
  },

  getReadabilityScores(text: string): ReadabilityScores {
    const fleschReadingEase = this.calculateFleschReadingEase(text);
    const fleschKincaidGrade = this.calculateFleschKincaidGrade(text);
    const smogIndex = this.calculateSmogIndex(text);
    const colemanLiauIndex = this.calculateColemanLiauIndex(text);
    const automatedReadabilityIndex = this.calculateAutomatedReadabilityIndex(text);
    
    const scores = [fleschKincaidGrade, smogIndex, colemanLiauIndex, automatedReadabilityIndex];
    const averageGradeLevel = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    return {
      fleschReadingEase: Math.round(fleschReadingEase * 100) / 100,
      fleschKincaidGrade: Math.round(fleschKincaidGrade * 100) / 100,
      smogIndex: Math.round(smogIndex * 100) / 100,
      colemanLiauIndex: Math.round(colemanLiauIndex * 100) / 100,
      automatedReadabilityIndex: Math.round(automatedReadabilityIndex * 100) / 100,
      averageGradeLevel: Math.round(averageGradeLevel * 100) / 100
    };
  },

  getComplexity(text: string): TextComplexity {
    const scores = this.getReadabilityScores(text);
    const avgGrade = scores.averageGradeLevel;
    
    if (avgGrade <= 4) {
      return { level: 'beginner', score: 25, description: 'Simple text suitable for elementary school students' };
    } else if (avgGrade <= 8) {
      return { level: 'intermediate', score: 50, description: 'Moderate text suitable for middle school students' };
    } else if (avgGrade <= 12) {
      return { level: 'advanced', score: 75, description: 'Complex text suitable for high school & college students' };
    } else {
      return { level: 'expert', score: 95, description: 'Very complex academic text suitable for post-graduate readers' };
    }
  },

  analyzeGrammar(text: string): GrammarAnalysis {
    const errors: GrammarError[] = [];
    const suggestions: string[] = [];
    
    const patterns = [
      { pattern: /\b(i)\b/g, message: "Capitalize 'I'", suggestion: 'I', type: 'grammar' as const },
      { pattern: /[.!?]\s+[a-z]/g, message: 'Capitalize first letter of new sentence', suggestion: 'Capitalize after punctuation', type: 'punctuation' as const },
      { pattern: /\s{2,}/g, message: 'Remove extra spaces', suggestion: 'Single space', type: 'style' as const },
      { pattern: /\b(a)\s+[aeiou]/gi, message: "Use 'an' before vowel sounds", suggestion: 'an', type: 'grammar' as const },
      { pattern: /\b(an)\s+[^aeiou]/gi, message: "Use 'a' before consonant sounds", suggestion: 'a', type: 'grammar' as const }
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.pattern.exec(text)) !== null) {
        errors.push({
          type: pattern.type,
          message: pattern.message,
          suggestion: pattern.suggestion,
          position: { start: match.index, end: match.index + match[0].length }
        });
        if (!suggestions.includes(pattern.suggestion)) {
          suggestions.push(pattern.suggestion);
        }
      }
    }
    
    const score = Math.max(0, 100 - (errors.length * 5));
    return { errors, suggestions, score: Math.min(100, score) };
  },

  getVocabularyRichness(text: string): number {
    const stats = wordCounterService.getTextStatistics(text);
    return stats.vocabularyRichness || 0;
  },

  getDifficultWords(text: string, threshold: number = 3): string[] {
    const words = text.split(/\s+/);
    return words.filter(word => wordCounterService.countSyllables(word) >= threshold);
  }
};
