import { createMcpHandler, hostHeaderValidationResponse, originValidationResponse } from '@modelcontextprotocol/server';
import { dev } from '$app/environment';
import * as sources from '$lib/server/supabase.js';
import { getPlayerComps } from '$lib/server/comps.js';
import { getLatestGameDate } from '$lib/server/daily.js';
import { buildCareerChart, chartSpecSchema, whiteThemeTokens } from '$lib/server/charts/service.js';
import { createDarkoServer } from '$lib/server/mcp/server.js';
import type { RequestHandler } from './$types';

export const config = { regions: ['pdx1'], maxDuration: 60 };
const allowedHosts = ['darko.app', 'www.darko.app', ...(dev ? ['localhost', '127.0.0.1'] : []),
  ...[process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, ...(process.env.DARKO_MCP_ALLOWED_HOSTS || '').split(',')].filter(Boolean)];
const allowedOrigins = [...allowedHosts, 'chatgpt.com', 'claude.ai'];
const handler = createMcpHandler(({ requestInfo }) => createDarkoServer({
  sources: { ...sources, getLatestGameDate, getPlayerComps }, charts: { buildCareerChart, whiteThemeTokens }, chartSpecSchema,
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
