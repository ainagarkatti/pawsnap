-- ============================================================
-- PawSnap RAG Knowledge Base Schema
-- PostgreSQL + pgvector
-- ============================================================

-- Enable vector extension (Supabase / pgvector)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- fuzzy text search

-- ============================================================
-- 1. BREEDS
-- Source: AKC (dogs), CFA (cats), FCI breed standards
-- ============================================================
CREATE TABLE breeds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species         TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  name            TEXT NOT NULL,
  aliases         TEXT[],                        -- alternate names / spellings
  size_category   TEXT CHECK (size_category IN ('toy','small','medium','large','giant')),
  avg_weight_kg   NUMRANGE,                      -- normal weight range
  avg_lifespan_yr NUMRANGE,
  coat_type       TEXT[],                        -- ['short','double','wiry','curly','hairless']
  energy_level    TEXT CHECK (energy_level IN ('low','moderate','high','very_high')),
  region_origin   TEXT,
  restricted_in   TEXT[],                        -- ISO country codes where breed is banned
  embedding       vector(1536),                  -- for semantic breed search
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX breeds_species_idx   ON breeds(species);
CREATE INDEX breeds_name_trgm_idx ON breeds USING gin(name gin_trgm_ops);
CREATE INDEX breeds_embedding_idx ON breeds USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 2. BREED HEALTH PREDISPOSITIONS
-- Source: AVMA, veterinary genetics databases, breed club health surveys
-- ============================================================
CREATE TABLE breed_health_risks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breed_id       UUID NOT NULL REFERENCES breeds(id) ON DELETE CASCADE,
  condition_name TEXT NOT NULL,
  risk_level     TEXT NOT NULL CHECK (risk_level IN ('low','moderate','high','very_high')),
  onset_age_yr   NUMRANGE,                       -- typical age of onset
  notes          TEXT,
  source         TEXT                            -- citation
);

CREATE INDEX breed_health_risks_breed_idx ON breed_health_risks(breed_id);

-- ============================================================
-- 3. HEALTH CONDITIONS
-- Source: Merck Veterinary Manual, WSAVA guidelines, AVMA
-- ============================================================
CREATE TABLE health_conditions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species             TEXT[] NOT NULL,            -- ['dog'], ['cat'], or ['dog','cat']
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,              -- 'dermatology','cardiology','orthopedic', etc.
  description         TEXT NOT NULL,
  common_symptoms     TEXT[],
  urgency_level       TEXT NOT NULL CHECK (urgency_level IN ('monitor','vet_soon','emergency')),
  is_contagious       BOOLEAN DEFAULT FALSE,
  is_zoonotic         BOOLEAN DEFAULT FALSE,      -- can spread to humans
  prevention_tips     TEXT[],
  treatment_overview  TEXT,                       -- general info only, no prescriptions
  embedding           vector(1536),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX health_conditions_species_idx   ON health_conditions USING gin(species);
CREATE INDEX health_conditions_embedding_idx ON health_conditions
  USING ivfflat(embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- 4. SYMPTOMS
-- Symptom → condition mapping with urgency triage
-- Source: AVMA, veterinary triage guidelines
-- ============================================================
CREATE TABLE symptoms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species         TEXT[] NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  body_area       TEXT,                           -- 'skin','eyes','ears','gait','behavior', etc.
  urgency_default TEXT NOT NULL CHECK (urgency_default IN ('monitor','vet_soon','emergency')),
  red_flags       TEXT[],                         -- combinations that escalate urgency
  embedding       vector(1536)
);

CREATE TABLE symptom_conditions (
  symptom_id   UUID REFERENCES symptoms(id) ON DELETE CASCADE,
  condition_id UUID REFERENCES health_conditions(id) ON DELETE CASCADE,
  confidence   NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
  PRIMARY KEY (symptom_id, condition_id)
);

