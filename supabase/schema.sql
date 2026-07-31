-- Phase 2 production schema for Supabase/PostgreSQL
create extension if not exists pgcrypto;

create table if not exists public.store_locations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  hindi_name text,
  description text,
  photo_url text,
  responsible_role text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.store_locations(id) on delete cascade,
  sku text unique,
  name text not null,
  unit text not null default 'pcs',
  current_qty numeric not null default 0,
  minimum_qty numeric not null default 0,
  target_qty numeric not null default 0,
  responsible_role text not null,
  physical_location text,
  notes text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.stock_checks (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id),
  checked_qty numeric not null,
  status text not null check (status in ('ok','low','out')),
  checked_by uuid references auth.users(id),
  note text,
  checked_at timestamptz not null default now()
);

create table if not exists public.reorder_requests (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id),
  requested_qty numeric not null,
  status text not null default 'open' check (status in ('open','ordered','received','cancelled')),
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  ordered_at timestamptz,
  received_at timestamptz
);

create table if not exists public.purchase_documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('gst_invoice','temporary_invoice','self_created_record')),
  vendor_name text not null,
  purchase_date date not null,
  articles text not null,
  amount numeric(12,2) not null,
  payment_mode text not null,
  payment_reference text,
  file_url text,
  entered_by uuid references auth.users(id),
  entered_at timestamptz not null default now(),
  physically_filed boolean not null default false
);

create table if not exists public.token_entries (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_phone text,
  product_name text not null,
  cash_token_count integer not null default 0,
  point_token_count integer not null default 0,
  adjustment_amount numeric(10,2) not null default 0,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.store_locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_checks enable row level security;
alter table public.reorder_requests enable row level security;
alter table public.purchase_documents enable row level security;
alter table public.token_entries enable row level security;
