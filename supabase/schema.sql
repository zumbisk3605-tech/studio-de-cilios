-- Execute este arquivo no SQL Editor do seu projeto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Cílios','Sobrancelhas')),
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  customer_name text not null,
  customer_phone text not null,
  service_name text not null,
  total_price numeric(10,2) not null check (total_price >= 0),
  deposit_amount numeric(10,2) not null check (deposit_amount >= 0),
  appointment_date date not null,
  time text not null,
  notes text,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','confirmed','completed','cancelled')),
  created_at timestamptz not null default now()
);

-- Um horário só pode ter uma reserva ativa; cancelamentos liberam o horário.
create unique index if not exists appointments_one_active_slot
on public.appointments (appointment_date, time)
where status in ('pending_payment','confirmed');

alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- Catálogo: público pode consultar apenas serviços ativos.
drop policy if exists "Public can read active services" on public.services;
create policy "Public can read active services" on public.services
for select to anon, authenticated using (active = true);

-- Agendamento: cliente pode criar reserva pendente.
drop policy if exists "Public can create pending appointments" on public.appointments;
create policy "Public can create pending appointments" on public.appointments
for insert to anon, authenticated
with check (
  status = 'pending_payment'
  and total_price >= 0
  and deposit_amount = round(total_price / 2, 2)
  and appointment_date >= current_date
);

-- Consulta pública limitada aos horários ocupados, sem expor dados pessoais:
-- Para produção, substitua a consulta direta por uma função RPC que retorne somente
-- os horários indisponíveis. Não habilite SELECT público nesta tabela.
-- O painel administrativo acessa os dados após autenticação.
drop policy if exists "Admin can read appointments" on public.appointments;
create policy "Admin can read appointments" on public.appointments
for select to authenticated using (auth.uid() is not null);

drop policy if exists "Admin can update appointments" on public.appointments;
create policy "Admin can update appointments" on public.appointments
for update to authenticated using (auth.uid() is not null)
with check (auth.uid() is not null);

insert into public.services (name,category,price) values
('Fio a Fio','Cílios',90),
('Volume Brasileiro','Cílios',110),
('Volume Egípcio','Cílios',120),
('Manutenção de Cílios','Cílios',60),
('Design de Sobrancelhas','Sobrancelhas',25),
('Design com Henna','Sobrancelhas',35),
('Brow Lamination','Sobrancelhas',80),
('Coloração de Sobrancelhas','Sobrancelhas',30)
on conflict do nothing;


-- Retorna somente os horários ocupados, sem revelar dados das clientes.
create or replace function public.get_busy_slots(target_date date)
returns table (slot_time text)
language sql
security definer
set search_path = public
as $$
  select a.time as slot_time
  from public.appointments a
  where a.appointment_date = target_date
    and a.status in ('pending_payment','confirmed');
$$;
revoke all on function public.get_busy_slots(date) from public;
grant execute on function public.get_busy_slots(date) to anon, authenticated;

-- Valida o preço enviado pelo navegador contra o catálogo ativo.
create or replace function public.validate_appointment_service()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare catalog_price numeric(10,2);
begin
  select price into catalog_price
  from public.services
  where name = new.service_name and active = true
  limit 1;
  if catalog_price is null then
    raise exception 'Serviço indisponível';
  end if;
  if new.total_price <> catalog_price then
    raise exception 'Preço inválido para o serviço';
  end if;
  if new.deposit_amount <> round(catalog_price / 2, 2) then
    raise exception 'Valor do sinal inválido';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_appointment_service on public.appointments;
create trigger validate_appointment_service
before insert on public.appointments
for each row execute function public.validate_appointment_service();
