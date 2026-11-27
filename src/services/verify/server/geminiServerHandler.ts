/**
 * GRADIFI VERIFY - CANONICAL SERVER-SIDE GEMINI ADAPTER
 * One credential path only: GEMINI_API_KEY, read exclusively by the server adapter.
 * The service-account fallback has been retired to avoid competing auth configurations.
 */

import { handleGeminiApiKeyServerReasoning } from './geminiApiKeyServerHandler.js';
import type { GeminiServerRequestPayload, GeminiServerResponse } from './geminiFindingSchema.js';

export type { GeminiServerRequestPayload, GeminiServerResponse };
export {
  validateAIFindingSchema,
  generateDeterministicFallbackFindings
} from './geminiFindingSchema.js';

export async function handleGeminiServerReasoning(
  payload: GeminiServerRequestPayload
): Promise<GeminiServerResponse> {
  return handleGeminiApiKeyServerReasoning(payload);
}
