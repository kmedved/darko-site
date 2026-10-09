// Usage counting for the MCP endpoint. Only coarse, non-identifying fields are recorded:
// the tool, a client family, success, duration and how many players were involved.

/**
 * A coarse client name. ChatGPT tags every tool call with `openai/*` request metadata (OpenAI's
 * Apps SDK reference: openai/subject, openai/session, openai/locale and others); other clients
 * are recognized by user agent. Used for usage counts and to decide whether a tool result needs
 * an image (ChatGPT shows the chart widget instead).
 */
export function clientFamily({ userAgent = '', meta = null } = {}) {
  if (meta && typeof meta === 'object' && Object.keys(meta).some((key) => key.startsWith('openai/'))) return 'chatgpt';
  const agent = String(userAgent ?? '').toLowerCase();
  if (agent.includes('darko-production-check')) return 'monitor';
  if (agent.includes('codex')) return 'codex';
  if (agent.includes('openai') || agent.includes('chatgpt')) return 'chatgpt';
  if (agent.includes('claude-code')) return 'claude-code';
  if (agent.includes('claude')) return 'claude';
  if (agent.includes('cursor')) return 'cursor';
  if (agent.includes('vscode') || agent.includes('visual studio code')) return 'vscode';
  return 'other';
}

/**
 * Returns an `onToolCall` callback: one log line per call, plus an optional durable `record`
 * (a daily counter row). At `timeoutMs` it aborts the record callback's signal and stops
 * waiting. The callback must pass that signal to its request. Never fails the tool call.
 */
export function createUsageRecorder({ record = null, log = (line) => console.info('darko-mcp', line), timeoutMs = 1000 } = {}) {
  let warned = false;
  return async (metrics) => {
    try { log(JSON.stringify(metrics)); } catch { /* Logging must not affect the tool result. */ }
    if (!record) return;
    const controller = new AbortController();
    let timer;
    try {
      await Promise.race([
        Promise.resolve().then(() => record(metrics, { signal: controller.signal })),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error('usage counter timed out');
            controller.abort(error);
            reject(error);
          }, timeoutMs);
        })
      ]);
    } catch (error) {
      if (!warned) { warned = true; console.warn('darko-mcp usage counter unavailable:', error?.message || error); }
    } finally {
      clearTimeout(timer);
    }
  };
}
