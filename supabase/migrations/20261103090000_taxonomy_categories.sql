CREATE TABLE oran.taxonomy (id uuid PRIMARY KEY, name text NOT NULL, description text NOT NULL, uri text, version text);
CREATE TABLE oran.taxonomy_term (
 id uuid PRIMARY KEY, taxonomy_id uuid NOT NULL REFERENCES oran.taxonomy(id),
 code text NOT NULL CHECK (code ~ '^[a-z][a-z0-9_]{1,39}$'), name text NOT NULL, description text NOT NULL DEFAULT '',
 parent_id uuid REFERENCES oran.taxonomy_term(id), language text NOT NULL DEFAULT 'en', UNIQUE (taxonomy_id, code));
-- ORAN extension: presentation of category terms.
CREATE TABLE oran.category_display (
 term_id uuid PRIMARY KEY REFERENCES oran.taxonomy_term(id), sort_order integer NOT NULL UNIQUE,
 label_en text NOT NULL, label_es text NOT NULL);
CREATE TABLE oran.attribute (
 id uuid PRIMARY KEY, link_id uuid NOT NULL REFERENCES oran.service(id),
 link_entity text NOT NULL CHECK (link_entity = 'service'), link_type text NOT NULL CHECK (link_type = 'category'),
 taxonomy_term_id uuid NOT NULL REFERENCES oran.taxonomy_term(id), value text, label text, UNIQUE (link_id, taxonomy_term_id));
INSERT INTO oran.taxonomy (id, name, description, version) VALUES ('7f3c2a10-0c5e-4d8e-9a51-0a0000000001', 'ORAN categories', 'Plain-language support categories used by ORAN.', '1');
-- Spanish labels are drafts that need native-speaker review before release.
WITH seed(sort_order, code, label_en, label_es) AS (VALUES
 (1, 'food', 'Food', 'Alimentos'), (2, 'housing_shelter', 'Housing & shelter', 'Vivienda y refugio'),
 (3, 'bills_money', 'Bills & money', 'Facturas y dinero'), (4, 'health', 'Health', 'Salud'),
 (5, 'mental_health', 'Mental health', 'Salud mental'), (6, 'work', 'Work', 'Trabajo'),
 (7, 'legal', 'Legal', 'Apoyo legal'), (8, 'transportation', 'Transportation', 'Transporte'),
 (9, 'childcare_family', 'Childcare & family', 'Cuidado infantil y familia'), (10, 'safety', 'Safety', 'Seguridad')),
terms AS (
 INSERT INTO oran.taxonomy_term (id, taxonomy_id, code, name)
 SELECT gen_random_uuid(), '7f3c2a10-0c5e-4d8e-9a51-0a0000000001', code, label_en FROM seed RETURNING id, code)
INSERT INTO oran.category_display (term_id, sort_order, label_en, label_es)
SELECT terms.id, seed.sort_order, seed.label_en, seed.label_es FROM seed JOIN terms USING (code);
-- Legacy mapping: housing becomes housing_shelter, other is dropped, the rest keep their codes.
INSERT INTO oran.attribute (id, link_id, link_entity, link_type, taxonomy_term_id)
SELECT gen_random_uuid(), l.service_id, 'service', 'category', t.id
FROM oran.listing_state l JOIN oran.taxonomy_term t ON t.code = CASE l.category WHEN 'housing' THEN 'housing_shelter' ELSE l.category END
WHERE l.category <> 'other';
UPDATE oran.membership SET category_scope = ARRAY(SELECT CASE v WHEN 'housing' THEN 'housing_shelter' ELSE v END FROM unnest(category_scope) v WHERE v <> 'other');
UPDATE oran.personal_profile SET needs = ARRAY(SELECT CASE v WHEN 'housing' THEN 'housing_shelter' ELSE v END FROM unnest(needs) v WHERE v <> 'other');
ALTER TABLE oran.taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.taxonomy_term ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.category_display ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.attribute ENABLE ROW LEVEL SECURITY;
