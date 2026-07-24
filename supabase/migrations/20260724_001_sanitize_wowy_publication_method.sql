-- Public metadata describes the product without exposing internal component names.
update public.wowy_publication
set historian_method_version = 'retrospective_v1'
where id = 1;
