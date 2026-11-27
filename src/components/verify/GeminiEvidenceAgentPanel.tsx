import React, { useEffect, useState } from 'react';
import { Sparkles, Send, ShieldCheck, Loader2, LockKeyhole } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import type { CorrectionComparison } from '../../services/verify/correctionComparisonClient.js';

type AgentMessage = { role: 'user' | 'model'; text: string };
type AgentStatus =
  | 'NOT_TESTED'
  | 'VERIFIED'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'RUNTIME_UNAVAILABLE'
  | 'INFERENCE_FAILED'
  | 'SCHEMA_INVALID';

interface GeminiEvidenceAgentPanelProps {
  verificationId: string;
  comparison?: CorrectionComparison | null;
}

const STATUS_LABELS: Record<AgentStatus, string> = {
  NOT_TESTED: 'Not tested',
  VERIFIED: 'Gemini connected',
  AUTHENTICATION_FAILED: 'Authentication required or failed',
  RATE_LIMITED: 'Rate limited',
  TIMEOUT: 'Request timed out',
  NETWORK_ERROR: 'Network unavailable',
  RUNTIME_UNAVAILABLE: 'Gemini temporarily unavailable',
  INFERENCE_FAILED: 'Response failed',
  SCHEMA_INVALID: 'Invalid response'
};

export const GeminiEvidenceAgentPanel: React.FC<GeminiEvidenceAgentPanelProps> = ({
  verificationId,
  comparison
}) => {
  const [messages, setMessages] = useState<AgentMessage[]>([{
    role: 'model',
    text: 'I can explain the verified passages, compare the student and source wording, suggest responsible citation and paraphrasing steps, and explain your before-and-after receipts. I cannot change your G5 result or receipt.'
  }]);
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<AgentStatus>('NOT_TESTED');
  const [model, setModel] = useState('');
  const [sending, setSending] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) setAuthenticated(!error && Boolean(data.session?.access_token));
    }).catch(() => {
      if (active) setAuthenticated(false);
    });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || sending) return;

    setSending(true);
    setQuestion('');
    const nextMessages: AgentMessage[] = [...messages, { role: 'user', text: prompt }];
    setMessages(nextMessages);

    try {
      const { data, error } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (error || !accessToken) {
        setAuthenticated(false);
        setStatus('AUTHENTICATION_FAILED');
        setMessages(current => [...current, {
          role: 'model',
          text: 'Please sign in to Gradifi before asking Gemini to access a private verification receipt.'
        }]);
        return;
      }
      setAuthenticated(true);

      const response = await fetch('/api/verify/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: 'Bearer ' + accessToken
        },
        body: JSON.stringify({
          action: 'agent_chat',
          verificationId,
          question: prompt,
          history: messages.slice(-8),
          comparison: comparison ? {
            originalVerificationId: comparison.originalVerificationId,
            correctedVerificationId: comparison.correctedVerificationId
          } : undefined
        }),
        signal: AbortSignal.timeout(18_000)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const mapped: AgentStatus = response.status === 401 || response.status === 403
          ? 'AUTHENTICATION_FAILED'
          : response.status === 429 ? 'RATE_LIMITED'
            : response.status === 504 ? 'TIMEOUT'
              : 'INFERENCE_FAILED';
        setStatus(mapped);
        setMessages(current => [...current, {
          role: 'model',
          text: result.error || STATUS_LABELS[mapped] + '. Please try again.'
        }]);
        return;
      }

      const nextStatus = (result.status || 'INFERENCE_FAILED') as AgentStatus;
      setStatus(nextStatus);
      setModel(result.actualModel || result.requestedModel || '');
      setMessages(current => [...current, {
        role: 'model',
        text: nextStatus === 'VERIFIED'
          ? String(result.answer || 'Gemini returned no explanation.')
          : String(result.errorMessage || STATUS_LABELS[nextStatus] + '. Please try again later.')
      }]);
    } catch (error: any) {
      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      const nextStatus: AgentStatus = timedOut ? 'TIMEOUT' : 'NETWORK_ERROR';
      setStatus(nextStatus);
      setMessages(current => [...current, {
        role: 'model',
        text: STATUS_LABELS[nextStatus] + '. Your saved verification result remains unchanged.'
      }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-violet-700/40 bg-slate-900/90 p-6 shadow-xl space-y-4"
      data-testid="gemini-evidence-agent"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-2 text-violet-300">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white">Gemini Evidence Assistant</h3>
            <p className="text-xs text-slate-400">Evidence-grounded explanations and student guidance</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
          <span className={'h-2 w-2 rounded-full ' + (status === 'VERIFIED' ? 'bg-emerald-400' : 'bg-slate-500')} />
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-[11px] text-slate-400 flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
        Gemini reads the integrity-validated receipt on the server. G5 scores, findings, hashes and receipts remain authoritative and cannot be changed by this assistant.
      </div>

      {comparison && (
        <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-3 text-xs text-cyan-200">
          Before-and-after receipts are available for this conversation. Ask Gemini to explain the measured changes.
        </div>
      )}

      <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={'flex ' + (message.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={'max-w-[90%] whitespace-pre-wrap rounded-xl px-3.5 py-3 text-sm leading-relaxed ' +
              (message.role === 'user'
                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100'
                : 'bg-slate-900 border border-slate-800 text-slate-200')}>
              {message.text}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 text-xs text-violet-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Gemini is reviewing the verified evidence...
          </div>
        )}
      </div>

      {authenticated === false && (
        <div className="flex items-center gap-2 text-xs text-amber-300">
          <LockKeyhole className="h-4 w-4" />
          Sign in is required to access this private receipt with Gemini.
          <a href="/login" className="font-bold underline underline-offset-2">Sign in</a>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <textarea
          value={question}
          onChange={event => setQuestion(event.target.value)}
          rows={2}
          maxLength={1800}
          disabled={sending || authenticated === false}
          placeholder="Ask about a flagged passage, its source, citation, correction guidance or your before-and-after result..."
          className="min-h-14 flex-1 resize-y rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-violet-500 disabled:opacity-50"
          aria-label="Ask Gemini about this verification"
        />
        <button
          type="submit"
          disabled={sending || !question.trim() || authenticated === false}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Ask Gemini
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
        <span>Receipt: {verificationId}</span>
        <span>{model ? 'Model: ' + model : 'Model reported after a successful response'}</span>
      </div>
    </section>
  );
};
