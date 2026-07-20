-- Retain the production-causal WOWY trajectory while making the certified
-- retrospective Final Cut trajectory the public default.

begin;

alter table public.wowy_ratings
    add column if not exists causal_wowy_rapm double precision,
    add column if not exists causal_wowy_orapm double precision,
    add column if not exists causal_wowy_drapm double precision;

update public.wowy_ratings
set
    causal_wowy_rapm = coalesce(causal_wowy_rapm, wowy_rapm),
    causal_wowy_orapm = coalesce(causal_wowy_orapm, wowy_orapm),
    causal_wowy_drapm = coalesce(causal_wowy_drapm, wowy_drapm)
where
    causal_wowy_rapm is null
    or causal_wowy_orapm is null
    or causal_wowy_drapm is null;

alter table public.wowy_ratings
    alter column causal_wowy_rapm set not null,
    alter column causal_wowy_orapm set not null,
    alter column causal_wowy_drapm set not null;

alter table public.wowy_publication
    add column if not exists display_method text not null default 'causal_daily',
    add column if not exists historian_sha256 text,
    add column if not exists historian_method_version text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'wowy_ratings_public_odt_check'
          and conrelid = 'public.wowy_ratings'::regclass
    ) then
        alter table public.wowy_ratings
            add constraint wowy_ratings_public_odt_check
            check (abs((wowy_orapm + wowy_drapm) - wowy_rapm) <= 0.0000000001);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'wowy_ratings_causal_odt_check'
          and conrelid = 'public.wowy_ratings'::regclass
    ) then
        alter table public.wowy_ratings
            add constraint wowy_ratings_causal_odt_check
            check (
                abs(
                    (causal_wowy_orapm + causal_wowy_drapm)
                    - causal_wowy_rapm
                ) <= 0.0000000001
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'wowy_publication_display_method_check'
          and conrelid = 'public.wowy_publication'::regclass
    ) then
        alter table public.wowy_publication
            add constraint wowy_publication_display_method_check
            check (display_method in ('causal_daily', 'final_cut'));
    end if;
end
$$;

commit;
