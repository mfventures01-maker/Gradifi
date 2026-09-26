// src/services/verify/server/passageExtractor.ts
function tokenizeWithOffsets(text) {
  const tokens = [];
  const regex = /[^\s\p{P}]+|\S/gu;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const normalized = raw.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    if (normalized.length > 0) {
      tokens.push({
        normalized,
        start: match.index,
        end: match.index + raw.length
      });
    }
  }
  return tokens;
}
function extractSnippetTokens(snippet) {
  const set = /* @__PURE__ */ new Set();
  const regex = /[^\s\p{P}]+|\S/gu;
  let match;
  while ((match = regex.exec(snippet)) !== null) {
    const normalized = match[0].toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    if (normalized.length > 0) {
      set.add(normalized);
    }
  }
  return set;
}
function extractStudentPassage(studentText, sourceSnippet, options) {
  if (!studentText || !sourceSnippet) return null;
  const trimmedSnippet = sourceSnippet.trim();
  if (!trimmedSnippet) return null;
  const rawIdx = studentText.indexOf(trimmedSnippet);
  if (rawIdx !== -1) {
    return {
      text: studentText.slice(rawIdx, rawIdx + trimmedSnippet.length),
      start: rawIdx,
      end: rawIdx + trimmedSnippet.length
    };
  }
  const lowerDoc = studentText.toLowerCase();
  const lowerSnippet = trimmedSnippet.toLowerCase();
  const lowerIdx = lowerDoc.indexOf(lowerSnippet);
  if (lowerIdx !== -1) {
    return {
      text: studentText.slice(lowerIdx, lowerIdx + trimmedSnippet.length),
      start: lowerIdx,
      end: lowerIdx + trimmedSnippet.length
    };
  }
  const windowTokens = options?.windowTokens ?? 12;
  const minScore = options?.minScore ?? 0.25;
  const docTokens = tokenizeWithOffsets(studentText);
  if (docTokens.length === 0) return null;
  const snippetTokenSet = extractSnippetTokens(sourceSnippet);
  if (snippetTokenSet.size === 0) return null;
  let bestScore = 0;
  let bestStart = -1;
  let bestEnd = -1;
  const effectiveWindow = Math.min(windowTokens, docTokens.length);
  for (let i = 0; i <= docTokens.length - effectiveWindow; i++) {
    const windowSlice = docTokens.slice(i, i + effectiveWindow);
    const windowTokenSet = /* @__PURE__ */ new Set();
    for (const t of windowSlice) {
      windowTokenSet.add(t.normalized);
    }
    let intersection = 0;
    for (const token of windowTokenSet) {
      if (snippetTokenSet.has(token)) {
        intersection++;
      }
    }
    if (intersection === 0) continue;
    const union = snippetTokenSet.size + windowTokenSet.size - intersection;
    const score = union > 0 ? intersection / union : 0;
    if (score > bestScore) {
      bestScore = score;
      bestStart = windowSlice[0].start;
      bestEnd = windowSlice[windowSlice.length - 1].end;
    }
  }
  if (bestScore >= minScore && bestStart !== -1 && bestEnd !== -1) {
    return {
      text: studentText.slice(bestStart, bestEnd),
      start: bestStart,
      end: bestEnd
    };
  }
  return null;
}

