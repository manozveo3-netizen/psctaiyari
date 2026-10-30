-- Loksewa Taiyari: Admin course content hierarchy
-- Run this once in the Supabase SQL editor, after the existing migrations.

alter table public.courses add column if not exists title_en text;
alter table public.courses add column if not exists paper text not null default 'first';
alter table public.courses add column if not exists paper_other text;
alter table public.courses add column if not exists status text not null default 'draft';
alter table public.courses drop constraint if exists courses_paper_check;
alter table public.courses add constraint courses_paper_check check (paper in ('first','second','third','other'));
alter table public.courses drop constraint if exists courses_status_check;
alter table public.courses add constraint courses_status_check check (status in ('draft','published'));
create unique index if not exists courses_slug_unique_ci on public.courses (lower(slug));

create table if not exists public.learning_units (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id) on delete cascade,
 code text, title_ne text not null, title_en text not null, description text,
 sort_order integer not null default 0 check (sort_order >= 0),
 status text not null default 'draft' check (status in ('draft','published')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(course_id, code)
);
create table if not exists public.learning_sub_units (
 id uuid primary key default gen_random_uuid(),
 unit_id uuid not null references public.learning_units(id) on delete cascade,
 code text, title_ne text not null, title_en text not null, description text,
 sort_order integer not null default 0 check (sort_order >= 0),
 status text not null default 'draft' check (status in ('draft','published')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(unit_id, code)
);
create table if not exists public.learning_sub_sub_units (
 id uuid primary key default gen_random_uuid(),
 sub_unit_id uuid not null references public.learning_sub_units(id) on delete cascade,
 code text, title_ne text not null, title_en text not null, description text,
 sort_order integer not null default 0 check (sort_order >= 0),
 status text not null default 'draft' check (status in ('draft','published')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(sub_unit_id, code)
);
create table if not exists public.learning_materials (
 id uuid primary key default gen_random_uuid(),
 sub_sub_unit_id uuid not null references public.learning_sub_sub_units(id) on delete cascade,
 title_ne text not null, title_en text not null,
 material_type text not null check (material_type in ('pdf','docx','image','rich_text')),
 content_html text, description text, storage_bucket text, storage_path text,
 sort_order integer not null default 0 check (sort_order >= 0),
 status text not null default 'draft' check (status in ('draft','published')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((material_type='rich_text' and content_html is not null and storage_path is null) or (material_type <> 'rich_text' and storage_bucket is not null and storage_path is not null))
);
create index if not exists learning_units_course_order on public.learning_units(course_id,sort_order);
create index if not exists learning_sub_units_unit_order on public.learning_sub_units(unit_id,sort_order);
create index if not exists learning_sub_sub_units_sub_unit_order on public.learning_sub_sub_units(sub_unit_id,sort_order);
create index if not exists learning_materials_sub_sub_unit_order on public.learning_materials(sub_sub_unit_id,sort_order);

-- Private bucket: students receive short-lived signed URLs only after the RLS checks below.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('course-materials','course-materials',false,26214400,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=26214400;

grant select,insert,update,delete on public.learning_units,public.learning_sub_units,public.learning_sub_sub_units,public.learning_materials to authenticated;
alter table public.learning_units enable row level security;
alter table public.learning_sub_units enable row level security;
alter table public.learning_sub_sub_units enable row level security;
alter table public.learning_materials enable row level security;

-- Staff can read/manage every row. Students only see a fully published chain.
create policy "staff manage learning units" on public.learning_units for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "students read published learning units" on public.learning_units for select to authenticated using (status='published' and exists (select 1 from public.courses c where c.id=course_id and c.status='published'));
create policy "staff manage learning sub units" on public.learning_sub_units for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "students read published learning sub units" on public.learning_sub_units for select to authenticated using (status='published' and exists (select 1 from public.learning_units u join public.courses c on c.id=u.course_id where u.id=unit_id and u.status='published' and c.status='published'));
create policy "staff manage learning sub sub units" on public.learning_sub_sub_units for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "students read published learning sub sub units" on public.learning_sub_sub_units for select to authenticated using (status='published' and exists (select 1 from public.learning_sub_units su join public.learning_units u on u.id=su.unit_id join public.courses c on c.id=u.course_id where su.id=sub_unit_id and su.status='published' and u.status='published' and c.status='published'));
create policy "staff manage learning materials" on public.learning_materials for all to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "students read published learning materials" on public.learning_materials for select to authenticated using (status='published' and exists (select 1 from public.learning_sub_sub_units ssu join public.learning_sub_units su on su.id=ssu.sub_unit_id join public.learning_units u on u.id=su.unit_id join public.courses c on c.id=u.course_id where ssu.id=sub_sub_unit_id and ssu.status='published' and su.status='published' and u.status='published' and c.status='published'));

drop policy if exists "staff manage course materials storage" on storage.objects;
create policy "staff manage course materials storage" on storage.objects for all to authenticated using (bucket_id='course-materials' and (select private.is_staff())) with check (bucket_id='course-materials' and (select private.is_staff()));
drop policy if exists "students read published course material files" on storage.objects;
create policy "students read published course material files" on storage.objects for select to authenticated using (bucket_id='course-materials' and exists (select 1 from public.learning_materials m join public.learning_sub_sub_units ssu on ssu.id=m.sub_sub_unit_id join public.learning_sub_units su on su.id=ssu.sub_unit_id join public.learning_units u on u.id=su.unit_id join public.courses c on c.id=u.course_id where m.storage_path=name and m.status='published' and ssu.status='published' and su.status='published' and u.status='published' and c.status='published'));
