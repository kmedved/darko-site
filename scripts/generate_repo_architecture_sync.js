import { countTokens, writeGeneratedContextFiles } from './context-framework.js';

const { architectureDoc, syncArtifact, fileIndex, startHere } = await writeGeneratedContextFiles(process.cwd());

console.log(`Wrote context artifacts for version ${syncArtifact.arch_version}.`);
console.log(`REPO_ARCHITECTURE.md: ${countTokens(architectureDoc)} tokens`);
console.log(`FILE_INDEX.md: ${countTokens(fileIndex)} tokens`);
console.log(`START_HERE.md: ${countTokens(startHere)} tokens`);
