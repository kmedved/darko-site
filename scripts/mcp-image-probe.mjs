import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod';

// Connect this private stdio server with Secure MCP Tunnel before testing charts.
const png = readFileSync(new URL('../static/favicon.png', import.meta.url));
serveStdio(() => {
  const server = new McpServer({ name: 'DARKO image display probe', version: '1.0.0' });
  server.registerTool('show_test_image', {
    description: 'Show an existing DARKO PNG to verify native image display and downloading.',
    inputSchema: z.object({}),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
  }, async () => ({
    content: [
      { type: 'image', mimeType: 'image/png', data: png.toString('base64') },
      { type: 'text', text: 'DARKO display probe. Download: https://www.darko.app/favicon.png' }
    ]
  }));
  return server;
});
