// src/services/verify/federation/providerQuotas.ts
var PROVIDER_QUOTAS = {
  core: {
    providerId: "core",
    maxTokens: 1,
    refillRate: 0.5,
    // 0.5 tokens/sec (1 token every 2000ms)
    minIntervalMs: 2e3
    // Strict 2s floor between calls
  },
  crossref: {
    providerId: "crossref",
    maxTokens: 5,
    refillRate: 5,
    // 5 tokens/sec
    minIntervalMs: 200
    // 200ms floor
  },
  googlebooks: {
    providerId: "googlebooks",
    maxTokens: 2,
    refillRate: 1,
    // 1 token/sec
    minIntervalMs: 1e3
    // 1000ms floor
  },
  openalex: {
    providerId: "openalex",
    maxTokens: 5,
    refillRate: 5,
    // 5 tokens/sec
    minIntervalMs: 150
    // 150ms floor
  },
  unpaywall: {
    providerId: "unpaywall",
    maxTokens: 2,
    refillRate: 2,
    // 2 tokens/sec
    minIntervalMs: 500
    // 500ms floor
  }
};
function getProviderQuota(providerId) {
  const quota = PROVIDER_QUOTAS[providerId];
  if (quota) {
    return quota;
  }
  return {
    providerId,
    maxTokens: 2,
    refillRate: 1,
    minIntervalMs: 1e3
  };
}

// src/services/verify/federation/rateLimiter.ts
var RateLimiter = class {
  constructor(config) {
    this.lastAcquireMs = 0;
    this.queueTail = Promise.resolve();
    this.providerId = config.providerId;
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.minIntervalMs = config.minIntervalMs;
    this.tokens = config.maxTokens;
    this.lastRefillMs = Date.now();
  }
  refill() {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefillMs) / 1e3;
    if (elapsedSec > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + elapsedSec * this.refillRate);
      this.lastRefillMs = now;
    }
  }
  /**
   * Blocks until a token is available AND at least minIntervalMs has elapsed since last acquire.
   * Serializes requests across callers to guarantee strict FIFO order and interval preservation.
   */
  async acquire() {
    const acquireTask = async () => {
      while (true) {
        this.refill();
        const now = Date.now();
        const timeSinceLastAcquire = now - this.lastAcquireMs;
        const intervalRemaining = this.minIntervalMs - timeSinceLastAcquire;
        if (this.tokens >= 1 && intervalRemaining <= 0) {
          this.tokens -= 1;
          this.lastAcquireMs = Date.now();
          return;
        }
        let waitMs = 10;
        if (this.tokens < 1) {
          const tokenWait = Math.ceil((1 - this.tokens) / this.refillRate * 1e3);
          waitMs = Math.max(waitMs, tokenWait);
        }
        if (intervalRemaining > 0) {
          waitMs = Math.max(waitMs, intervalRemaining);
        }
        await new Promise((resolve) => setTimeout(resolve, Math.max(10, waitMs)));
      }
    };
    const currentWait = this.queueTail.then(acquireTask);
    this.queueTail = currentWait.catch(() => {
    });
    return currentWait;
  }
  /**
   * Returns current internal state snapshot.
   */
  state() {
    this.refill();
    return {
      tokens: Number(this.tokens.toFixed(3)),
      lastRefillMs: this.lastRefillMs
    };
  }
  /**
   * Reset limiter to initial state (for testing purposes).
   */
  reset(tokens) {
    this.tokens = tokens !== void 0 ? tokens : this.maxTokens;
    this.lastRefillMs = Date.now();
    this.lastAcquireMs = 0;
    this.queueTail = Promise.resolve();
  }
};
var rateLimiterRegistry = /* @__PURE__ */ new Map();
function getRateLimiter(providerId) {
  const normalizedId = providerId.toLowerCase();
  let limiter = rateLimiterRegistry.get(normalizedId);
  if (!limiter) {
    const quota = getProviderQuota(normalizedId);
    limiter = new RateLimiter({
      providerId: normalizedId,
      maxTokens: quota.maxTokens,
      refillRate: quota.refillRate,
      minIntervalMs: quota.minIntervalMs
    });
    rateLimiterRegistry.set(normalizedId, limiter);
  }
  return limiter;
}

