ALTER TABLE oran.membership ADD COLUMN category_scope text[] NOT NULL DEFAULT '{}';
ALTER TABLE oran.listing_state ADD COLUMN revision_id uuid REFERENCES oran.field_assertion(id);
UPDATE oran.listing_state l SET revision_id=(SELECT a.id FROM oran.field_assertion a WHERE a.service_id=l.service_id ORDER BY a.created_at DESC,a.id DESC LIMIT 1);
ALTER TABLE oran.listing_state ALTER COLUMN revision_id SET NOT NULL;
