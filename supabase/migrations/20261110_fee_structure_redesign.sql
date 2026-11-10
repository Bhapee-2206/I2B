-- =============================================================================
-- EDUTRACK – Complete Fee Structure Redesign & Normalized Pricing Model
-- PostgreSQL / Supabase Migration
-- =============================================================================

-- 1. FEE CATEGORIES TABLE (Subject Tuition vs Hindi)
CREATE TABLE IF NOT EXISTS public.fee_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL, -- 'SUBJECT', 'HINDI'
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Categories
INSERT INTO public.fee_categories (code, name, description, sort_order)
VALUES 
    ('SUBJECT', 'Subject Tuition', 'Core academic school tuition for Matric and CBSE boards', 1),
    ('HINDI', 'Hindi Programme', 'Hindi language training across official course levels for Virtual and Online delivery', 2)
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- 2. FEE VARIANTS TABLE (Pricing types under each category)
-- Under Subject: Matric, CBSE
-- Under Hindi: Virtual, Online
CREATE TABLE IF NOT EXISTS public.fee_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_category_id UUID NOT NULL REFERENCES public.fee_categories(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- 'MATRIC', 'CBSE', 'VIRTUAL', 'ONLINE'
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fee_category_id, code)
);

-- Seed Variants
DO $$
DECLARE
    subject_cat_id UUID;
    hindi_cat_id UUID;
BEGIN
    SELECT id INTO subject_cat_id FROM public.fee_categories WHERE code = 'SUBJECT';
    SELECT id INTO hindi_cat_id FROM public.fee_categories WHERE code = 'HINDI';

    -- Subject Variants (Boards)
    INSERT INTO public.fee_variants (fee_category_id, code, name, sort_order)
    VALUES 
        (subject_cat_id, 'MATRIC', 'Matric', 1),
        (subject_cat_id, 'CBSE', 'CBSE', 2)
    ON CONFLICT (fee_category_id, code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

    -- Hindi Variants (Delivery Types)
    INSERT INTO public.fee_variants (fee_category_id, code, name, sort_order)
    VALUES 
        (hindi_cat_id, 'VIRTUAL', 'Virtual', 1),
        (hindi_cat_id, 'ONLINE', 'Online', 2)
    ON CONFLICT (fee_category_id, code) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;
END $$;

-- 3. FEE LEVELS TABLE
-- Subject Levels: LKG through 12th Standard
-- Hindi Levels: Basic + 9 Named Examination Levels
CREATE TABLE IF NOT EXISTS public.fee_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fee_category_id UUID NOT NULL REFERENCES public.fee_categories(id) ON DELETE CASCADE,
    level_code TEXT NOT NULL,
    level_name TEXT NOT NULL,
    local_language_name TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fee_category_id, level_code)
);

-- Seed Fee Levels
DO $$
DECLARE
    subject_cat_id UUID;
    hindi_cat_id UUID;
BEGIN
    SELECT id INTO subject_cat_id FROM public.fee_categories WHERE code = 'SUBJECT';
    SELECT id INTO hindi_cat_id FROM public.fee_categories WHERE code = 'HINDI';

    -- 14 School Classes for Subject Tuition
    INSERT INTO public.fee_levels (fee_category_id, level_code, level_name, sort_order)
    VALUES 
        (subject_cat_id, 'LKG', 'LKG', 1),
        (subject_cat_id, 'UKG', 'UKG', 2),
        (subject_cat_id, '1st', '1st Standard', 3),
        (subject_cat_id, '2nd', '2nd Standard', 4),
        (subject_cat_id, '3rd', '3rd Standard', 5),
        (subject_cat_id, '4th', '4th Standard', 6),
        (subject_cat_id, '5th', '5th Standard', 7),
        (subject_cat_id, '6th', '6th Standard', 8),
        (subject_cat_id, '7th', '7th Standard', 9),
        (subject_cat_id, '8th', '8th Standard', 10),
        (subject_cat_id, '9th', '9th Standard', 11),
        (subject_cat_id, '10th', '10th Standard', 12),
        (subject_cat_id, '11th', '11th Standard', 13),
        (subject_cat_id, '12th', '12th Standard', 14)
    ON CONFLICT (fee_category_id, level_code) DO UPDATE SET level_name = EXCLUDED.level_name, sort_order = EXCLUDED.sort_order;

    -- 10 Official Hindi Course Levels
    INSERT INTO public.fee_levels (fee_category_id, level_code, level_name, local_language_name, sort_order)
    VALUES 
        (hindi_cat_id, 'BASIC', 'Basic', 'बेसिक', 0),
        (hindi_cat_id, 'PARICHAYA', 'Parichaya', 'परिचय', 1),
        (hindi_cat_id, 'PRATHAMIC', 'Prathamic', 'प्राथमिक', 2),
        (hindi_cat_id, 'MADHYAMA', 'Madhyama', 'मध्यमा', 3),
        (hindi_cat_id, 'RASHTRABHASHA', 'Rashtrabhasha', 'राष्ट्रभाषा', 4),
        (hindi_cat_id, 'PRAVESHIKA', 'Praveshika', 'प्रवेशिका', 5),
        (hindi_cat_id, 'VISHARAD_POORVARDH', 'Visharad Poorvardh', 'विशारद पूर्वार्ध', 6),
        (hindi_cat_id, 'VISHARAD_UTTARARDH', 'Visharad Uttarardh', 'विशारद उत्तरार्ध', 7),
        (hindi_cat_id, 'PRAVEEN_POORVARDH', 'Praveen Poorvardh', 'प्रवीण पूर्वार्ध', 8),
        (hindi_cat_id, 'PRAVEEN_UTTARARDH', 'Praveen Uttarardh', 'प्रवीण उत्तरार्ध', 9)
    ON CONFLICT (fee_category_id, level_code) DO UPDATE SET 
        level_name = EXCLUDED.level_name, 
        local_language_name = EXCLUDED.local_language_name,
        sort_order = EXCLUDED.sort_order;
