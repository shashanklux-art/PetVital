-- PetVital Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Users table (handled by Supabase Auth, but we extend it)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  preferred_language text default 'en',
  created_at timestamp with time zone default now()
);

-- Pets table
create table public.pets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  species text not null check (species in ('dog', 'cat')),
  breed text,
  age_years integer,
  age_months integer,
  weight_kg decimal,
  known_conditions text[],
  medications text[],
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Triage history table
create table public.triage_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  symptoms text[] not null,
  additional_notes text,
  urgency_level text not null check (urgency_level in ('emergency', 'urgent', 'soon', 'monitor')),
  ai_response text not null,
  possible_conditions text[],
  created_at timestamp with time zone default now()
);

-- Journal entries table
create table public.journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  entry_type text not null check (entry_type in ('note', 'symptom', 'medication', 'vet_visit', 'weight', 'food', 'behavior')),
  title text,
  content text,
  metadata jsonb,
  entry_date date default current_date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Vet clinics table (mock data)
create table public.vet_clinics (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  address text not null,
  city text not null,
  state text,
  zip_code text,
  country text default 'USA',
  phone text,
  email text,
  website text,
  is_emergency boolean default false,
  is_24_hour boolean default false,
  rating decimal check (rating >= 0 and rating <= 5),
  review_count integer default 0,
  services text[],
  latitude decimal,
  longitude decimal,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.triage_history enable row level security;
alter table public.journal_entries enable row level security;
alter table public.vet_clinics enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- RLS Policies for pets
create policy "Users can view own pets" on public.pets for select using (auth.uid() = user_id);
create policy "Users can insert own pets" on public.pets for insert with check (auth.uid() = user_id);
create policy "Users can update own pets" on public.pets for update using (auth.uid() = user_id);
create policy "Users can delete own pets" on public.pets for delete using (auth.uid() = user_id);

-- RLS Policies for triage_history
create policy "Users can view own triage history" on public.triage_history for select using (auth.uid() = user_id);
create policy "Users can insert own triage history" on public.triage_history for insert with check (auth.uid() = user_id);

-- RLS Policies for journal_entries
create policy "Users can view own journal entries" on public.journal_entries for select using (auth.uid() = user_id);
create policy "Users can insert own journal entries" on public.journal_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own journal entries" on public.journal_entries for update using (auth.uid() = user_id);
create policy "Users can delete own journal entries" on public.journal_entries for delete using (auth.uid() = user_id);

-- RLS Policies for vet_clinics (public read)
create policy "Anyone can view vet clinics" on public.vet_clinics for select using (true);

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Insert mock vet clinic data
insert into public.vet_clinics (name, address, city, state, zip_code, phone, is_emergency, is_24_hour, rating, review_count, services, latitude, longitude) values
('City Emergency Vet', '123 Main Street', 'New York', 'NY', '10001', '(212) 555-0100', true, true, 4.8, 342, ARRAY['emergency', 'surgery', 'imaging', 'icu'], 40.7128, -74.0060),
('Pawsome Pet Care', '456 Oak Avenue', 'New York', 'NY', '10002', '(212) 555-0101', false, false, 4.6, 215, ARRAY['general', 'vaccinations', 'dental', 'grooming'], 40.7150, -73.9990),
('Downtown Animal Hospital', '789 Park Blvd', 'New York', 'NY', '10003', '(212) 555-0102', true, false, 4.5, 178, ARRAY['emergency', 'surgery', 'general', 'exotic'], 40.7200, -73.9950),
('Happy Tails Clinic', '321 Elm Street', 'Brooklyn', 'NY', '11201', '(718) 555-0103', false, false, 4.7, 289, ARRAY['general', 'vaccinations', 'wellness', 'nutrition'], 40.6892, -73.9857),
('24 Hour Pet ER', '555 Emergency Lane', 'New York', 'NY', '10004', '(212) 555-0104', true, true, 4.4, 156, ARRAY['emergency', 'critical care', 'surgery', 'blood bank'], 40.7100, -74.0100),
('Friendly Paws Veterinary', '888 Sunset Drive', 'Queens', 'NY', '11375', '(718) 555-0105', false, false, 4.9, 402, ARRAY['general', 'dental', 'vaccinations', 'behavioral'], 40.7210, -73.8450),
('Metro Vet Specialists', '999 Medical Center Way', 'New York', 'NY', '10005', '(212) 555-0106', true, false, 4.3, 98, ARRAY['specialists', 'oncology', 'cardiology', 'neurology'], 40.7080, -74.0120),
('Brooklyn Pet Wellness', '222 Atlantic Ave', 'Brooklyn', 'NY', '11217', '(718) 555-0107', false, false, 4.6, 167, ARRAY['general', 'wellness', 'acupuncture', 'holistic'], 40.6850, -73.9780);
