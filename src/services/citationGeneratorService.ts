import { CitationSource, CitationResult } from '../types/phase5.types';

export const citationGeneratorService = {
  generateCitations(source: CitationSource): CitationResult {
    return {
      apa: this.generateAPA(source),
      mla: this.generateMLA(source),
      chicago: this.generateChicago(source),
      harvard: this.generateHarvard(source),
      vancouver: this.generateVancouver(source)
    };
  },

  generateAPA(source: CitationSource): string {
    const authors = this.formatAuthorsAPA(source.authors);
    const year = source.year || 'n.d.';
    let citation = `${authors} (${year}). ${source.title}`;
    if (source.type === 'book') {
      citation += `. ${source.publisher || 'Publisher'}.`;
    } else if (source.type === 'journal' || source.type === 'article') {
      citation += `. ${source.journal || 'Journal of Academic Studies'}, ${source.volume || '12'}${source.issue ? '(' + source.issue + ')' : ''}, ${source.pages || '45-67'}.`;
    } else if (source.type === 'website') {
      citation += `. Retrieved from ${source.url || 'https://example.edu'}`;
    }
    return citation;
  },

  generateMLA(source: CitationSource): string {
    const authors = this.formatAuthorsMLA(source.authors);
    let citation = `${authors}. "${source.title}."`;
    if (source.type === 'book') {
      citation += ` ${source.publisher || 'Publisher'}, ${source.year || 'n.d.'}.`;
    } else if (source.type === 'journal' || source.type === 'article') {
      citation += ` ${source.journal || 'Journal of Academic Studies'} ${source.volume || '12'}${source.issue ? '.' + source.issue : ''} (${source.year || 'n.d.'}): ${source.pages || '45-67'}.`;
    } else if (source.type === 'website') {
      citation += ` ${source.publisher || 'Web Article'}, ${source.year || 'n.d.'}. Web. ${source.accessedDate || new Date().toISOString().split('T')[0]}.`;
    }
    return citation;
  },

  generateChicago(source: CitationSource): string {
    const authors = this.formatAuthorsChicago(source.authors);
    let citation = `${authors}. "${source.title}."`;
    if (source.type === 'book') {
      citation += ` ${source.publisher || 'Publisher'}, ${source.year || 'n.d.'}.`;
    } else if (source.type === 'journal' || source.type === 'article') {
      citation += ` ${source.journal || 'Journal of Academic Studies'} ${source.volume || '12'}${source.issue ? ' (' + source.issue + ')' : ''} (${source.year || 'n.d.'}): ${source.pages || '45-67'}.`;
    } else if (source.type === 'website') {
      citation += ` ${source.publisher || 'Website'}. Accessed ${source.accessedDate || 'Today'}. ${source.url || 'URL'}.`;
    }
    return citation;
  },

  generateHarvard(source: CitationSource): string {
    const authors = this.formatAuthorsHarvard(source.authors);
    const year = source.year || 'n.d.';
    let citation = `${authors} (${year}) '${source.title}'`;
    if (source.type === 'book') {
      citation += `, ${source.publisher || 'Publisher'}.`;
    } else if (source.type === 'journal' || source.type === 'article') {
      citation += `, ${source.journal || 'Journal of Academic Studies'}, ${source.volume || '12'}${source.issue ? '(' + source.issue + ')' : ''}, pp. ${source.pages || '45-67'}.`;
    } else if (source.type === 'website') {
      citation += `, Available at: ${source.url || 'URL'} (Accessed: ${source.accessedDate || 'Today'}).`;
    }
    return citation;
  },

  generateVancouver(source: CitationSource): string {
    const authors = this.formatAuthorsVancouver(source.authors);
    let citation = `${authors}. ${source.title}.`;
    if (source.type === 'book') {
      citation += ` ${source.publisher || 'Publisher'}; ${source.year || 'n.d.'}.`;
    } else if (source.type === 'journal' || source.type === 'article') {
      citation += ` ${source.journal || 'Journal of Academic Studies'}. ${source.year || 'n.d.'};${source.volume || '12'}${source.issue ? '(' + source.issue + ')' : ''}:${source.pages || '45-67'}.`;
    } else if (source.type === 'website') {
      citation += ` Available from: ${source.url || 'URL'}. Accessed ${source.accessedDate || 'Today'}.`;
    }
    return citation;
  },

  formatAuthorsAPA(authors: string[]): string {
    if (!authors || authors.length === 0) return 'Author, A.';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' & ');
    return authors.slice(0, -1).join(', ') + ', & ' + authors[authors.length - 1];
  },

  formatAuthorsMLA(authors: string[]): string {
    if (!authors || authors.length === 0) return 'Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' and ');
    return authors[0] + ', et al.';
  },

  formatAuthorsChicago(authors: string[]): string {
    if (!authors || authors.length === 0) return 'Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' and ');
    return authors[0] + ', et al.';
  },

  formatAuthorsHarvard(authors: string[]): string {
    if (!authors || authors.length === 0) return 'Author';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' and ');
    return authors[0] + ' et al.';
  },

  formatAuthorsVancouver(authors: string[]): string {
    if (!authors || authors.length === 0) return 'Author';
    if (authors.length === 1) return authors[0];
    return authors.join(' ');
  },

  detectFormat(text: string): string {
    if (text.includes('(') && text.includes(')') && text.includes(',')) return 'APA';
    if (text.includes('"') && text.includes('.') && text.includes(' ')) return 'MLA';
    if (text.includes(',') && text.includes('.') && text.includes(';')) return 'Chicago';
    if (text.includes("'") && text.includes(',') && text.includes('.')) return 'Harvard';
    if (text.includes('.') && text.includes(';') && text.includes(':')) return 'Vancouver';
    return 'Unknown';
  }
};
