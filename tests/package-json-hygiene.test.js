import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
};

/**
 * Platform-specific native packages (like @rollup/rollup-win32-x64-msvc) must
 * never appear as direct dependencies. They are managed by npm as optional
 * platform-specific installs via the lockfile. Adding them to package.json
 * causes EBADPLATFORM failures on Vercel's Linux build machines.
 */
test('no platform-specific native packages in dependencies', () => {
    const platformPatterns = [
        /^@rollup\/rollup-(win32|linux|darwin|android|freebsd)/,
        /^@esbuild\/(win32|linux|darwin|android|freebsd)/,
        /^@swc\/core-(win32|linux|darwin|android|freebsd)/,
    ];

    const violations = Object.keys(allDeps).filter((dep) =>
        platformPatterns.some((re) => re.test(dep))
    );

    assert.deepEqual(
        violations,
        [],
        `Platform-specific packages found in package.json: ${violations.join(', ')}. ` +
            'These are auto-resolved per-platform via the lockfile and must not be direct dependencies.'
    );
});
