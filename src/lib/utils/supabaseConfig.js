export function resolveSupabaseConfig({ url, key } = {}) {
    const supabaseUrl = url ?? '';
    const supabaseAnonKey = key ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY');
    }

    return { supabaseUrl, supabaseAnonKey };
}