// src/services/verify/federation/providerLogger.ts
function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  try {
    const urlObj = new URL(rawUrl);
    const paramsToDelete = [];
    urlObj.searchParams.forEach((_value, key) => {
      if (/key|token|secret|password|auth/i.test(key)) {
        paramsToDelete.push(key);
      }
    });
    for (const key of paramsToDelete) {
      urlObj.searchParams.set(key, "[REDACTED]");
    }
    return urlObj.toString();
  } catch {
    return rawUrl.replace(/([?&](?:api_)?(?:key|token|secret)=)[^&]+/gi, "$1[REDACTED]").replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, "$1[REDACTED]");
  }
}
function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== "string") return void 0;
  return msg.replace(/(key|token|secret)=[A-Za-z0-9\-._~]+/gi, "$1=[REDACTED]").replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, "$1[REDACTED]");
}
async function logProviderCall(log) {
  const sanitized = {
    ...log,
    url: sanitizeUrl(log.url),
    errorMessage: sanitizeErrorMessage(log.errorMessage)
  };
  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const dateFolder = sanitized.timestamp.slice(0, 10);
      const logDir = path.resolve("certification/federation_logs", dateFolder);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFilePath = path.join(logDir, `${sanitized.providerId.toLowerCase()}.jsonl`);
      const line = JSON.stringify(sanitized) + "\n";
      fs.appendFileSync(logFilePath, line, "utf8");
    } catch (err) {
      console.warn("[providerLogger] Failed to write disk log:", err);
    }
  }
}

