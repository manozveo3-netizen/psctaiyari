-- Apply in Supabase SQL Editor before deploying the deletion Edge Functions.
create table if not exists public.account_deletion_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','in_review','rejected','completed')),
 requested_at timestamptz not null default now(),
 review_note text
);
create unique index if not exists one_active_deletion_per_user on public.account_deletion_requests(user_id) where status in ('pending','in_review');
create index if not exists account_deletion_requests_requested_at on public.account_deletion_requests(requested_at desc);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon, authenticated;
-- Access is only through service-role Edge Functions with server-side role checks.
