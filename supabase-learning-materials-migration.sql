-- Run in the PSC Taiyari Supabase SQL editor before deploying this frontend.
alter table public.courses add column if not exists course_code text;
alter table public.courses add column if not exists course_type text not null default 'apravidik';
alter table public.courses drop constraint if exists courses_course_type_check;
alter table public.courses add constraint courses_course_type_check check (course_type in ('pravidik','apravidik'));
create unique index if not exists courses_course_code_unique on public.courses (course_code) where course_code is not null;
create table if not exists public.course_material_parts (
 id uuid primary key default gen_random_uuid(),course_id uuid not null references public.courses(id) on delete cascade,title_ne text not null,code text,
 part_type text not null default 'other' check (part_type in ('general_knowledge','aptitude','other')),sort_order integer not null default 0 check (sort_order>=0),created_at timestamptz not null default now(),unique(course_id,title_ne)
);
alter table public.course_units add column if not exists material_part_id uuid references public.course_material_parts(id) on delete cascade;
create index if not exists course_units_material_part_id_idx on public.course_units(material_part_id,sort_order);
grant select,insert,update,delete on public.course_material_parts to authenticated;
alter table public.course_material_parts enable row level security;
drop policy if exists "students read published course parts" on public.course_material_parts;
create policy "students read published course parts" on public.course_material_parts for select to authenticated using (exists(select 1 from public.courses c where c.id=course_id and c.status='published') or (select private.is_staff()));
drop policy if exists "staff manage course material parts" on public.course_material_parts;
create policy "staff manage course material parts" on public.course_material_parts for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
drop policy if exists "staff upload lms content" on storage.objects;
create policy "staff upload lms content" on storage.objects for insert to authenticated with check(bucket_id='lms-content' and (select private.is_staff()));
drop policy if exists "staff delete lms content" on storage.objects;
create policy "staff delete lms content" on storage.objects for delete to authenticated using(bucket_id='lms-content' and (select private.is_staff()));
