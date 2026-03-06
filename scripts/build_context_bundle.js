import { writeBundleFiles } from './context-framework.js';

const result = await writeBundleFiles(process.cwd());

console.log(`Architecture doc tokens: ${result.architectureTokens}`);
for (const stat of result.splitStats) {
    console.log(`${stat.name}: ${stat.tokens} tokens (${stat.band}, combined ${stat.combined})`);
}
