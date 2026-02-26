import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSupabaseConfig } from '../src/lib/utils/supabaseConfig.js';


test('resolveSupabaseConfig returns url and key when provided', () => {
    const config = resolveSupabaseConfig({
        url: 'https://example.supabase.co',
        key: 'anon-public-key'
    });

    assert.equal(config.supabaseUrl, 'https://example.supabase.co');
    assert.equal(config.supabaseAnonKey, 'anon-public-key');
});

test('resolveSupabaseConfig throws explicit error when required values are missing', () => {
    assert.throws(() => resolveSupabaseConfig({}), /Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY/);
    assert.throws(() => resolveSupabaseConfig({ url: 'https://example.supabase.co' }), /Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY/);
    assert.throws(() => resolveSupabaseConfig({ key: 'anon-public-key' }), /Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY/);
});
