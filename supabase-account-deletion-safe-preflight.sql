-- Secure account deletion dependency checks.
-- This migration is already applied to the PSC Mock Test Supabase project.
-- Reapply only when provisioning a new environment.
create table if not exists public.account_deletion_audit (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 user_id uuid not null,
 performed_by uuid,
 outcome text not null check (outcome in ('started','completed','failed')),
 detail text,
 created_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table public.account_deletion_audit enable row level security;
revoke all on public.account_deletion_audit from anon, authenticated;

create or replace function public.account_deletion_dependency_counts(target_user uuid)
returns jsonb language sql security definer set search_path = ''
as $$
select jsonb_build_object(
 'payments',(select count(*) from public.payments where user_id=target_user),
 'jobs',(select count(*) from public.question_generation_jobs where created_by=target_user or reviewed_by=target_user),
 'storage',(select count(*) from storage.objects where owner=target_user or owner_id=target_user::text)
)
$$;
revoke all on function public.account_deletion_dependency_counts(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_dependency_counts(uuid) to service_role;