-- ============================================================
-- 5. EMERGENCY CONDITIONS (HARDCODED SAFETY RAIL)
-- These always trigger immediate vet escalation — never overridden by AI
-- Source: AVMA Emergency Guidelines, veterinary triage protocols
-- ============================================================
CREATE TABLE emergency_conditions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species     TEXT[] NOT NULL,
  trigger_keywords TEXT[] NOT NULL,               -- matched against user input
  display_message  TEXT NOT NULL,                 -- shown to user
  action_label     TEXT NOT NULL DEFAULT 'Find Emergency Vet Now'
);

-- Seed: hardcoded emergency triggers
INSERT INTO emergency_conditions (species, trigger_keywords, display_message) VALUES
  (ARRAY['dog','cat'], ARRAY['not breathing','stopped breathing','no breath'], 'Your pet may not be breathing. Go to an emergency vet immediately.'),
  (ARRAY['dog','cat'], ARRAY['seizure','convulsion','fitting','tremor'], 'Seizures require immediate veterinary attention. Go to an emergency vet now.'),
  (ARRAY['dog','cat'], ARRAY['unconscious','unresponsive','collapsed','passed out'], 'Your pet is unresponsive. This is a medical emergency.'),
  (ARRAY['dog','cat'], ARRAY['bleeding heavily','blood everywhere','won''t stop bleeding'], 'Severe bleeding requires emergency care immediately.'),
  (ARRAY['dog','cat'], ARRAY['can''t breathe','struggling to breathe','gasping'], 'Difficulty breathing is a life-threatening emergency.'),
  (ARRAY['dog','cat'], ARRAY['ate poison','ate chocolate','swallowed medication','ingested'], 'Possible poisoning — contact an emergency vet or Pet Poison Helpline immediately.'),
  (ARRAY['dog','cat'], ARRAY['broken bone','fracture','leg hanging'], 'A suspected fracture needs emergency veterinary care.'),
  (ARRAY['dog'],       ARRAY['bloat','swollen belly','distended stomach','GDV'], 'Bloat (GDV) in dogs is fatal without immediate surgery. Go now.'),
  (ARRAY['cat'],       ARRAY['can''t urinate','straining to pee','no urine','blocked'], 'Urinary blockage in cats is life-threatening. Go to emergency vet immediately.');

-- ============================================================
-- 6. TOXIC SUBSTANCES
-- Source: ASPCA Animal Poison Control, Pet Poison Helpline
-- ============================================================
CREATE TABLE toxic_substances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species       TEXT[] NOT NULL,
  name          TEXT NOT NULL,
  aliases       TEXT[],
  category      TEXT NOT NULL,                    -- 'food','plant','medication','chemical','household'
  toxicity_level TEXT NOT NULL CHECK (toxicity_level IN ('mild','moderate','severe','fatal')),
  symptoms      TEXT[],
  action        TEXT NOT NULL DEFAULT 'Contact vet or Pet Poison Helpline immediately',
  embedding     vector(1536)
);

CREATE INDEX toxic_substances_name_trgm ON toxic_substances USING gin(name gin_trgm_ops);

-- Sample toxic food seeds (dogs)
INSERT INTO toxic_substances (species, name, aliases, category, toxicity_level, symptoms, action) VALUES
  (ARRAY['dog','cat'], 'Xylitol',      ARRAY['birch sugar','sugar alcohol'], 'food',      'fatal',    ARRAY['vomiting','hypoglycemia','liver failure'],   'Emergency vet immediately'),
  (ARRAY['dog'],       'Chocolate',    ARRAY['cocoa','theobromine'],          'food',      'severe',   ARRAY['vomiting','tremors','seizures'],             'Emergency vet immediately'),
  (ARRAY['dog','cat'], 'Grapes',       ARRAY['raisins','currants'],           'food',      'severe',   ARRAY['vomiting','kidney failure'],                 'Emergency vet immediately'),
  (ARRAY['cat'],       'Onion',        ARRAY['garlic','leeks','chives'],      'food',      'severe',   ARRAY['anemia','vomiting','weakness'],              'Emergency vet — do not induce vomiting'),
  (ARRAY['cat'],       'Lilies',       ARRAY['Easter lily','Tiger lily'],     'plant',     'fatal',    ARRAY['vomiting','kidney failure','lethargy'],      'Emergency vet immediately — fatal in cats'),
  (ARRAY['dog','cat'], 'Ibuprofen',    ARRAY['Advil','Nurofen','Motrin'],     'medication','fatal',    ARRAY['GI ulcers','kidney failure','vomiting'],     'Emergency vet immediately'),
  (ARRAY['dog','cat'], 'Acetaminophen',ARRAY['Paracetamol','Tylenol'],        'medication','fatal',    ARRAY['liver failure','facial swelling'],           'Emergency vet immediately');

