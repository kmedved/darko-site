-- Allow the smoothed Daily as the public WOWY display method.
-- nba_darko publication p10 publishes a Daily built with two-sided engine paths
-- (WHR, KickScore and both TS2 banks fit once on all games), so each date's
-- value uses games on both sides of it. It is recorded as smoothed_daily.
-- causal_daily and final_cut stay valid for earlier publications. Apply this
-- before the p10 publication; the publisher refuses smoothed_daily without it.

begin;

alter table public.wowy_publication
    drop constraint if exists wowy_publication_display_method_check;
alter table public.wowy_publication
    add constraint wowy_publication_display_method_check
    check (display_method in ('causal_daily', 'final_cut', 'smoothed_daily'));

commit;
