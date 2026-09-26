// src/services/verify/server/geminiServerHandler.ts
function validateAIFindingSchema(raw) {
  if (!raw || typeof raw !== "object") return null;
  const validTypes = ["exact_overlap", "lexical_overlap", "semantic_overlap", "citation_issue", "writing_signal"];
  const validSeverities = ["low", "moderate", "high"];
  const type = validTypes.includes(raw.type) ? raw.type : "lexical_overlap";
  const severity = validSeverities.includes(raw.severity) ? raw.severity : "moderate";
  const confidence = typeof raw.confidence === "number" && !isNaN(raw.confidence) ? Math.max(0, Math.min(100, Math.round(raw.confidence))) : 80;
  if (typeof raw.explanation !== "string" || !raw.explanation.trim()) {
    return null;
  }
  return {
    type,
    severity,
    confidence,
    studentPassage: typeof raw.studentPassage === "string" && raw.studentPassage.trim() ? raw.studentPassage.trim() : void 0,
    sourcePassage: typeof raw.sourcePassage === "string" && raw.sourcePassage.trim() ? raw.sourcePassage.trim() : void 0,
    explanation: raw.explanation.trim(),
    sourceId: typeof raw.sourceId === "string" && raw.sourceId.trim() ? raw.sourceId.trim() : void 0,
    requiresHumanReview: Boolean(raw.requiresHumanReview),
    modelProvider: "gemini"
  };
}
function generateDeterministicFallbackFindings(documentText, matches) {
  const findings = [];
  for (const match of matches) {
    if (match.matchPercentage > 25) {
      findings.push({
        type: match.matchType === "exact" ? "exact_overlap" : "lexical_overlap",
        severity: match.matchPercentage > 50 ? "high" : "moderate",
        confidence: Math.min(95, Math.max(70, match.matchPercentage + 20)),
        studentPassage: match.matchedText || documentText.slice(0, 150),
        sourcePassage: match.originalSnippet.slice(0, 150),
        explanation: `Substantial textual overlap detected with "${match.title}" (DOI: ${match.doi || "N/A"}). Verification required.`,
        sourceId: match.sourceId,
        requiresHumanReview: true,
        modelProvider: "deterministic_fallback"
      });
    } else if (match.matchPercentage > 10) {
      findings.push({
        type: "citation_issue",
        severity: "low",
        confidence: 80,
        studentPassage: match.matchedText || void 0,
        sourcePassage: match.originalSnippet.slice(0, 150),
        explanation: `Possible uncredited paraphrase or reference matching "${match.title}".`,
        sourceId: match.sourceId,
        requiresHumanReview: false,
        modelProvider: "deterministic_fallback"
      });
    }
  }
  if (findings.length === 0) {
    findings.push({
      type: "writing_signal",
      severity: "low",
      confidence: 90,
      explanation: "No significant academic overlap detected. Document appears original based on federated database search.",
      requiresHumanReview: false,
      modelProvider: "deterministic_fallback"
    });
  }
  return findings;
}

// src/services/verify/server/gemmaServerHandler.ts
async function handleGemmaServerReasoning(payload) {
  const documentText = typeof payload?.documentText === "string" ? payload.documentText : "";
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const requestedModel = payload?.model || "gemma4:31b";
  const validSourceIds = new Set(matches.map((m) => m.sourceId));
  const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3e3);
    const tagsResponse = await fetch(`${ollamaHost}/api/tags`, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!tagsResponse.ok) {
      return {
        status: "RUNTIME_UNAVAILABLE",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: `Ollama daemon returned status ${tagsResponse.status} at ${ollamaHost}`
      };
    }
    const tagsData = await tagsResponse.json();
    const installedModels = Array.isArray(tagsData?.models) ? tagsData.models.map((m) => m.name || m.model || "") : [];
    const targetModel = installedModels.find((m) => m.includes(requestedModel)) || installedModels.find((m) => m.toLowerCase().includes("gemma")) || installedModels[0];
    if (!targetModel) {
      return {
        status: "RUNTIME_UNAVAILABLE",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: `Target Gemma model (${requestedModel}) is not installed on local Ollama daemon at ${ollamaHost}`
      };
    }
    const evidenceSummary = matches.slice(0, 5).map((m) => ({
      sourceId: m.sourceId,
      title: m.title,
      authors: m.authors,
      matchedText: m.matchedText,
      snippet: m.originalSnippet.slice(0, 200)
    }));
    const prompt = `You are an academic integrity forensic analyst for Gradifi Verify.
Analyze the following student text against verified academic evidence matches:

STUDENT TEXT:
"${documentText.slice(0, 1500)}"

VERIFIED EVIDENCE MATCHES:
${JSON.stringify(evidenceSummary, null, 2)}

Respond ONLY with a JSON array of findings. Each finding object must match:
{
  "type": "exact_overlap" | "lexical_overlap" | "semantic_overlap" | "citation_issue" | "writing_signal",
  "severity": "low" | "moderate" | "high",
  "confidence": number (0-100),
  "studentPassage": string,
  "sourcePassage": string,
  "explanation": string,
  "sourceId": string,
  "requiresHumanReview": boolean
}
`;
    const chatResponse = await fetch(`${ollamaHost}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: "system", content: "You are a precise JSON-only academic verification system." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });
    if (!chatResponse.ok) {
      return {
        status: "INFERENCE_FAILED",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: `Ollama chat completion failed with status ${chatResponse.status}`
      };
    }
    const chatData = await chatResponse.json();
    const content = chatData?.choices?.[0]?.message?.content || "";
    let parsed = null;
    try {
      parsed = JSON.parse(content);
      if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.findings)) {
        parsed = parsed.findings;
      }
    } catch {
      parsed = null;
    }
    if (!Array.isArray(parsed)) {
      return {
        status: "INFERENCE_FAILED",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: "Ollama model did not return a valid JSON findings array"
      };
    }
    const validatedFindings = [];
    for (const item of parsed) {
      const validated = validateAIFindingSchema(item);
      if (validated) {
        if (validated.sourceId && !validSourceIds.has(validated.sourceId)) {
          validated.sourceId = void 0;
        }
        validatedFindings.push(validated);
      }
    }
    return {
      status: "INFERENCE_VERIFIED",
      findings: validatedFindings.length > 0 ? validatedFindings : generateDeterministicFallbackFindings(documentText, matches)
    };
  } catch (error) {
    return {
      status: "RUNTIME_UNAVAILABLE",
      findings: generateDeterministicFallbackFindings(documentText, matches),
      errorMessage: error?.message || "Failed to connect to local Ollama inference server"
    };
  }
}

// api/verify/gemma.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await handleGemmaServerReasoning(req.body);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
export {
  handler as default
};
