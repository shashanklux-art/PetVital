-- Pet Parent Database Schema for Neon PostgreSQL
-- Run this against your Neon PostgreSQL database

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (replaces Supabase auth.users + profiles)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pets table
CREATE TABLE pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  breed TEXT,
  age_years INTEGER,
  age_months INTEGER,
  weight_kg DECIMAL,
  known_conditions TEXT[],
  medications TEXT[],
  diet TEXT,
  is_fixed TEXT DEFAULT 'unknown',
  last_vet_visit DATE,
  recent_vaccines TEXT,
  indoor_outdoor TEXT DEFAULT 'indoor',
  supplements TEXT,
  travel_history TEXT,
  recent_procedures TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triage history table
CREATE TABLE triage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  symptoms TEXT[] NOT NULL,
  additional_notes TEXT,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('emergency', 'urgent', 'soon', 'monitor')),
  ai_response TEXT NOT NULL,
  possible_conditions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal entries table
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('note', 'symptom', 'medication', 'vet_visit', 'weight', 'food', 'behavior')),
  title TEXT,
  content TEXT,
  metadata JSONB,
  entry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vet clinics table (public data)
CREATE TABLE vet_clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  phone TEXT,
  email TEXT,
  website TEXT,
  is_emergency BOOLEAN DEFAULT FALSE,
  is_24_hour BOOLEAN DEFAULT FALSE,
  rating DECIMAL CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  services TEXT[],
  latitude DECIMAL,
  longitude DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_pets_user_id ON pets(user_id);
CREATE INDEX idx_triage_history_user_id ON triage_history(user_id);
CREATE INDEX idx_triage_history_pet_id ON triage_history(pet_id);
CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_pet_id ON journal_entries(pet_id);
CREATE INDEX idx_users_email ON users(email);

-- Insert mock vet clinic data
INSERT INTO vet_clinics (name, address, city, state, zip_code, phone, is_emergency, is_24_hour, rating, review_count, services, latitude, longitude) VALUES
('City Emergency Vet', '123 Main Street', 'New York', 'NY', '10001', '(212) 555-0100', true, true, 4.8, 342, ARRAY['emergency', 'surgery', 'imaging', 'icu'], 40.7128, -74.0060),
('Pawsome Pet Care', '456 Oak Avenue', 'New York', 'NY', '10002', '(212) 555-0101', false, false, 4.6, 215, ARRAY['general', 'vaccinations', 'dental', 'grooming'], 40.7150, -73.9990),
('Downtown Animal Hospital', '789 Park Blvd', 'New York', 'NY', '10003', '(212) 555-0102', true, false, 4.5, 178, ARRAY['emergency', 'surgery', 'general', 'exotic'], 40.7200, -73.9950),
('Happy Tails Clinic', '321 Elm Street', 'Brooklyn', 'NY', '11201', '(718) 555-0103', false, false, 4.7, 289, ARRAY['general', 'vaccinations', 'wellness', 'nutrition'], 40.6892, -73.9857),
('24 Hour Pet ER', '555 Emergency Lane', 'New York', 'NY', '10004', '(212) 555-0104', true, true, 4.4, 156, ARRAY['emergency', 'critical care', 'surgery', 'blood bank'], 40.7100, -74.0100),
('Friendly Paws Veterinary', '888 Sunset Drive', 'Queens', 'NY', '11375', '(718) 555-0105', false, false, 4.9, 402, ARRAY['general', 'dental', 'vaccinations', 'behavioral'], 40.7210, -73.8450),
('Metro Vet Specialists', '999 Medical Center Way', 'New York', 'NY', '10005', '(212) 555-0106', true, false, 4.3, 98, ARRAY['specialists', 'oncology', 'cardiology', 'neurology'], 40.7080, -74.0120),
('Brooklyn Pet Wellness', '222 Atlantic Ave', 'Brooklyn', 'NY', '11217', '(718) 555-0107', false, false, 4.6, 167, ARRAY['general', 'wellness', 'acupuncture', 'holistic'], 40.6850, -73.9780);

-- Migration: Add new pet intake fields
-- Run this against existing databases:
-- ALTER TABLE pets ADD COLUMN diet TEXT;
-- ALTER TABLE pets ADD COLUMN is_fixed TEXT DEFAULT 'unknown';
-- ALTER TABLE pets ADD COLUMN last_vet_visit DATE;
-- ALTER TABLE pets ADD COLUMN recent_vaccines TEXT;
-- ALTER TABLE pets ADD COLUMN indoor_outdoor TEXT DEFAULT 'indoor';
-- ALTER TABLE pets ADD COLUMN supplements TEXT;
-- ALTER TABLE pets ADD COLUMN travel_history TEXT;
-- ALTER TABLE pets ADD COLUMN recent_procedures TEXT;
-- ALTER TABLE pets ADD COLUMN photo_url TEXT;
