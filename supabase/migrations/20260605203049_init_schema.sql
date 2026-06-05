-- Table for clients
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null,
  email text,
  notes text,
  created_at timestamp with time zone default now() not null
);

-- Table for sales
create table if not exists public.sales (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  description text not null,
  amount numeric(10, 2) not null,
  status text not null check (status in ('paid', 'pending')),
  sale_date timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null
);

-- Table for payments
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  sale_id uuid not null references public.sales(id) on delete cascade,
  amount numeric(10, 2) not null,
  payment_date timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.clients enable row level security;
alter table public.sales enable row level security;
alter table public.payments enable row level security;

-- Create simple permissive policies
create policy "Allow all on clients" on public.clients for all using (true) with check (true);
create policy "Allow all on sales" on public.sales for all using (true) with check (true);
create policy "Allow all on payments" on public.payments for all using (true) with check (true);
