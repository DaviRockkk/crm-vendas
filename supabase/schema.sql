-- ==================================================
-- CRM Vendas — Supabase Schema
-- ==================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==================== TABLES ====================

-- Products table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  default_price numeric(10,2) not null default 0,
  photo_url text,
  created_at timestamptz default now() not null
);

-- Clients table
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text,
  notes text,
  created_at timestamptz default now() not null
);

-- Sales table
create table public.sales (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  total_amount numeric(10,2) not null default 0,
  paid_amount numeric(10,2) not null default 0,
  due_amount numeric(10,2) not null default 0,
  due_date date,
  status text not null default 'pendente' check (status in ('pago', 'parcial', 'pendente')),
  created_at timestamptz default now() not null
);

-- Sale items table
create table public.sale_items (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid references public.sales(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null default 0,
  quantity integer not null default 1
);

-- ==================== INDEXES ====================

create index idx_products_user_id on public.products(user_id);
create index idx_clients_user_id on public.clients(user_id);
create index idx_sales_user_id on public.sales(user_id);
create index idx_sales_client_id on public.sales(client_id);
create index idx_sales_status on public.sales(status);
create index idx_sales_due_date on public.sales(due_date);
create index idx_sale_items_sale_id on public.sale_items(sale_id);

-- ==================== ROW LEVEL SECURITY ====================

alter table public.products enable row level security;
alter table public.clients enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

-- Products RLS
create policy "products_select" on public.products for select using (auth.uid() = user_id);
create policy "products_insert" on public.products for insert with check (auth.uid() = user_id);
create policy "products_update" on public.products for update using (auth.uid() = user_id);
create policy "products_delete" on public.products for delete using (auth.uid() = user_id);

-- Clients RLS
create policy "clients_select" on public.clients for select using (auth.uid() = user_id);
create policy "clients_insert" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients_update" on public.clients for update using (auth.uid() = user_id);
create policy "clients_delete" on public.clients for delete using (auth.uid() = user_id);

-- Sales RLS
create policy "sales_select" on public.sales for select using (auth.uid() = user_id);
create policy "sales_insert" on public.sales for insert with check (auth.uid() = user_id);
create policy "sales_update" on public.sales for update using (auth.uid() = user_id);
create policy "sales_delete" on public.sales for delete using (auth.uid() = user_id);

-- Sale Items RLS (inherits from sales)
create policy "sale_items_select" on public.sale_items for select using (
  exists (select 1 from public.sales where id = sale_id and user_id = auth.uid())
);
create policy "sale_items_insert" on public.sale_items for insert with check (
  exists (select 1 from public.sales where id = sale_id and user_id = auth.uid())
);
create policy "sale_items_update" on public.sale_items for update using (
  exists (select 1 from public.sales where id = sale_id and user_id = auth.uid())
);
create policy "sale_items_delete" on public.sale_items for delete using (
  exists (select 1 from public.sales where id = sale_id and user_id = auth.uid())
);

-- ==================== STORAGE ====================

-- Create storage bucket for product photos
insert into storage.buckets (id, name, public) values ('products', 'products', true)
on conflict (id) do nothing;

create policy "products_storage_upload" on storage.objects for insert with check (
  bucket_id = 'products' and auth.uid() is not null
);
-- Nota: Como o bucket 'products' é público (public = true), a leitura de imagens não necessita de RLS de SELECT no storage.objects.
create policy "products_storage_delete" on storage.objects for delete using (
  bucket_id = 'products' and auth.uid() is not null
);

-- ==================== VIEWS ====================

-- Client totals view (for dashboard top debtors)
create or replace view public.client_totals
with (security_invoker = true) as
select
  c.id,
  c.user_id,
  c.name,
  c.phone,
  coalesce(sum(case when s.status != 'pago' then s.due_amount else 0 end), 0) as total_due,
  coalesce(sum(s.paid_amount), 0) as total_paid,
  coalesce(sum(s.total_amount), 0) as total_amount,
  count(s.id) as sale_count
from public.clients c
left join public.sales s on s.client_id = c.id
group by c.id, c.user_id, c.name, c.phone;