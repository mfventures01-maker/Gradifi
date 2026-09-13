/**
 * GRADIFI VERIFY - STANDARDS-COMPLIANT QR CODE GENERATOR
 *
 * HOEOS G5.10:
 * - Uses the standards-compliant `qrcode` encoder (v1.5.4).
 * - Error correction level M, dark #0f172a, light #ffffff, margin 2.
 * - Deterministic output for identical payload/options.
 * - Client-safe, zero secrets, zero randomness.
 */

import QRCode from 'qrcode';

export async function generateQRCodeSVG(
  text: string,
  size: number = 180
): Promise<string> {
  if (!text || text.trim().length === 0) {
    throw new Error('QR payload must not be empty');
  }

  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('QR size must be a positive finite number');
  }

  const normalizedText = text.trim();

  const svg = await QRCode.toString(normalizedText, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    width: size,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });

  return svg;
}

