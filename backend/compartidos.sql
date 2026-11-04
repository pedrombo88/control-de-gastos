-- Budviva Compartidos 1.0. Aplicar únicamente en un proyecto Supabase EXCLUSIVO de Budviva.
create schema if not exists private;
create table if not exists public.bv_households (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(title) between 1 and 60),
 owner_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.bv_members (
 household_id uuid not null references public.bv_households(id) on delete cascade,
 user_id uuid not null references auth.users(id),
 display_name text not null check(length(display_name) between 1 and 40),
 joined_at timestamptz not null default now(),
 primary key (household_id,user_id),
 unique(user_id)
);
create table if not exists public.bv_invitations (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.bv_households(id) on delete cascade,
 token_hash text not null unique,
 expires_at timestamptz not null,
 consumed_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.bv_expenses (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.bv_households(id) on delete cascade,
 author_id uuid not null references auth.users(id),
 payer_id uuid not null references auth.users(id),
 title text not null check(length(title) between 1 and 100),
 category text not null default 'otros' check(length(category) between 1 and 32),
 amount_cents integer not null check(amount_cents between 1 and 100000000),
 share_basis_points_a integer not null default 5000 check(share_basis_points_a between 0 and 10000),
 spent_on date not null,
 client_event_id uuid not null,
 created_at timestamptz not null default now(),
 unique(author_id,client_event_id)
);
create table if not exists public.bv_settlements (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.bv_households(id) on delete cascade,
 payer_id uuid not null references auth.users(id),
 receiver_id uuid not null references auth.users(id),
 amount_cents integer not null check(amount_cents between 1 and 100000000),
 status text not null default 'pending' check(status in ('pending','confirmed','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 check(payer_id <> receiver_id)
);

create or replace function private.bv_is_member(p_household uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.bv_members m where m.household_id=p_household and m.user_id=(select auth.uid())); $$;
revoke all on function private.bv_is_member(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.bv_is_member(uuid) to authenticated;

alter table public.bv_households enable row level security;
alter table public.bv_members enable row level security;
alter table public.bv_invitations enable row level security;
alter table public.bv_expenses enable row level security;
alter table public.bv_settlements enable row level security;

revoke all on public.bv_households,public.bv_members,public.bv_invitations,public.bv_expenses,public.bv_settlements from anon,authenticated;
grant select on public.bv_households,public.bv_members,public.bv_expenses,public.bv_settlements to authenticated;
grant insert on public.bv_expenses,public.bv_settlements to authenticated;
grant update(status,reviewed_at) on public.bv_settlements to authenticated;
grant update(display_name) on public.bv_members to authenticated;
grant delete on public.bv_expenses to authenticated;

create policy "bv household members read" on public.bv_households for select to authenticated using (private.bv_is_member(id));
create policy "bv member list" on public.bv_members for select to authenticated using (private.bv_is_member(household_id));
create policy "bv member update own name" on public.bv_members for update to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy "bv expenses read" on public.bv_expenses for select to authenticated using(private.bv_is_member(household_id));
create policy "bv expenses insert" on public.bv_expenses for insert to authenticated
 with check(author_id=(select auth.uid()) and private.bv_is_member(household_id)
   and exists(select 1 from public.bv_members m where m.household_id=bv_expenses.household_id and m.user_id=bv_expenses.payer_id));
create policy "bv expenses delete own" on public.bv_expenses for delete to authenticated
 using(author_id=(select auth.uid()) and private.bv_is_member(household_id));
create policy "bv settlements read" on public.bv_settlements for select to authenticated using(private.bv_is_member(household_id));
create policy "bv settlements propose" on public.bv_settlements for insert to authenticated
 with check(status='pending' and payer_id=(select auth.uid()) and private.bv_is_member(household_id)
 and exists(select 1 from public.bv_members m where m.household_id=bv_settlements.household_id and m.user_id=bv_settlements.receiver_id));
-- No UPDATE policy: review only through a constrained RPC. Avoid modifying balances with an arbitrary UPDATE.

create or replace function public.bv_create_household(p_title text,p_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Login requerido'; end if;
 if length(trim(p_title)) not between 1 and 60 or length(trim(p_name)) not between 1 and 40 then raise exception 'Nombre no válido'; end if;
 if exists(select 1 from public.bv_members where user_id=auth.uid()) then raise exception 'Ya perteneces a un hogar'; end if;
 insert into public.bv_households(title,owner_id) values(trim(p_title),auth.uid()) returning id into v_id;
 insert into public.bv_members(household_id,user_id,display_name) values(v_id,auth.uid(),trim(p_name));
 return v_id;
end; $$;

create or replace function public.bv_create_invite(p_household uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_token text; v_owner uuid;
begin
 select owner_id into v_owner from public.bv_households where id=p_household for update;
 if v_owner is distinct from auth.uid() then raise exception 'Solo el administrador puede invitar'; end if;
 if (select count(*) from public.bv_members where household_id=p_household)>=2 then raise exception 'Hogar completo'; end if;
 update public.bv_invitations set consumed_at=now() where household_id=p_household and consumed_at is null;
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.bv_invitations(household_id,token_hash,expires_at)
 values(p_household,encode(sha256(convert_to(v_token,'UTF8')),'hex'),now()+interval '48 hours');
 return v_token;
end; $$;

create or replace function public.bv_join_household(p_token text,p_name text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_inv public.bv_invitations%rowtype; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Login requerido'; end if;
 if length(trim(p_name)) not between 1 and 40 then raise exception 'Nombre no válido'; end if;
 if length(p_token)<>64 or p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invitación inválida'; end if;
 if exists(select 1 from public.bv_members where user_id=auth.uid()) then raise exception 'Ya perteneces a un hogar'; end if;
 select * into v_inv from public.bv_invitations
 where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or v_inv.consumed_at is not null or v_inv.expires_at<=now() then raise exception 'Código caducado o incorrecto'; end if;
 perform 1 from public.bv_households where id=v_inv.household_id for update;
 if (select count(*) from public.bv_members where household_id=v_inv.household_id)>=2 then raise exception 'Hogar completo'; end if;
 insert into public.bv_members(household_id,user_id,display_name) values(v_inv.household_id,auth.uid(),trim(p_name));
 update public.bv_invitations set consumed_at=now() where id=v_inv.id;
 return v_inv.household_id;
end; $$;

create or replace function public.bv_review_settlement(p_id uuid,p_accept boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_record public.bv_settlements%rowtype;
begin
 select * into v_record from public.bv_settlements where id=p_id for update;
 if not found or v_record.status<>'pending' then raise exception 'Compensación no disponible'; end if;
 if v_record.receiver_id is distinct from auth.uid() then raise exception 'Solo el destinatario puede confirmar'; end if;
 if not exists(select 1 from public.bv_members where household_id=v_record.household_id and user_id=auth.uid()) then raise exception 'No autorizado'; end if;
 update public.bv_settlements set status=case when p_accept then 'confirmed' else 'rejected' end,reviewed_at=now() where id=p_id;
end; $$;

revoke all on function public.bv_create_household(text,text),public.bv_create_invite(uuid),public.bv_join_household(text,text),public.bv_review_settlement(uuid,boolean) from public,anon;
grant execute on function public.bv_create_household(text,text),public.bv_create_invite(uuid),public.bv_join_household(text,text),public.bv_review_settlement(uuid,boolean) to authenticated;
create index if not exists bv_expenses_household_date on public.bv_expenses(household_id,spent_on desc);
create index if not exists bv_settlements_household_date on public.bv_settlements(household_id,created_at desc);