-- ============================================================
-- 7. VACCINATION SCHEDULES
-- Source: WSAVA Global Guidelines, AVMA, regional vet associations
-- ============================================================
CREATE TABLE vaccination_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species         TEXT NOT NULL CHECK (species IN ('dog','cat')),
  vaccine_name    TEXT NOT NULL,
  is_core         BOOLEAN NOT NULL DEFAULT TRUE,  -- core = required; non-core = lifestyle-based
  region_codes    TEXT[],                          -- NULL = global; otherwise ISO country codes
  puppy_kitten_schedule TEXT[],                    -- e.g. ['6-8 weeks','10-12 weeks','14-16 weeks']
  adult_booster_interval_months INT,
  notes           TEXT,
  source          TEXT
);

INSERT INTO vaccination_schedules (species, vaccine_name, is_core, region_codes, puppy_kitten_schedule, adult_booster_interval_months, notes, source) VALUES
  ('dog', 'Distemper/Parvovirus/Adenovirus (DHPPi)', TRUE, NULL, ARRAY['6-8 weeks','10-12 weeks','14-16 weeks','12-16 months'], 36, 'Core vaccine globally', 'WSAVA 2022'),
  ('dog', 'Rabies', TRUE, ARRAY['US','GB','AE','AU','EU'], ARRAY['12-16 weeks'], 12, 'Legally required in most regions. Annual or triennial depending on jurisdiction.', 'AVMA 2023'),
  ('dog', 'Leptospirosis', FALSE, ARRAY['US','GB','EU'], ARRAY['10-12 weeks','13-15 weeks'], 12, 'Recommended in high-exposure areas', 'WSAVA 2022'),
  ('dog', 'Bordetella (Kennel Cough)', FALSE, NULL, ARRAY['10-12 weeks'], 12, 'Recommended for social dogs — boarding, dog parks', 'AVMA 2023'),
  ('dog', 'Lyme Disease', FALSE, ARRAY['US','CA'], ARRAY['12 weeks','15 weeks'], 12, 'Recommended in tick-endemic areas', 'AVMA 2023'),
  ('cat', 'FVRCP (Rhinotracheitis/Calicivirus/Panleukopenia)', TRUE, NULL, ARRAY['6-8 weeks','10-12 weeks','14-16 weeks','12-16 months'], 36, 'Core vaccine globally', 'WSAVA 2022'),
  ('cat', 'Rabies', TRUE, ARRAY['US','AE','AU'], ARRAY['12-16 weeks'], 12, 'Legally required in many regions for cats', 'AVMA 2023'),
  ('cat', 'FeLV (Feline Leukemia Virus)', FALSE, NULL, ARRAY['8-9 weeks','11-12 weeks'], 12, 'Recommended for outdoor cats or multi-cat households', 'WSAVA 2022'),
  ('cat', 'FIV', FALSE, ARRAY['AU','NZ'], ARRAY['8 weeks','10 weeks','12 weeks'], 12, 'Available in select regions — outdoor cats at risk', 'WSAVA 2022');

-- ============================================================
-- 8. NUTRITION GUIDELINES
-- Source: AAFCO, WSAVA Nutrition Guidelines, breed club recommendations
-- ============================================================
CREATE TABLE nutrition_guidelines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species           TEXT NOT NULL CHECK (species IN ('dog','cat')),
  life_stage        TEXT NOT NULL CHECK (life_stage IN ('puppy','kitten','adult','senior')),
  size_category     TEXT,                         -- NULL = all sizes
  daily_calories_kcal NUMRANGE,                   -- range per kg of body weight
  protein_pct_min   NUMERIC(4,1),                 -- AAFCO minimum %
  fat_pct_min       NUMERIC(4,1),
  key_nutrients     TEXT[],
  foods_to_avoid    TEXT[],
  feeding_frequency TEXT,
  notes             TEXT,
  source            TEXT
);

