import { RubricCriterion } from '../types/phase4.types';

export const rubricService = {
  getDefaultLiteratureRubric(): RubricCriterion[] {
    return [
      {
        id: 'crit_1',
        name: 'Thesis & Argumentation',
        description: 'Clear central claim; strong contextualization of the green light motif.',
        maxScore: 30,
        weight: 1.0,
      },
      {
        id: 'crit_2',
        name: 'Evidence & Textual Support',
        description: 'Direct quotes integrated cleanly in paragraphs 2 and 4. Minor citation format issue.',
        maxScore: 35,
        weight: 1.0,
      },
      {
        id: 'crit_3',
        name: 'Structure & Mechanics',
        description: 'Flawless transitions and varied sentence structure throughout.',
        maxScore: 35,
        weight: 1.0,
      },
    ];
  },
};