// src/services/verify/federation/requestQueue.ts
var FederationQueueError = class extends Error {
  constructor(message, providerId, correlationId, attempts, durationMs, lastError) {
    super(message);
    this.name = "FederationQueueError";
    this.providerId = providerId;
    this.correlationId = correlationId;
    this.attempts = attempts;
    this.durationMs = durationMs;
    this.lastError = lastError;
  }
};
var RETRY_BACKOFF_MS = [0, 500, 2e3, 5e3];
var MAX_ATTEMPTS = 4;
var DEFAULT_PER_REQUEST_TIMEOUT_MS = 3e4;
var DEFAULT_TOTAL_BUDGET_MS = 12e4;
var providerQueues = /* @__PURE__ */ new Map();
function isRetryableError(err) {
  if (!err) return false;
  if (err.name === "AbortError" || err.name === "TimeoutError") return true;
  const status = err.status || err.statusCode || err.httpStatus;
  if (status === 429 || typeof status === "number" && status >= 500 && status < 600) {
    return true;
  }
  const msg = String(err.message || err.errorMessage || err.errorCode || "");
  if (msg.includes("429") || msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) {
    return true;
  }
  if (msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") || msg.includes("fetch failed") || msg.includes("FETCH_ERROR") || msg.includes("network") || msg.includes("TIMEOUT")) {
    return true;
  }
  if (msg.includes("401") || msg.includes("403") || msg.includes("400") || msg.includes("404") || msg.includes("AUTHENTICATION_FAILED") || msg.includes("MISSING_SERVER_KEY")) {
    return false;
  }
  return false;
}
function isRetryableResult(res) {
  if (!res || typeof res !== "object") return false;
  const provRes = res;
  if (provRes.fineGrainedStatus === "AUTHENTICATION_FAILED") return false;
  if (provRes.status === "success" || provRes.fineGrainedStatus === "EMPTY_RESULT" || provRes.fineGrainedStatus === "VERIFIED") return false;
  const code = provRes.errorCode || "";
  const msg = provRes.errorMessage || "";
  if (code === "HTTP_429" || code.includes("500") || code.includes("502") || code.includes("503") || code.includes("504") || code === "FETCH_ERROR" || code === "TIMEOUT") {
    return true;
  }
  if (msg.includes("429") || msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504") || msg.includes("fetch failed") || msg.includes("timeout")) {
    return true;
  }
  return false;
}
async function enqueue(req) {
  const providerId = req.providerId.toLowerCase();
  const limiter = getRateLimiter(providerId);
  const totalBudgetMs = req.totalBudgetMs || DEFAULT_TOTAL_BUDGET_MS;
  const timeoutMs = req.timeoutMs || (providerId === "openalex" ? 45e3 : DEFAULT_PER_REQUEST_TIMEOUT_MS);
  const overallStartTime = Date.now();
  const executeTask = async () => {
    let attempt = 0;
    let lastError = null;
    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      const attemptStartTime = Date.now();
      const elapsedTotal = Date.now() - overallStartTime;
      if (elapsedTotal >= totalBudgetMs) {
        const queueErr = new FederationQueueError(
          `Total budget of ${totalBudgetMs}ms exceeded for provider '${providerId}'`,
          providerId,
          req.correlationId,
          attempt,
          elapsedTotal,
          lastError
        );
        await logProviderCall({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          correlationId: req.correlationId,
          providerId,
          url: req.url || `https://${providerId}.api`,
          attempt,
          durationMs: Date.now() - attemptStartTime,
          outcome: "TIMEOUT",
          errorCode: "TOTAL_BUDGET_EXCEEDED",
          errorMessage: queueErr.message
        });
        throw queueErr;
      }
      if (attempt > 1) {
        const backoffMs = RETRY_BACKOFF_MS[attempt - 1] || 5e3;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
      await limiter.acquire();
      let attemptResult;
      let attemptError = null;
      try {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => {
            const err = new Error(`Request timeout of ${timeoutMs}ms exceeded`);
            err.name = "TimeoutError";
            reject(err);
          }, timeoutMs);
        });
        attemptResult = await Promise.race([req.fn(), timeoutPromise]);
        clearTimeout(timer);
      } catch (err) {
        attemptError = err;
      }
      const attemptDurationMs = Date.now() - attemptStartTime;
      if (attemptError) {
        lastError = attemptError;
        const retryable = isRetryableError(attemptError);
        if (retryable && attempt < MAX_ATTEMPTS) {
          if (req.onRetry) req.onRetry(attempt, attemptError);
          await logProviderCall({
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            correlationId: req.correlationId,
            providerId,
            url: req.url || `https://${providerId}.api`,
            attempt,
            durationMs: attemptDurationMs,
            outcome: "RETRY",
            errorCode: attemptError.name || "REQUEST_ERROR",
            errorMessage: attemptError.message
          });
          continue;
        }
        await logProviderCall({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          correlationId: req.correlationId,
          providerId,
          url: req.url || `https://${providerId}.api`,
          attempt,
          durationMs: attemptDurationMs,
          outcome: attemptError.name === "TimeoutError" ? "TIMEOUT" : "FAILED",
          errorCode: attemptError.name || "REQUEST_FAILED",
          errorMessage: attemptError.message
        });
        throw attemptError;
      }
      if (isRetryableResult(attemptResult)) {
        const provRes2 = attemptResult;
        lastError = provRes2;
        if (attempt < MAX_ATTEMPTS) {
          if (req.onRetry) req.onRetry(attempt, provRes2);
          await logProviderCall({
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            correlationId: req.correlationId,
            providerId,
            url: req.url || `https://${providerId}.api`,
            attempt,
            durationMs: attemptDurationMs,
            outcome: "RETRY",
            errorCode: provRes2.errorCode || "RETRYABLE_STATUS",
            errorMessage: provRes2.errorMessage,
            matchesReturned: provRes2.matches?.length || 0,
            fineGrainedStatus: provRes2.fineGrainedStatus
          });
          continue;
        }
        await logProviderCall({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          correlationId: req.correlationId,
          providerId,
          url: req.url || `https://${providerId}.api`,
          attempt,
          durationMs: attemptDurationMs,
          outcome: "FAILED",
          errorCode: provRes2.errorCode || "REQUEST_FAILED",
          errorMessage: provRes2.errorMessage,
          matchesReturned: provRes2.matches?.length || 0,
          fineGrainedStatus: provRes2.fineGrainedStatus
        });
        return attemptResult;
      }
      const provRes = attemptResult;
      await logProviderCall({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        correlationId: req.correlationId,
        providerId,
        url: req.url || `https://${providerId}.api`,
        attempt,
        durationMs: attemptDurationMs,
        outcome: "SUCCESS",
        matchesReturned: provRes?.matches?.length || 0,
        fineGrainedStatus: provRes?.fineGrainedStatus || "VERIFIED"
      });
      return attemptResult;
    }
    const exhaustedErr = new FederationQueueError(
      `Max retries (${MAX_ATTEMPTS}) exceeded for provider '${providerId}'`,
      providerId,
      req.correlationId,
      attempt,
      Date.now() - overallStartTime,
      lastError
    );
    throw exhaustedErr;
  };
  const prevQueue = providerQueues.get(providerId) || Promise.resolve();
  const currentTask = prevQueue.then(executeTask, executeTask);
  providerQueues.set(providerId, currentTask.catch(() => {
  }));
  return currentTask;
}

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