-- ============================================================
-- 9. GROOMING GUIDES
-- Source: Professional grooming standards, breed club guidelines
-- ============================================================
CREATE TABLE grooming_guides (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species               TEXT NOT NULL CHECK (species IN ('dog','cat')),
  coat_type             TEXT NOT NULL,             -- 'short','medium','long','double','wire','curly','hairless'
  brushing_frequency    TEXT NOT NULL,
  bathing_frequency     TEXT NOT NULL,
  nail_trim_frequency   TEXT NOT NULL DEFAULT 'Every 3-4 weeks',
  ear_cleaning_frequency TEXT NOT NULL DEFAULT 'Monthly',
  dental_care_frequency TEXT NOT NULL DEFAULT 'Daily brushing recommended',
  shedding_level        TEXT CHECK (shedding_level IN ('none','low','moderate','high','very_high')),
  seasonal_notes        TEXT,
  professional_grooming TEXT
);

-- ============================================================
-- 10. BODY CONDITION SCORING
-- Source: WSAVA Body Condition Score (BCS) system
-- ============================================================
CREATE TABLE body_condition_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species     TEXT NOT NULL CHECK (species IN ('dog','cat')),
  score       INT NOT NULL CHECK (score BETWEEN 1 AND 9),
  label       TEXT NOT NULL,                      -- 'Emaciated','Underweight','Ideal','Overweight','Obese'
  description TEXT NOT NULL,
  action      TEXT NOT NULL,
  urgency     TEXT NOT NULL CHECK (urgency IN ('monitor','vet_soon','emergency'))
);

INSERT INTO body_condition_scores (species, score, label, description, action, urgency) VALUES
  ('dog', 1, 'Emaciated',   'Ribs, spine, and pelvis easily visible from a distance. No muscle mass.', 'See a vet immediately — possible malnutrition or illness.', 'emergency'),
  ('dog', 2, 'Very Thin',   'Ribs easily felt and visible. No fat cover. Waist very pronounced.', 'Veterinary check recommended within a week.', 'vet_soon'),
  ('dog', 3, 'Thin',        'Ribs easily felt, minimal fat cover. Waist visible from above.', 'Consider increasing food portions. Monitor weight weekly.', 'monitor'),
  ('dog', 4, 'Ideal-Lean',  'Ribs palpable with minimal fat. Abdominal tuck visible.', 'Healthy range. Continue current diet and exercise.', 'monitor'),
  ('dog', 5, 'Ideal',       'Ribs palpable with slight fat cover. Waist visible behind ribs.', 'Ideal body condition. Maintain current routine.', 'monitor'),
  ('dog', 6, 'Ideal-Full',  'Ribs palpable with slight excess fat. Waist visible.', 'Healthy range. Slight portion monitoring recommended.', 'monitor'),
  ('dog', 7, 'Overweight',  'Ribs difficult to feel under moderate fat cover. Waist barely visible.', 'Reduce portions by 10-15%. Increase exercise. Vet check if unchanged in 4 weeks.', 'monitor'),
  ('dog', 8, 'Obese',       'Ribs very difficult to feel under heavy fat. No waist visible.', 'Veterinary nutrition plan recommended.', 'vet_soon'),
  ('dog', 9, 'Severely Obese', 'Ribs not palpable. Heavy fat deposits. Abdomen distended.', 'See a vet — obesity increases risk of diabetes, joint disease, heart disease.', 'vet_soon'),
  ('cat', 4, 'Ideal-Lean',  'Ribs palpable with minimal fat. Abdomen tucked.', 'Ideal condition for active cats.', 'monitor'),
  ('cat', 5, 'Ideal',       'Ribs palpable with slight fat cover. Waist visible behind ribs.', 'Ideal body condition.', 'monitor'),
  ('cat', 7, 'Overweight',  'Ribs difficult to feel. Rounded abdomen. No waist.', 'Portion control and vet nutrition advice recommended.', 'monitor'),
  ('cat', 9, 'Obese',       'Ribs not palpable. Heavy abdominal fat pad. Face appears round.', 'Veterinary nutrition plan required — obesity in cats risks hepatic lipidosis.', 'vet_soon');

