import { getActivePlayers } from '$lib/supabase.js';

export async function load({ setHeaders }) {
    setHeaders({
        'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    });

    const players = await getActivePlayers();

    return {
        players: players.map((player, index) => ({
            ...player,
            _rank: index + 1
        }))
    };
}