// src/services/verify/server/openAlexServerHandler.ts
function generateCorrelationId(prefix) {
  const nonce = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Date.now().toString(36);
  return `${prefix}_${Date.now()}_${nonce}`;
}
async function handleOpenAlexServerSearch(payload) {
  const requestTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const correlationId = generateCorrelationId("oa");
  const rawQuery = typeof payload?.query === "string" ? payload.query.trim() : "";
  if (!rawQuery) {
    const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return {
      providerId: "openalex",
      status: "partial",
      fineGrainedStatus: "EMPTY_RESULT",
      matches: [],
      rawCount: 0,
      errorMessage: "Query input is empty",
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
  const query = rawQuery.slice(0, 200);
  const limit = Math.max(1, Math.min(10, typeof payload?.limit === "number" ? payload.limit : 5));
  const email = process.env.VITE_OPENALEX_EMAIL || process.env.OPENALEX_EMAIL || "verify@gradifi.org";
  const apiKey = process.env.OPENALEX_API_KEY || process.env.VITE_OPENALEX_API_KEY;
  try {
    const fetchUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&mailto=${encodeURIComponent(email)}${apiKey ? `&api_key=${encodeURIComponent(apiKey)}` : ""}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45e3);
    const headers = {
      "Accept": "application/json",
      "User-Agent": `GradifiVerify/1.0 (mailto:${email})`
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
    const response = await fetch(fetchUrl, {
      method: "GET",
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    if (!response.ok) {
      const isAuthError = response.status === 401 || response.status === 403;
      const isRateLimited = response.status === 429;
      return {
        providerId: "openalex",
        status: isRateLimited || isAuthError ? "unavailable" : "error",
        fineGrainedStatus: isAuthError ? "AUTHENTICATION_FAILED" : isRateLimited ? "RATE_LIMITED" : "REQUEST_FAILED",
        matches: [],
        errorMessage: `OpenAlex API returned HTTP ${response.status}: ${response.statusText}`,
        errorCode: `HTTP_${response.status}`,
        requestTimestamp,
        responseTimestamp,
        correlationId
      };
    }
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    const matches = [];
    for (const item of results) {
      const doi = item.doi ? item.doi.replace("https://doi.org/", "") : void 0;
      const authors = (item.authorships || []).map((a) => a.author?.display_name).filter((name) => Boolean(name));
      let abstractSnippet = "";
      if (item.abstract_inverted_index) {
        const words = [];
        for (const [word, positions] of Object.entries(item.abstract_inverted_index)) {
          for (const pos of positions) {
            words.push([word, pos]);
          }
        }
        words.sort((a, b) => a[1] - b[1]);
        abstractSnippet = words.slice(0, 100).map((w) => w[0]).join(" ");
      }
      const originalSnippet = abstractSnippet || item.title || "";
      const studentText = typeof payload?.documentText === "string" && payload.documentText.trim() || rawQuery;
      const passage = extractStudentPassage(studentText, originalSnippet);
      const matchedText = passage ? passage.text : "";
      const matchPercentage = passage && studentText.length > 0 ? Math.round(passage.text.length / studentText.length * 100) : 0;
      const matchType = passage ? passage.text === originalSnippet ? "exact" : "lexical" : "semantic";
      const match = {
        sourceId: item.id || `openalex_${doi || item.publication_year || "record"}`,
        title: item.title || "Untitled OpenAlex Record",
        authors: authors.length > 0 ? authors : ["Unknown Author"],
        url: item.doi || item.id || "#",
        doi,
        matchedText,
        matchedTextStart: passage?.start,
        matchedTextEnd: passage?.end,
        originalSnippet,
        matchType,
        matchPercentage,
        relevanceScore: 0,
        // not yet populated — see HOEOS-RELEVANCE
        provenance: {
          provider: "openalex",
          providerRecordId: item.id || "",
          retrievedAt: responseTimestamp,
          sourceType: "openalex_work",
          sourceUrl: item.doi || item.id || "",
          title: item.title || "Untitled OpenAlex Record",
          authors: authors.length > 0 ? authors : ["Unknown Author"],
          doi,
          publishedYear: item.publication_year,
          publisher: item.primary_location?.source?.display_name,
          provenanceState: "VERIFIED",
          query,
          requestTimestamp,
          responseTimestamp,
          correlationId,
          fineGrainedStatus: "VERIFIED"
        }
      };
      matches.push(match);
    }
    return {
      providerId: "openalex",
      status: "success",
      fineGrainedStatus: matches.length > 0 ? "VERIFIED" : "EMPTY_RESULT",
      matches,
      rawCount: results.length,
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  } catch (error) {
    const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return {
      providerId: "openalex",
      status: "error",
      fineGrainedStatus: "REQUEST_FAILED",
      matches: [],
      errorMessage: error?.message || "Failed to execute OpenAlex API request",
      errorCode: "FETCH_ERROR",
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
}

// api/verify/openalex.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await handleOpenAlexServerSearch(req.body);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
export {
  handler as default
};
