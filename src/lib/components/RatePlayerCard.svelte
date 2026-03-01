<script>
    let { player, onclick, disabled = false, chosen = false, result = null } = $props();

    let imgFailed = $state(false);

    function formatHeight(inches) {
        if (!inches) return null;
        const ft = Math.floor(inches / 12);
        const rem = Math.round(inches % 12);
        return `${ft}'${rem}"`;
    }

    function formatDraftInfo(draftYear, draftSlot) {
        if (!draftYear) return 'Undrafted';
        if (!draftSlot) return `${Math.round(draftYear)} Draft`;
        return `${Math.round(draftYear)} Pick #${Math.round(draftSlot)}`;
    }

    function formatCareerSpan(rookieSeason, latestSeason) {
        if (!rookieSeason) return null;
        const startYear = Math.round(rookieSeason) - 1;
        const endYear = latestSeason ? Math.round(latestSeason) : startYear;
        if (startYear === endYear) return `${startYear}`;
        return `${startYear}\u2013${endYear}`;
    }

    function getInitials(name) {
        if (!name) return '?';
        return name
            .split(/\s+/)
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    const isActive = $derived(player?.active_roster === 1);
    const teamDisplay = $derived(isActive ? (player?.current_team || '?') : 'Retired');
    const headshotUrl = $derived(
        player?.nba_id
            ? `https://cdn.nba.com/headshots/nba/latest/260x190/${player.nba_id}.png`
            : null
    );

    const eloDelta = $derived.by(() => {
        if (!result) return null;
        if (result.winnerId === player?.nba_id) return result.delta;
        if (result.loserId === player?.nba_id) return -result.delta;
        return null;
    });
</script>

<button
    type="button"
    class="rate-card"
    class:chosen
    class:disabled
    {onclick}
    disabled={disabled}
>
    <div class="rate-card-headshot">
        {#if headshotUrl && !imgFailed}
            <img
                src={headshotUrl}
                alt=""
                class="headshot-img"
                onerror={() => { imgFailed = true; }}
            />
        {:else}
            <div class="headshot-placeholder">
                {getInitials(player?.player_name)}
            </div>
        {/if}
    </div>

    <div class="rate-card-name">{player?.player_name || 'Unknown'}</div>
    <div class="rate-card-meta">
        {player?.position || '?'} &middot; {teamDisplay}
    </div>

    <div class="rate-card-details">
        <div class="rate-card-detail">
            <span class="detail-label">Draft</span>
            <span class="detail-value">{formatDraftInfo(player?.draft_year, player?.draft_slot)}</span>
        </div>
        {#if player?.height}
            <div class="rate-card-detail">
                <span class="detail-label">Height</span>
                <span class="detail-value">{formatHeight(player.height)}</span>
            </div>
        {/if}
        {#if player?.weight}
            <div class="rate-card-detail">
                <span class="detail-label">Weight</span>
                <span class="detail-value">{Math.round(player.weight)} lbs</span>
            </div>
        {/if}
        {#if player?.country}
            <div class="rate-card-detail">
                <span class="detail-label">Country</span>
                <span class="detail-value">{player.country}</span>
            </div>
        {/if}
        {#if player?.rookie_season}
            <div class="rate-card-detail">
                <span class="detail-label">Career</span>
                <span class="detail-value">{formatCareerSpan(player.rookie_season, player.season)}</span>
            </div>
        {/if}
    </div>

    {#if eloDelta !== null}
        <div class="rate-card-elo-result" class:elo-positive={eloDelta > 0} class:elo-negative={eloDelta < 0}>
            {eloDelta > 0 ? '+' : ''}{Math.round(eloDelta)} Elo
        </div>
    {/if}
</button>

<style>
    .rate-card {
        appearance: none;
        border: 2px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-surface);
        color: var(--text);
        font-family: var(--font-sans);
        padding: 28px 24px;
        cursor: pointer;
        transition: border-color 0.15s, background-color 0.15s, transform 0.1s;
        text-align: center;
        width: 100%;
        min-height: 320px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
    }

    .rate-card:hover:not(:disabled) {
        border-color: var(--accent);
        background: var(--bg-elevated);
        transform: translateY(-2px);
    }

    .rate-card:active:not(:disabled) {
        transform: translateY(0);
    }

    .rate-card.chosen {
        border-color: var(--positive);
    }

    .rate-card.disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }

    .rate-card-headshot {
        width: 100px;
        height: 76px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

    .headshot-img {
        width: 100px;
        height: 76px;
        object-fit: cover;
        border-radius: var(--radius-sm);
    }

    .headshot-placeholder {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: var(--bg-hover);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 700;
        color: var(--text-muted);
        letter-spacing: 0.04em;
    }

    .rate-card-name {
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.2;
    }

    .rate-card-meta {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 10px;
    }

    .rate-card-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 5px 16px;
        text-align: left;
        width: 100%;
        max-width: 280px;
    }

    .rate-card-detail {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
    }

    .detail-label {
        color: var(--text-muted);
    }

    .detail-value {
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
        color: var(--text);
    }

    .rate-card-elo-result {
        margin-top: 10px;
        font-family: var(--font-mono);
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.01em;
    }

    .elo-positive {
        color: var(--positive);
    }

    .elo-negative {
        color: var(--negative);
    }

    @media (max-width: 768px) {
        .rate-card {
            min-height: 260px;
            padding: 20px 16px;
        }

        .rate-card-name {
            font-size: 18px;
        }

        .rate-card-headshot {
            width: 80px;
            height: 60px;
        }

        .headshot-img {
            width: 80px;
            height: 60px;
        }

        .headshot-placeholder {
            width: 56px;
            height: 56px;
            font-size: 20px;
        }
    }
</style>
