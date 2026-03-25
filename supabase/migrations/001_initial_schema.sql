-- tasks
create table if not exists tasks (
  id text primary key,
  title text not null,
  status text not null default 'todo',
  priority text not null default 'medium',
  owner text,
  due date,
  project text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- projects
create table if not exists projects (
  id text primary key,
  name text not null,
  description text,
  status text not null default 'active',
  owner text,
  priority text not null default 'medium',
  blockers jsonb default '[]',
  next_actions jsonb default '[]',
  percent_complete int default 0,
  updated_at timestamptz default now()
);

-- memories
create table if not exists memories (
  id text primary key,
  title text not null,
  summary text,
  category text,
  tags jsonb default '[]',
  related_project text,
  source text,
  updated_at timestamptz default now()
);

-- team_members
create table if not exists team_members (
  id text primary key,
  name text not null,
  role text,
  type text default 'human',
  avatar text,
  responsibilities jsonb default '[]',
  status text default 'active',
  current_activity text,
  workload text default 'normal',
  model text,
  tools jsonb default '[]'
);

-- calendar_events
create table if not exists calendar_events (
  id text primary key,
  title text not null,
  date date not null,
  time text,
  duration int,
  category text,
  status text default 'scheduled',
  description text,
  location text,
  assignee text
);

-- documents
create table if not exists documents (
  id text primary key,
  title text not null,
  type text,
  category text,
  tags jsonb default '[]',
  related_project text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  owner text,
  preview text
);

-- activity_logs
create table if not exists activity_logs (
  id text primary key default gen_random_uuid()::text,
  timestamp timestamptz default now(),
  action text not null,
  category text,
  actor text,
  details text,
  related_id text
);

-- agent_outputs (strategy, competitive, ads, social, email_drip)
create table if not exists agent_outputs (
  id text primary key default gen_random_uuid()::text,
  agent_name text not null,
  output_type text not null,
  content text,
  data jsonb,
  generated_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(agent_name, output_type)
);

-- Enable RLS on all tables
alter table tasks enable row level security;
alter table projects enable row level security;
alter table memories enable row level security;
alter table team_members enable row level security;
alter table calendar_events enable row level security;
alter table documents enable row level security;
alter table activity_logs enable row level security;
alter table agent_outputs enable row level security;

-- Allow public read on all tables
create policy "public read tasks" on tasks for select using (true);
create policy "public read projects" on projects for select using (true);
create policy "public read memories" on memories for select using (true);
create policy "public read team_members" on team_members for select using (true);
create policy "public read calendar_events" on calendar_events for select using (true);
create policy "public read documents" on documents for select using (true);
create policy "public read activity_logs" on activity_logs for select using (true);
create policy "public read agent_outputs" on agent_outputs for select using (true);
