import test from 'node:test';
import assert from 'node:assert/strict';

import {
    hashRateLimitSubject,
    isAllowedVoteOrigin,
    pairIdsMatch,
    signPairToken,
    verifyPairToken
} from '../src/lib/server/eloSecurity.js';

test('pair token signs and verifies correctly', () => {
    const token = signPairToken({
        pairIds: [11, 7],
        issuedAt: 1000,
        expiresAt: 10_000,
        nonce: 'nonce-1',
        secret: 'top-secret'
    });

    const payload = verifyPairToken(token, {
        now: 2_000,
        secret: 'top-secret'
    });

    assert.deepEqual(payload, {
        pairIds: [7, 11],
        issuedAt: 1000,
        expiresAt: 10_000,
        nonce: 'nonce-1'
    });
});

test('pair token verification rejects tampered or expired tokens', () => {
    const token = signPairToken({
        pairIds: [1, 2],
        issuedAt: 1000,
        expiresAt: 5_000,
        secret: 'top-secret'
    });

    const tampered = `${token}x`;

    assert.equal(
        verifyPairToken(tampered, {
            now: 2_000,
            secret: 'top-secret'
        }),
        null
    );
    assert.equal(
        verifyPairToken(token, {
            now: 6_000,
            secret: 'top-secret'
        }),
        null
    );
});

test('pairIdsMatch rejects mismatched vote ids', () => {
    assert.equal(pairIdsMatch([9, 11], 11, 9), true);
    assert.equal(pairIdsMatch([9, 11], 11, 12), false);
});

test('origin validation rejects cross-site requests', () => {
    const url = new URL('https://darko.app/api/rate/vote');

    assert.equal(
        isAllowedVoteOrigin(
            url,
            new Headers({
                origin: 'https://darko.app'
            })
        ),
        true
    );

    assert.equal(
        isAllowedVoteOrigin(
            url,
            new Headers({
                origin: 'https://evil.example'
            })
        ),
        false
    );
});

test('rate-limit subject hashing is stable for the same IP and salt', () => {
    const first = hashRateLimitSubject('127.0.0.1', {
        salt: 'pepper'
    });
    const second = hashRateLimitSubject('127.0.0.1', {
        salt: 'pepper'
    });

    assert.equal(first, second);
    assert.notEqual(
        first,
        hashRateLimitSubject('127.0.0.2', {
            salt: 'pepper'
        })
    );
});
