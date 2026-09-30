import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getVoteClientAddress,
    getVoteRateLimitSubject,
    voteClientKey
} from '../src/lib/server/eloSecurity.js';

const SALT = 'test-salt';
const subject = (headers) => getVoteRateLimitSubject(new Headers(headers), SALT);
const vercel = (address) => ({ 'x-real-ip': address, 'x-forwarded-for': address });

test('headers the client controls do not open a new vote rate-limit bucket', () => {
    const base = subject(vercel('203.0.113.7'));
    for (const spoof of [
        { 'user-agent': 'agent-1' },
        { 'user-agent': 'agent-2' },
        { 'cf-connecting-ip': '198.51.100.1' },
        { 'cf-connecting-ip': '198.51.100.2', 'user-agent': 'agent-3' }
    ]) {
        assert.equal(subject({ ...vercel('203.0.113.7'), ...spoof }), base, JSON.stringify(spoof));
    }
});

test('the bucket follows the client address Vercel sets', () => {
    assert.notEqual(subject(vercel('203.0.113.7')), subject(vercel('203.0.113.8')));
    assert.equal(getVoteClientAddress(new Headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.9' })),
        '203.0.113.7');
    assert.equal(getVoteClientAddress(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })), '203.0.113.7');
    assert.equal(getVoteClientAddress(new Headers({ 'cf-connecting-ip': '198.51.100.1' })), '');
    assert.equal(subject({ 'cf-connecting-ip': '198.51.100.1' }), subject({ 'cf-connecting-ip': '198.51.100.2' }),
        'cf-connecting-ip alone never picks the bucket');
});

test('IPv6 clients share one bucket per /64, and IPv4-mapped addresses count as IPv4', () => {
    assert.equal(voteClientKey('2001:db8:1:2::1'), '2001:db8:1:2::/64');
    assert.equal(voteClientKey('2001:0DB8:0001:0002:ffff:ffff:ffff:ffff'), '2001:db8:1:2::/64');
    assert.equal(voteClientKey('[2001:db8:1:3::1]'), '2001:db8:1:3::/64');
    assert.equal(voteClientKey('fe80::1%en0'), 'fe80:0:0:0::/64');
    assert.equal(subject(vercel('2001:db8:1:2::1')), subject(vercel('2001:db8:1:2:abcd::9')),
        'rotating addresses inside a /64 keeps the bucket');
    assert.notEqual(subject(vercel('2001:db8:1:2::1')), subject(vercel('2001:db8:1:3::1')));
    assert.equal(voteClientKey('::ffff:203.0.113.7'), '203.0.113.7');
    assert.equal(subject(vercel('::ffff:203.0.113.7')), subject(vercel('203.0.113.7')));
    for (const junk of ['', 'unknown', 'not an address', '1:2:3:4:5:6:7:8:9', '2001:db8::1::2', 'g::1', undefined]) {
        assert.equal(voteClientKey(junk), 'unknown', String(junk));
    }
});

test('the subject is a salted hash, never the address itself', () => {
    const hashed = subject(vercel('203.0.113.7'));
    assert.match(hashed, /^[0-9a-f]{64}$/);
    assert.ok(!hashed.includes('203.0.113.7'));
    assert.notEqual(getVoteRateLimitSubject(new Headers(vercel('203.0.113.7')), 'other-salt'), hashed);
});

test('the vote service keys its rate limit on the shared helper and its salt only', async () => {
    const service = await fs.readFile(path.resolve(process.cwd(), 'src/lib/server/eloService.js'), 'utf8');
    assert.match(service, /env\.ELO_VOTE_RATE_LIMIT_SALT \|\| serviceRoleKey/);
    assert.match(service, /getVoteRateLimitSubject\(headers, salt\)/);
    for (const file of ['src/lib/server/eloService.js', 'src/lib/server/eloSecurity.js']) {
        const contents = await fs.readFile(path.resolve(process.cwd(), file), 'utf8');
        assert.doesNotMatch(contents, /headers\.get\('cf-connecting-ip'\)/, file);
        assert.doesNotMatch(contents, /headers\.get\('user-agent'\)/, file);
    }
});
