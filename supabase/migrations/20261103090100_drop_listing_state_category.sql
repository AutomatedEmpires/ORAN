-- Catch any rows written after the 090000 copy by intermediate code, then drop the legacy column.
INSERT INTO oran.attribute (id, link_id, link_entity, link_type, taxonomy_term_id)
SELECT gen_random_uuid(), l.service_id, 'service', 'category', t.id
FROM oran.listing_state l JOIN oran.taxonomy_term t ON t.code = CASE l.category WHEN 'housing' THEN 'housing_shelter' ELSE l.category END
WHERE l.category <> 'other'
ON CONFLICT (link_id, taxonomy_term_id) DO NOTHING;
ALTER TABLE oran.listing_state DROP COLUMN category;
