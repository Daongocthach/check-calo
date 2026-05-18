create table if not exists public.app_feature_flags (
  flag_key text primary key not null,
  is_hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_feature_flags enable row level security;

drop policy if exists "app_feature_flags_select_public" on public.app_feature_flags;
create policy "app_feature_flags_select_public"
  on public.app_feature_flags
  for select
  to anon, authenticated
  using (true);

grant select on table public.app_feature_flags to anon, authenticated;

insert into public.app_feature_flags (flag_key, is_hidden)
values ('support_prompt_card', false)
on conflict (flag_key) do nothing;
