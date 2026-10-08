import { mkdtempSync, mkdirSync, cpSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import './generate-darko-methodology.mjs';

const output = resolve(process.argv[2] || '.agents/artifacts/darko-plugin.zip');
const stage = mkdtempSync(join(tmpdir(), 'darko-plugin-package-'));
cpSync(new URL('../plugins/darko/', import.meta.url), stage, { recursive: true });
const appId = process.env.DARKO_PLUGIN_APP_ID;
if (appId && process.env.DARKO_PLUGIN_MCP_URL) throw new Error('Choose a registered ChatGPT app or a portable MCP endpoint');
if (appId) {
  if (!/^asdk_app_[A-Za-z0-9]+$/.test(appId)) throw new Error('Use the registered asdk_app_ ID, without the plugin_ prefix');
  const path = join(stage, 'plugin.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  manifest.extensions['com.openai'].apps = './.app.json';
  writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(stage, '.app.json'), JSON.stringify({ apps: { darko: { id: appId, required: true } } }, null, 2) + '\n');
}
if (process.env.DARKO_PLUGIN_MCP_URL) {
  const endpoint = new URL(process.env.DARKO_PLUGIN_MCP_URL);
  if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname)) throw new Error('Use HTTPS for a remote MCP endpoint');
  const path = join(stage, 'mcp.json');
  const config = JSON.parse(readFileSync(path, 'utf8'));
  config.mcpServers.darko.url = endpoint.href;
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
}
mkdirSync(resolve(output, '..'), { recursive: true });
const archive = join(stage, 'archive.zip');
execFileSync('zip', ['-q', '-r', archive, 'plugin.json', appId ? '.app.json' : 'mcp.json', 'skills', 'assets'], { cwd: stage });
copyFileSync(archive, output);
console.log(output);
