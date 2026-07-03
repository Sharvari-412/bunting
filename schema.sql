-- Run this in Supabase → SQL Editor
-- Creates the birthdays table and locks it down with Row Level Security

create table birthdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  date date not null,
  notes text default '',
  created_at timestamptz default now()
);

-- Row Level Security: on by default = deny everything until a policy allows it
alter table birthdays enable row level security;

create policy "Users can view their own birthdays"
  on birthdays for select
  using (auth.uid() = user_id);

create policy "Users can insert their own birthdays"
  on birthdays for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own birthdays"
  on birthdays for update
  using (auth.uid() = user_id);

create policy "Users can delete their own birthdays"
  on birthdays for delete
  using (auth.uid() = user_id);
