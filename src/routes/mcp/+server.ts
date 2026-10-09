import { createMcpHandler, hostHeaderValidationResponse, originValidationResponse } from '@modelcontextprotocol/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import * as sources from '$lib/server/supabase.js';
import { getPlayerComps } from '$lib/server/comps.js';
import { getLatestGameDate, getRatingMoves } from '$lib/server/daily.js';
import { buildCareerChart, chartSpecSchema, whiteThemeTokens } from '$lib/server/charts/service.js';
import { createDarkoServer } from '$lib/server/mcp/server.js';
import { createUsageRecorder } from '$lib/server/mcp/usage.js';
import type { RequestHandler } from './$types';

export const config = { regions: ['pdx1'], maxDuration: 60 };
const allowedHosts = ['darko.app', 'www.darko.app', ...(dev ? ['localhost', '127.0.0.1'] : []),
  ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, ...(process.env.DARKO_MCP_ALLOWED_HOSTS || '').split(',')].filter(Boolean)];
const allowedOrigins = [...allowedHosts, 'chatgpt.com', 'claude.ai'];

// Daily usage counters (supabase/migrations/20261008_001_add_mcp_usage_daily.sql), written with the
// service role like the Elo vote path. Runtime logs alone last an hour to a day on Vercel. Local
// development and deployments without the key only log.
let usageClient: SupabaseClient | null = null;
async function recordUsage(metrics: { tool: string; client: string; ok: boolean; duration_ms: number; player_count: number }, { signal }: { signal: AbortSignal }) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (dev || !key || !PUBLIC_SUPABASE_URL) return;
  usageClient ??= createClient(PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await usageClient.rpc('record_mcp_usage', {
    p_tool: metrics.tool, p_client: metrics.client, p_ok: metrics.ok,
    p_duration_ms: metrics.duration_ms, p_players: metrics.player_count
  }).abortSignal(signal);
  if (error) throw error;
}
const onToolCall = createUsageRecorder({ record: recordUsage });

const handler = createMcpHandler(({ requestInfo }) => createDarkoServer({
  sources: { ...sources, getLatestGameDate, getPlayerComps, getRatingMoves }, charts: { buildCareerChart, whiteThemeTokens }, chartSpecSchema,
  onToolCall, userAgent: requestInfo?.headers.get('user-agent') ?? '',
  origin: requestInfo ? new URL(requestInfo.url).origin : 'https://www.darko.app'
}), { legacy: 'stateless' });

const serve: RequestHandler = async ({ request }) => {
  const rejected = hostHeaderValidationResponse(request, allowedHosts) || originValidationResponse(request, allowedOrigins);
  if (rejected) return rejected;
  // Small specifications only; never accept career arrays or arbitrarily large POSTs.
  if (request.method === 'POST') {
    const body = await request.text();
    if (Buffer.byteLength(body) > 32_768) return new Response('MCP request too large', { status: 413 });
    return handler.fetch(new Request(request, { body }));
  }
  return handler.fetch(request);
};
export const POST = serve;
export const GET = serve;
export const DELETE = serve;