-- ============================================================
-- 11. PHOTO ANALYSIS AUDIT LOG
-- Every AI analysis is logged for quality monitoring and feedback
-- ============================================================
CREATE TABLE analysis_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            UUID,                          -- nullable (pre-profile snap)
  user_id           UUID NOT NULL,
  analysis_type     TEXT NOT NULL,                 -- 'breed_id','health_scan','bcs'
  input_image_hash  TEXT,                          -- SHA256 of image (not the image itself)
  confidence_score  NUMERIC(3,2),
  result_json       JSONB,
  safety_triggered  BOOLEAN DEFAULT FALSE,         -- did a safety rail fire?
  safety_rule       TEXT,                          -- which rule triggered
  user_feedback     TEXT CHECK (user_feedback IN ('helpful','not_helpful','incorrect')),
  reviewed          BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX analysis_logs_user_idx     ON analysis_logs(user_id);
CREATE INDEX analysis_logs_safety_idx   ON analysis_logs(safety_triggered) WHERE safety_triggered = TRUE;
CREATE INDEX analysis_logs_feedback_idx ON analysis_logs(user_feedback) WHERE user_feedback IS NOT NULL;

-- ============================================================
-- 12. CONTENT VERSIONING
-- Tracks when knowledge base content was last reviewed by a vet
-- ============================================================
CREATE TABLE content_reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  reviewed_by     TEXT NOT NULL,                  -- vet name / credential
  reviewed_at     TIMESTAMPTZ NOT NULL,
  next_review_at  TIMESTAMPTZ NOT NULL,
  notes           TEXT
);

-- ============================================================
-- FUNCTIONS: Semantic similarity search (RAG core)
-- ============================================================

-- Breed search by embedding similarity
CREATE OR REPLACE FUNCTION search_breeds(
  query_embedding vector(1536),
  species_filter  TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.75,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id UUID, name TEXT, species TEXT,
  size_category TEXT, coat_type TEXT[],
  avg_weight_kg NUMRANGE, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT b.id, b.name, b.species, b.size_category, b.coat_type,
         b.avg_weight_kg,
         1 - (b.embedding <=> query_embedding) AS similarity
  FROM breeds b
  WHERE (species_filter IS NULL OR b.species = species_filter)
    AND 1 - (b.embedding <=> query_embedding) > match_threshold
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Health condition search by symptom description
CREATE OR REPLACE FUNCTION search_health_conditions(
  query_embedding vector(1536),
  species_filter  TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.70,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  id UUID, name TEXT, category TEXT,
  urgency_level TEXT, common_symptoms TEXT[],
  treatment_overview TEXT, similarity FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT hc.id, hc.name, hc.category,
         hc.urgency_level, hc.common_symptoms,
         hc.treatment_overview,
         1 - (hc.embedding <=> query_embedding) AS similarity
  FROM health_conditions hc
  WHERE (species_filter IS NULL OR hc.species @> ARRAY[species_filter])
    AND 1 - (hc.embedding <=> query_embedding) > match_threshold
  ORDER BY hc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Toxic substance lookup (keyword + vector)
CREATE OR REPLACE FUNCTION search_toxic_substances(
  keyword         TEXT,
  species_filter  TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, name TEXT, toxicity_level TEXT,
  symptoms TEXT[], action TEXT
)
LANGUAGE sql STABLE AS $$
  SELECT ts.id, ts.name, ts.toxicity_level, ts.symptoms, ts.action
  FROM toxic_substances ts
  WHERE (species_filter IS NULL OR ts.species @> ARRAY[species_filter])
    AND (ts.name ILIKE '%' || keyword || '%'
         OR ts.aliases && ARRAY[lower(keyword)])
  ORDER BY toxicity_level DESC
  LIMIT 5;
$$;
