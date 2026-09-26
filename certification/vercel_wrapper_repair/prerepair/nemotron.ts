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

// src/services/verify/server/nemotronServerHandler.ts
var RETRIABLE_STATUSES = /* @__PURE__ */ new Set([429, 502, 503, 504]);
var MAX_ATTEMPTS = 3;
var BACKOFF_MS = [1e3, 2e3, 4e3];
async function callNvidiaWithRetry(url, options, maxAttempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(45e3)
      });
      if (!RETRIABLE_STATUSES.has(resp.status)) {
        return resp;
      }
      lastError = new Error(`HTTP ${resp.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxAttempts) {
      await new Promise(
        (r) => setTimeout(r, BACKOFF_MS[attempt - 1] ?? 1e3)
      );
    }
  }
  throw lastError ?? new Error("NVIDIA request failed");
}
async function handleNemotronServerReasoning(payload) {
  const documentText = typeof payload?.documentText === "string" ? payload.documentText : "";
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const validSourceIds = new Set(matches.map((m) => m.sourceId));
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey || nvidiaKey.includes("YOUR_")) {
    return {
      status: "AUTHENTICATION_FAILED",
      findings: generateDeterministicFallbackFindings(documentText, matches),
      errorMessage: "NVIDIA_API_KEY server configuration is unavailable"
    };
  }
  try {
    const evidenceSummary = matches.slice(0, 3).map((m) => ({
      sourceId: m.sourceId,
      title: m.title,
      authors: m.authors,
      snippet: m.originalSnippet.slice(0, 150)
    }));
    const prompt = `You are an academic integrity forensic analyst. Analyze this text for academic evidence overlap:
STUDENT TEXT: "${documentText.slice(0, 800)}"
VERIFIED EVIDENCE MATCHES: ${JSON.stringify(evidenceSummary)}

CRITICAL: You MUST respond ONLY with a raw JSON array matching this exact schema:
[
  {
    "type": "exact_overlap|lexical_overlap|semantic_overlap|citation_issue|writing_signal",
    "severity": "low|moderate|high",
    "confidence": 85,
    "studentPassage": "exact passage from student text",
    "sourcePassage": "exact passage from source",
    "explanation": "clear analytical explanation",
    "sourceId": "sourceId from matches if applicable",
    "requiresHumanReview": true
  }
]
Do NOT wrap in markdown backticks. Do NOT include any intro or outro text. Output ONLY valid JSON.`;
    let response;
    try {
      response = await callNvidiaWithRetry(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nvidiaKey}`
          },
          body: JSON.stringify({
            model: "nvidia/nemotron-3-super-120b-a12b",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 500,
            temperature: 0.2
          })
        }
      );
    } catch (err) {
      return {
        status: "INFERENCE_FAILED",
        findings: generateDeterministicFallbackFindings(
          documentText,
          matches
        ),
        errorMessage: `NVIDIA API unreachable after ${MAX_ATTEMPTS} attempts`
      };
    }
    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      return {
        status: isAuthError ? "AUTHENTICATION_FAILED" : "INFERENCE_FAILED",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: `NVIDIA API returned HTTP ${response.status}: ${response.statusText}`
      };
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    if (!content.trim()) {
      return {
        status: "INFERENCE_FAILED",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: "Nemotron returned empty content"
      };
    }
    let cleanedContent = content.trim();
    cleanedContent = cleanedContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    cleanedContent = cleanedContent.replace(/<think>[\s\S]*$/gi, "").trim();
    cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const arrayMatch = cleanedContent.match(/\[[\s\S]*\]/);
    const cleanedJson = arrayMatch ? arrayMatch[0] : cleanedContent;
    let parsed;
    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      return {
        status: "INFERENCE_FAILED",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: "Nemotron response could not be parsed as JSON"
      };
    }
    if (!Array.isArray(parsed)) {
      return {
        status: "INFERENCE_FAILED",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: "Nemotron response was not a JSON array"
      };
    }
    const validatedFindings = [];
    for (const item of parsed) {
      const validated = validateAIFindingSchema(item);
      if (validated) {
        if (validated.sourceId && !validSourceIds.has(validated.sourceId)) {
          validated.sourceId = void 0;
        }
        validated.modelProvider = "nemotron";
        validatedFindings.push(validated);
      }
    }
    if (validatedFindings.length === 0) {
      return {
        status: "INFERENCE_FAILED",
        findings: generateDeterministicFallbackFindings(documentText, matches),
        errorMessage: "Nemotron JSON contained no valid findings matching schema"
      };
    }
    return {
      status: "INFERENCE_VERIFIED",
      findings: validatedFindings
    };
  } catch (error) {
    return {
      status: "INFERENCE_FAILED",
      findings: generateDeterministicFallbackFindings(documentText, matches),
      errorMessage: error?.message || "Nemotron server reasoning failed"
    };
  }
}

// api/verify/nemotron.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await handleNemotronServerReasoning(req.body);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
export {
  handler as default
};
