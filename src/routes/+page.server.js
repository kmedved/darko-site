import { getActivePlayers } from '$lib/supabase.js';

export async function load({ setHeaders }) {
    setHeaders({
        'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300'
    });

    const players = await getActivePlayers();

    return {
        players: players.map((player, index) => ({
            ...player,
            _rank: index + 1
        }))
    };
}
