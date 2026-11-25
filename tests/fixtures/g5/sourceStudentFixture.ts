/**
 * Shared, immutable positive and negative fixtures for deterministic plagiarism proof.
 * Keep SOURCE-A and STUDENT-A text identical across Vitest and real-browser tests.
 */
export const SOURCE_ID = 'SOURCE-A';

export const sourceText = [
  'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
  'Researchers publish the calibrated observations with transparent methods and reproducible measurement records.'
].join(' ');

export const studentText = [
  'Community gardens improve access to fresh produce in dense urban neighbourhoods.',
  'The coastal monitoring network records temperature shifts through distributed acoustic sensors and stores observations in a verified evidence ledger.',
  'Coastal monitoring networks record temperature changes using distributed acoustic sensors and preserve observations inside a verified evidence ledger.',
  'Local volunteers maintain planting schedules throughout the year.'
].join(' ');

export const unrelatedText = [
  'Community gardens improve access to fresh produce in dense urban neighbourhoods.',
  'Local volunteers maintain planting schedules throughout the year.',
  'Public parks provide recreational space for families and visitors.'
].join(' ');
