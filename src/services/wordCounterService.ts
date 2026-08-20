import { TextStatistics } from '../types/phase5.types';

export const wordCounterService = {
  countWords(text: string): number {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).length;
  },

  countCharacters(text: string): number {
    if (!text) return 0;
    return text.length;
  },

  countCharactersNoSpaces(text: string): number {
    if (!text) return 0;
    return text.replace(/\s/g, '').length;
  },

  countSentences(text: string): number {
    if (!text || text.trim() === '') return 0;
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    return sentences ? sentences.length : (text.trim().length > 0 ? 1 : 0);
  },

  countParagraphs(text: string): number {
    if (!text || text.trim() === '') return 0;
    const paragraphs = text.split(/\n\s*\n/);
    return paragraphs.filter(p => p.trim() !== '').length;
  },

  countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length === 0) return 0;
    
    let syllableCount = 0;
    let vowelFound = false;
    
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const isVowel = 'aeiouy'.includes(char);
      
      if (isVowel && !vowelFound) {
        syllableCount++;
        vowelFound = true;
      } else if (!isVowel) {
        vowelFound = false;
      }
    }
    
    if (word.endsWith('e') && !word.endsWith('le')) {
      syllableCount--;
    }
    
    return Math.max(1, syllableCount);
  },

  countSyllablesInText(text: string): number {
    if (!text || text.trim() === '') return 0;
    const words = text.trim().split(/\s+/);
    return words.reduce((total, word) => total + this.countSyllables(word), 0);
  },

  getUniqueWords(text: string): string[] {
    if (!text || text.trim() === '') return [];
    const words = text.toLowerCase().match(/[a-z]+/g) || [];
    return [...new Set(words)];
  },

  getWordFrequency(text: string): Map<string, number> {
    if (!text || text.trim() === '') return new Map();
    const words = text.toLowerCase().match(/[a-z]+/g) || [];
    const frequency = new Map<string, number>();
    
    for (const word of words) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
    
    return frequency;
  },

  getTextStatistics(text: string): TextStatistics {
    if (!text || text.trim() === '') {
      return {
        wordCount: 0,
        uniqueWords: 0,
        averageWordLength: 0,
        longestWord: '',
        shortestWord: '',
        characterCount: 0,
        characterCountNoSpaces: 0,
        sentenceCount: 0,
        averageSentenceLength: 0,
        longestSentence: '',
        shortestSentence: '',
        paragraphCount: 0,
        averageParagraphLength: 0,
        syllableCount: 0,
        averageSyllablesPerWord: 0,
        vocabularyRichness: 0,
        complexWords: 0,
        simpleWords: 0,
        estimatedReadingTime: 0,
        estimatedSpeakingTime: 0
      };
    }

    const words = text.trim().split(/\s+/);
    const wordCount = words.length;
    const uniqueWords = this.getUniqueWords(text);
    const characters = text.length;
    const charactersNoSpaces = this.countCharactersNoSpaces(text);
    const sentences = this.countSentences(text);
    const paragraphs = this.countParagraphs(text);
    const syllables = this.countSyllablesInText(text);
    
    let longestWord = '';
    let shortestWord = '';
    let longestWordLen = 0;
    let shortestWordLen = Infinity;
    
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      if (cleanWord.length > longestWordLen) {
        longestWordLen = cleanWord.length;
        longestWord = cleanWord;
      }
      if (cleanWord.length < shortestWordLen && cleanWord.length > 0) {
        shortestWordLen = cleanWord.length;
        shortestWord = cleanWord;
      }
    }
    
    const totalWordLength = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0);
    const avgWordLength = wordCount > 0 ? totalWordLength / wordCount : 0;
    const avgSentenceLength = sentences > 0 ? words.length / sentences : 0;
    const avgParagraphLength = paragraphs > 0 ? words.length / paragraphs : 0;
    const vocabularyRichness = wordCount > 0 ? uniqueWords.length / wordCount : 0;
    
    let complexWords = 0;
    let simpleWords = 0;
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      if (cleanWord.length > 0) {
        const syllableCount = this.countSyllables(cleanWord);
        if (syllableCount >= 3) complexWords++;
        else simpleWords++;
      }
    }
    
    const estimatedReadingTime = Math.max(1, Math.ceil(words.length / 200));
    const estimatedSpeakingTime = Math.max(1, Math.ceil(words.length / 150));
    
    return {
      wordCount,
      uniqueWords: uniqueWords.length,
      averageWordLength: Math.round(avgWordLength * 100) / 100,
      longestWord: longestWord || '',
      shortestWord: shortestWord || '',
      characterCount: characters,
      characterCountNoSpaces: charactersNoSpaces,
      sentenceCount: sentences,
      averageSentenceLength: Math.round(avgSentenceLength * 100) / 100,
      longestSentence: this.getLongestSentence(text),
      shortestSentence: this.getShortestSentence(text),
      paragraphCount: paragraphs,
      averageParagraphLength: Math.round(avgParagraphLength * 100) / 100,
      syllableCount: syllables,
      averageSyllablesPerWord: wordCount > 0 ? Math.round((syllables / wordCount) * 100) / 100 : 0,
      vocabularyRichness: Math.round(vocabularyRichness * 100) / 100,
      complexWords,
      simpleWords,
      estimatedReadingTime,
      estimatedSpeakingTime
    };
  },

  getLongestSentence(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length === 0) return '';
    return sentences.reduce((a, b) => a.length > b.length ? a : b).trim();
  },

  getShortestSentence(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length === 0) return '';
    return sentences.reduce((a, b) => a.length < b.length ? a : b).trim();
  },

  formatWordCount(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  },

  getReadingTime(text: string): { minutes: number; seconds: number } {
    const words = this.countWords(text);
    const minutes = Math.floor(words / 200);
    const seconds = Math.floor((words / 200 - minutes) * 60);
    return { minutes, seconds };
  }
};