END $$;

-- 4. FEE STRUCTURES TABLE (Enhanced with normalized foreign keys)
-- Ensure columns exist in public.fee_structures
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS fee_variant_id UUID REFERENCES public.fee_variants(id) ON DELETE CASCADE;
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS fee_level_id UUID REFERENCES public.fee_levels(id) ON DELETE CASCADE;
ALTER TABLE public.fee_structures ADD COLUMN IF NOT EXISTS effective_to DATE;

-- 5. SEED INITIAL EXACT FEE STRUCTURE RATES
DO $$
DECLARE
    sub_matric_id UUID;
    sub_cbse_id UUID;
    hin_virtual_id UUID;
    hin_online_id UUID;

    lvl_id UUID;
    subject_cat_id UUID;
    hindi_cat_id UUID;
BEGIN
    SELECT id INTO subject_cat_id FROM public.fee_categories WHERE code = 'SUBJECT';
    SELECT id INTO hindi_cat_id FROM public.fee_categories WHERE code = 'HINDI';

    SELECT id INTO sub_matric_id FROM public.fee_variants WHERE fee_category_id = subject_cat_id AND code = 'MATRIC';
    SELECT id INTO sub_cbse_id FROM public.fee_variants WHERE fee_category_id = subject_cat_id AND code = 'CBSE';

    SELECT id INTO hin_virtual_id FROM public.fee_variants WHERE fee_category_id = hindi_cat_id AND code = 'VIRTUAL';
    SELECT id INTO hin_online_id FROM public.fee_variants WHERE fee_category_id = hindi_cat_id AND code = 'ONLINE';

    -- Helper macro to insert or update rate
    -- SUBJECT MATRIC RATES
    -- LKG: 500, UKG: 500, 1st: 550, 2nd-4th: 600, 5th-7th: 650, 8th: 800, 9th: 900, 10th: 1000, 11th: 1100, 12th: 1200
    INSERT INTO public.fee_structures (fee_variant_id, fee_level_id, class_or_grade, board, monthly_fee, is_active)
    SELECT sub_matric_id, id, level_code, 'Matric', 
        CASE level_code
            WHEN 'LKG' THEN 500.00
            WHEN 'UKG' THEN 500.00
            WHEN '1st' THEN 550.00
            WHEN '2nd' THEN 600.00
            WHEN '3rd' THEN 600.00
            WHEN '4th' THEN 600.00
            WHEN '5th' THEN 650.00
            WHEN '6th' THEN 650.00
            WHEN '7th' THEN 650.00
            WHEN '8th' THEN 800.00
            WHEN '9th' THEN 900.00
            WHEN '10th' THEN 1000.00
            WHEN '11th' THEN 1100.00
            WHEN '12th' THEN 1200.00
        END,
        TRUE
    FROM public.fee_levels 
    WHERE fee_category_id = subject_cat_id
    ON CONFLICT DO NOTHING;

    -- SUBJECT CBSE RATES (Configured only up to 8th standard, 9th-12th Not configured)
    INSERT INTO public.fee_structures (fee_variant_id, fee_level_id, class_or_grade, board, monthly_fee, is_active)
    SELECT sub_cbse_id, id, level_code, 'CBSE', 
        CASE level_code
            WHEN 'LKG' THEN 600.00
            WHEN 'UKG' THEN 600.00
            WHEN '1st' THEN 600.00
            WHEN '2nd' THEN 650.00
            WHEN '3rd' THEN 650.00
            WHEN '4th' THEN 650.00
            WHEN '5th' THEN 700.00
            WHEN '6th' THEN 700.00
            WHEN '7th' THEN 750.00
            WHEN '8th' THEN 900.00
        END,
        TRUE
    FROM public.fee_levels 
    WHERE fee_category_id = subject_cat_id AND level_code IN ('LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th')
    ON CONFLICT DO NOTHING;

    -- HINDI VIRTUAL RATES
    -- Basic: 500, Parichaya: 500, Prathamic: 600, Madhyama: 700, Rashtrabhasha: 800,
    -- Praveshika: 900, Visharad Poorvardh: 1000, Visharad Uttarardh: 1100, Praveen Poorvardh: 1200, Praveen Uttarardh: 1300
    INSERT INTO public.fee_structures (fee_variant_id, fee_level_id, class_or_grade, board, monthly_fee, is_active)
    SELECT hin_virtual_id, id, level_code, 'Virtual',
        CASE level_code
            WHEN 'BASIC' THEN 500.00
            WHEN 'PARICHAYA' THEN 500.00
            WHEN 'PRATHAMIC' THEN 600.00
            WHEN 'MADHYAMA' THEN 700.00
            WHEN 'RASHTRABHASHA' THEN 800.00
            WHEN 'PRAVESHIKA' THEN 900.00
            WHEN 'VISHARAD_POORVARDH' THEN 1000.00
            WHEN 'VISHARAD_UTTARARDH' THEN 1100.00
            WHEN 'PRAVEEN_POORVARDH' THEN 1200.00
            WHEN 'PRAVEEN_UTTARARDH' THEN 1300.00
        END,
        TRUE
    FROM public.fee_levels
    WHERE fee_category_id = hindi_cat_id
    ON CONFLICT DO NOTHING;

    -- HINDI ONLINE RATES
    -- Basic: 750, Parichaya: 750, Prathamic: 750, Madhyama: 850, Rashtrabhasha: 950,
    -- Praveshika: 1050, Visharad Poorvardh: 1150, Visharad Uttarardh: 1250, Praveen Poorvardh: 1350, Praveen Uttarardh: 1450
    INSERT INTO public.fee_structures (fee_variant_id, fee_level_id, class_or_grade, board, monthly_fee, is_active)
    SELECT hin_online_id, id, level_code, 'Online',
        CASE level_code
            WHEN 'BASIC' THEN 750.00
            WHEN 'PARICHAYA' THEN 750.00
            WHEN 'PRATHAMIC' THEN 750.00
            WHEN 'MADHYAMA' THEN 850.00
            WHEN 'RASHTRABHASHA' THEN 950.00
            WHEN 'PRAVESHIKA' THEN 1050.00
            WHEN 'VISHARAD_POORVARDH' THEN 1150.00
            WHEN 'VISHARAD_UTTARARDH' THEN 1250.00
            WHEN 'PRAVEEN_POORVARDH' THEN 1350.00
            WHEN 'PRAVEEN_UTTARARDH' THEN 1450.00
        END,
        TRUE
    FROM public.fee_levels
    WHERE fee_category_id = hindi_cat_id
    ON CONFLICT DO NOTHING;
END $$;

-- 6. ENABLE ROW LEVEL SECURITY & CREATE ACCESS POLICIES
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public fee_categories read access" ON public.fee_categories FOR SELECT USING (true);
CREATE POLICY "Public fee_categories write access" ON public.fee_categories FOR ALL USING (true);

CREATE POLICY "Public fee_variants read access" ON public.fee_variants FOR SELECT USING (true);
CREATE POLICY "Public fee_variants write access" ON public.fee_variants FOR ALL USING (true);

CREATE POLICY "Public fee_levels read access" ON public.fee_levels FOR SELECT USING (true);
CREATE POLICY "Public fee_levels write access" ON public.fee_levels FOR ALL USING (true);

-- 7. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
