import fs from 'fs';
import { extractDocxText } from '../src/services/verify/ingestionAdapters/officeZipAdapter';

async function main() {
  console.log('=== TEST 1: JOYSTICK DOCX ===');
  const joystickPath = 'C:\\Users\\faith\\Downloads\\Design and Construction of a Joystick-Controlled Industrial automation System.docx';
  if (fs.existsSync(joystickPath)) {
    const bytes = fs.readFileSync(joystickPath);
    const res = await extractDocxText(bytes);
    console.log('Joystick Result success:', res.success);
    console.log('Joystick wordCount:', res.wordCount);
    console.log('Joystick characterCount:', res.characterCount);
    if (!res.success) {
      console.error('Joystick error:', res.error);
    }
  } else {
    console.error('Joystick file missing:', joystickPath);
  }

  console.log('\n=== TEST 2: THERMOMETER DOCX ===');
  const thermometerPath = 'C:\\Users\\faith\\Downloads\\DIGITAL THERMOMETER real.docx';
  if (fs.existsSync(thermometerPath)) {
    const bytes = fs.readFileSync(thermometerPath);
    const res = await extractDocxText(bytes);
    console.log('Thermometer Result success:', res.success);
    console.log('Thermometer wordCount:', res.wordCount);
    console.log('Thermometer characterCount:', res.characterCount);
    if (!res.success) {
      console.error('Thermometer error:', res.error);
    }
  } else {
    console.log('Thermometer file not found at:', thermometerPath);
  }
}

main().catch(err => {
  console.error('Test error:', err);
});