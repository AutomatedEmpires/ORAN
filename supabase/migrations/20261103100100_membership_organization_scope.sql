ALTER TABLE oran.membership ADD CONSTRAINT membership_organization_scope CHECK ((role = 'organization') = (organization_id IS NOT NULL));
