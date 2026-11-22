create table
    public.simulaciones (
        id uuid primary key default gen_random_uuid (),
        user_id uuid not null references auth.users (id) on delete cascade,
        caso text not null,
        escenario text not null,
        entradas jsonb not null,
        resultados jsonb not null,
        version_modelo text not null default '1',
        creado_en timestamptz not null default now ()
    );

alter table public.simulaciones enable row level security;

grant
select
,
    insert,
    delete on public.simulaciones to authenticated;

create policy "usuarios leen sus simulaciones" on public.simulaciones for
select
    to authenticated using (
        (
            select
                auth.uid ()
        ) = user_id
    );

create policy "usuarios guardan sus simulaciones" on public.simulaciones for insert to authenticated
with
    check (
        (
            select
                auth.uid ()
        ) = user_id
    );

create policy "usuarios eliminan sus simulaciones" on public.simulaciones for delete to authenticated using (
    (
        select
            auth.uid ()
    ) = user_id
);