// src/services/verify/server/semanticScholarServerHandler.ts
function generateCorrelationId(prefix) {
  const nonce = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID().replace(/-/g, "").slice(0, 8) : Date.now().toString(36);
  return `${prefix}_${Date.now()}_${nonce}`;
}
async function handleSemanticScholarServerSearch(payload) {
  const requestTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  const correlationId = generateCorrelationId("s2");
  const rawQuery = typeof payload?.query === "string" ? payload.query.trim() : "";
  if (!rawQuery) {
    const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return {
      providerId: "semanticscholar",
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
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  if (!apiKey) {
    const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return {
      providerId: "semanticscholar",
      status: "unavailable",
      fineGrainedStatus: "AUTHENTICATION_FAILED",
      matches: [],
      errorMessage: "SEMANTIC_SCHOLAR_API_KEY server configuration is unavailable",
      errorCode: "MISSING_SERVER_KEY",
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
  const fetchUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=title,abstract,year,authors,externalIds,openAccessPdf,citationCount`;
  try {
    return await enqueue({
      providerId: "semanticscholar",
      correlationId,
      url: fetchUrl,
      fn: async () => {
        const response = await fetch(fetchUrl, {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
            "Accept": "application/json",
            "User-Agent": "GradifiVerify/1.0"
          }
        });
        const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
        if (!response.ok) {
          const isAuthError = response.status === 401 || response.status === 403;
          const isRateLimited = response.status === 429;
          return {
            providerId: "semanticscholar",
            status: isRateLimited || isAuthError ? "unavailable" : "error",
            fineGrainedStatus: isAuthError ? "AUTHENTICATION_FAILED" : isRateLimited ? "RATE_LIMITED" : "REQUEST_FAILED",
            matches: [],
            errorMessage: `Semantic Scholar API returned HTTP ${response.status}: ${response.statusText}`,
            errorCode: `HTTP_${response.status}`,
            requestTimestamp,
            responseTimestamp,
            correlationId
          };
        }
        const data = await response.json();
        const results = Array.isArray(data?.data) ? data.data : [];
        const matches = [];
        for (const paper of results) {
          const paperId = paper.paperId || "";
          const title = typeof paper.title === "string" ? paper.title.trim() : "Untitled Semantic Scholar Paper";
          const authors = Array.isArray(paper.authors) ? paper.authors.map((a) => a?.name).filter((n) => typeof n === "string" && n.length > 0) : [];
          const doi = paper.externalIds?.DOI;
          const isbn = paper.externalIds?.ISBN;
          const url = paper.openAccessPdf?.url || (paperId ? `https://www.semanticscholar.org/paper/${paperId}` : "#");
          const originalSnippet = (typeof paper.abstract === "string" && paper.abstract.trim() ? paper.abstract : title).slice(0, 300);
          const studentText = typeof payload?.documentText === "string" && payload.documentText.trim() || rawQuery;
          const passage = extractStudentPassage(studentText, originalSnippet);
          const matchedText = passage ? passage.text : "";
          const matchPercentage = passage && studentText.length > 0 ? Math.round(passage.text.length / studentText.length * 100) : 0;
          const matchType = passage ? passage.text === originalSnippet ? "exact" : "lexical" : "lexical";
          const match = {
            sourceId: paperId ? `s2:${paperId}` : `s2_${doi || "record"}`,
            title,
            authors: authors.length > 0 ? authors : ["Unknown Author"],
            url,
            doi,
            isbn,
            matchedText,
            matchedTextStart: passage?.start,
            matchedTextEnd: passage?.end,
            originalSnippet,
            matchType,
            matchPercentage,
            relevanceScore: 0,
            // not yet populated — see HOEOS-RELEVANCE
            provenance: {
              provider: "semanticscholar",
              providerRecordId: paperId,
              retrievedAt: responseTimestamp,
              sourceType: "semantic_scholar_paper",
              sourceUrl: url,
              title,
              authors: authors.length > 0 ? authors : ["Unknown Author"],
              doi,
              isbn,
              publishedYear: typeof paper.year === "number" ? paper.year : void 0,
              provenanceState: doi ? "VERIFIED" : "PARTIAL",
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
          providerId: "semanticscholar",
          status: "success",
          fineGrainedStatus: matches.length > 0 ? "VERIFIED" : "EMPTY_RESULT",
          matches,
          rawCount: results.length,
          requestTimestamp,
          responseTimestamp,
          correlationId
        };
      }
    });
  } catch (error) {
    const responseTimestamp = (/* @__PURE__ */ new Date()).toISOString();
    return {
      providerId: "semanticscholar",
      status: "error",
      fineGrainedStatus: "REQUEST_FAILED",
      matches: [],
      errorMessage: error?.message || "Failed to execute Semantic Scholar API request",
      errorCode: "FETCH_ERROR",
      requestTimestamp,
      responseTimestamp,
      correlationId
    };
  }
}

// api/verify/semanticscholar.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const result = await handleSemanticScholarServerSearch(req.body);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e?.message ?? "Unknown error" });
  }
}
export {
  handler as default
};
