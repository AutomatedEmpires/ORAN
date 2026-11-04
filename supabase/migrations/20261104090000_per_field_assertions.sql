-- Slice 2: the whole-form table becomes `revision` (keeping its ids, so listing_state.revision_id and the stale-revision check still work) and `field_assertion` becomes one row per fact (ORAN extension; HSDS metadata is derivable from superseded/accepted pairs).
ALTER TABLE oran.field_assertion RENAME TO revision;
ALTER TABLE oran.revision RENAME CONSTRAINT field_assertion_pkey TO revision_pkey;
ALTER TABLE oran.revision RENAME CONSTRAINT field_assertion_service_id_fkey TO revision_service_id_fkey;
ALTER TABLE oran.revision RENAME CONSTRAINT field_assertion_actor_id_fkey TO revision_actor_id_fkey;
ALTER TABLE oran.revision DROP COLUMN status;
ALTER TABLE oran.revision RENAME COLUMN value TO legacy_snapshot;
ALTER TABLE oran.revision ALTER COLUMN legacy_snapshot DROP NOT NULL;
UPDATE oran.revision SET origin = 'verifier' WHERE origin = 'community';
ALTER TABLE oran.revision ADD CONSTRAINT revision_origin CHECK (origin IN ('organization','verifier','admin','pipeline','chat_discovery','flag'));
CREATE TABLE oran.field_assertion (
 id uuid PRIMARY KEY, revision_id uuid NOT NULL REFERENCES oran.revision(id),
 entity_type text NOT NULL CHECK (entity_type IN ('organization','service','location')), entity_id uuid NOT NULL,
 field_path text NOT NULL CHECK (field_path ~ '^[a-z][a-z_]{1,39}$'), value jsonb NOT NULL,
 origin text NOT NULL CHECK (origin IN ('organization','verifier','admin','pipeline','chat_discovery','flag')),
 source_type text NOT NULL CHECK (source_type IN ('url','phone_call','organization','legacy')),
 source_url text CHECK (source_url ~ '^https?://'), source_note text NOT NULL DEFAULT '',
 observed_at timestamptz NOT NULL,
 status text NOT NULL CHECK (status IN ('proposed','accepted','superseded','rejected')),
 decided_by text REFERENCES oran.account(user_id), decided_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT field_assertion_source_shape CHECK ((source_type = 'url') = (source_url IS NOT NULL)),
 CONSTRAINT field_assertion_decision_shape CHECK ((status = 'proposed') = (decided_at IS NULL)),
 CONSTRAINT field_assertion_decider_shape CHECK ((decided_by IS NULL) = (decided_at IS NULL)));
CREATE UNIQUE INDEX field_assertion_one_accepted ON oran.field_assertion (entity_type, entity_id, field_path) WHERE status = 'accepted';
CREATE INDEX field_assertion_entity ON oran.field_assertion (entity_id);
-- Backfill: each listing's current revision becomes the accepted, 'legacy'-sourced value of every field the old form carried. Empty and missing values are skipped.
INSERT INTO oran.field_assertion (id, revision_id, entity_type, entity_id, field_path, value, origin, source_type, source_note, observed_at, status, decided_by, decided_at)
SELECT gen_random_uuid(), r.id, 'service', s.id, f.field_path, f.value, r.origin, 'legacy', COALESCE(r.legacy_snapshot #>> '{input,source_note}', ''), r.created_at, 'accepted', r.actor_id, r.created_at
FROM oran.service s
JOIN oran.listing_state l ON l.service_id = s.id
JOIN oran.revision r ON r.id = l.revision_id
CROSS JOIN LATERAL (VALUES
 ('name', to_jsonb(s.name)),
 ('description', to_jsonb(s.description)),
 ('url', to_jsonb(s.url)),
 ('eligibility_description', to_jsonb(NULLIF(s.eligibility_description, ''))),
 ('application_process', to_jsonb(NULLIF(s.application_process, ''))),
 ('categories', (SELECT jsonb_agg(t.code ORDER BY d.sort_order)
  FROM oran.attribute a JOIN oran.taxonomy_term t ON t.id = a.taxonomy_term_id JOIN oran.category_display d ON d.term_id = t.id
  WHERE a.link_id = s.id AND a.link_entity = 'service' AND a.link_type = 'category')),
 ('service_area', (SELECT jsonb_build_object('kind', 'zip', 'postal_codes', jsonb_agg(a.extent ORDER BY a.extent))
  FROM oran.service_area a WHERE a.service_id = s.id AND a.extent ~ '^[0-9]{5}$' HAVING count(*) > 0))
) AS f(field_path, value)
WHERE f.value IS NOT NULL;
-- An organization's name is linked to the earliest revision made through any of its services.
INSERT INTO oran.field_assertion (id, revision_id, entity_type, entity_id, field_path, value, origin, source_type, source_note, observed_at, status, decided_by, decided_at)
SELECT DISTINCT ON (o.id) gen_random_uuid(), r.id, 'organization', o.id, 'name', to_jsonb(o.name), r.origin, 'legacy', COALESCE(r.legacy_snapshot #>> '{input,source_note}', ''), r.created_at, 'accepted', r.actor_id, r.created_at
FROM oran.organization o
JOIN oran.service s ON s.organization_id = o.id
JOIN oran.revision r ON r.service_id = s.id
ORDER BY o.id, r.created_at, r.id;
ALTER TABLE oran.field_assertion ENABLE ROW LEVEL SECURITY;
