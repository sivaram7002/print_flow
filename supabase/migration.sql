-- ==============================================================================
-- PRINT SHOP MANAGEMENT - SUPABASE MIGRATION
-- Tables, Triggers, Row Level Security (RLS), and Storage Policies
-- ==============================================================================

-- 1. Enable UUID Extension (standard in Supabase)
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. Profiles Table & Auto-Creation Trigger
-- ==============================================================================

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Function to check if the current requesting user is an admin
-- SECURITY DEFINER and fixed search_path prevents RLS recursion
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- Profiles Policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Users can update their own profile details (excluding role)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and (
      -- Customer cannot change role to admin
      role = (select role from public.profiles where id = auth.uid())
      or public.is_admin()
    )
  );

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 3. Orders Table & Constraints
-- ==============================================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  name text not null,
  pages int not null check (pages > 0),
  amount numeric(10,2) not null,
  pdf_path text not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'verified', 'rejected')),
  payment_method text not null default 'gpay',
  payment_ref text,
  order_status text not null default 'pending' check (order_status in ('pending', 'printing', 'completed')),
  created_at timestamptz not null default now(),
  -- Enforce amount = pages * 3 using check constraint
  constraint check_amount_matches_pages check (amount = (pages * 3.00))
);

-- Trigger to automatically ensure amount = pages * 3 on insert/update as double safety
create or replace function public.calculate_order_amount()
returns trigger
language plpgsql
as $$
begin
  new.amount := new.pages * 3.00;
  return new;
end;
$$;

drop trigger if exists trg_calculate_order_amount on public.orders;
create trigger trg_calculate_order_amount
  before insert or update on public.orders
  for each row execute function public.calculate_order_amount();

-- Enable RLS on orders
alter table public.orders enable row level security;

-- Orders Policies
-- 1. Customers can SELECT only their own orders
create policy "Customers can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- 2. Customers can INSERT only their own orders
-- (Cannot insert with payment_status = 'verified' or 'rejected')
create policy "Customers can create their own orders"
  on public.orders for insert
  with check (
    auth.uid() = user_id
    and payment_status in ('pending', 'paid')
    and order_status = 'pending'
  );

-- 3. Admins can SELECT all orders
create policy "Admins can view all orders"
  on public.orders for select
  using (public.is_admin());

-- 4. Admins can UPDATE any order (update status, verify/reject payment)
create policy "Admins can update all orders"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Admins can DELETE orders if necessary (maintenance)
create policy "Admins can delete orders"
  on public.orders for delete
  using (public.is_admin());

-- Create indexes for performance
create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_orders_order_status on public.orders (order_status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

-- ==============================================================================
-- 4. Storage Bucket & Policies (Private bucket: 'pdfs')
-- ==============================================================================

-- Create private bucket 'pdfs' with 20 MB size limit and PDF mime type
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 20971520, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf'];

-- Storage RLS Policies on storage.objects

-- 1. Customers can upload only into their own user_id directory: {user_id}/{filename}
create policy "Customers can upload PDFs to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2. Customers can read/download PDFs from their own folder
create policy "Customers can read PDFs in own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pdfs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Admins can read/download all PDFs in 'pdfs' bucket
create policy "Admins can read all PDFs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pdfs'
    and public.is_admin()
  );

-- 4. Admins can delete PDFs if needed
create policy "Admins can delete any PDF"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pdfs'
    and public.is_admin()
  );
