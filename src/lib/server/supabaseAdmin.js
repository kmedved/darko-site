import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

let supabaseAdmin;

function resolveAdminConfig() {
    if (!PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    return {
        url: PUBLIC_SUPABASE_URL,
        key: env.SUPABASE_SERVICE_ROLE_KEY
    };
}

export function getSupabaseAdmin() {
    if (supabaseAdmin) {
        return supabaseAdmin;
    }

    const { url, key } = resolveAdminConfig();
    supabaseAdmin = createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    return supabaseAdmin;
}
