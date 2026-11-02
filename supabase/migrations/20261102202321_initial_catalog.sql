CREATE EXTENSION IF NOT EXISTS postgis;
CREATE SCHEMA IF NOT EXISTS oran;
CREATE TYPE oran.member_role AS ENUM ('admin', 'organization', 'community', 'user');
CREATE TABLE oran.organization (
 id uuid PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT ''
);
CREATE TABLE oran.membership (
 user_id text PRIMARY KEY, display_name text NOT NULL, role oran.member_role NOT NULL,
 organization_id uuid REFERENCES oran.organization(id), approved boolean NOT NULL DEFAULT false,
 postal_code text CHECK (postal_code ~ '^[0-9]{5}$'),
 CHECK (role <> 'organization' OR organization_id IS NOT NULL)
);
CREATE TABLE oran.service (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES oran.organization(id),
 name text NOT NULL, description text NOT NULL, url text,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','defunct','temporarily closed')),
 eligibility_description text NOT NULL DEFAULT '', application_process text NOT NULL DEFAULT ''
);
CREATE TABLE oran.service_area (
 id uuid PRIMARY KEY, service_id uuid NOT NULL UNIQUE REFERENCES oran.service(id),
 name text NOT NULL, extent text NOT NULL, extent_type text NOT NULL DEFAULT 'text'
);
CREATE TABLE oran.field_assertion (
 id uuid PRIMARY KEY, service_id uuid NOT NULL REFERENCES oran.service(id),
 actor_id text NOT NULL REFERENCES oran.membership(user_id), origin text NOT NULL,
 value jsonb NOT NULL, status text NOT NULL CHECK (status='accepted'), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE oran.listing_state (
 service_id uuid PRIMARY KEY REFERENCES oran.service(id), category text NOT NULL,
 created_by text NOT NULL REFERENCES oran.membership(user_id),
 state text NOT NULL DEFAULT 'unreviewed' CHECK (state IN ('unreviewed','checked')),
 checked_at timestamptz, next_review_due timestamptz,
 CHECK ((state='checked') = (checked_at IS NOT NULL AND next_review_due IS NOT NULL))
);
CREATE TABLE oran.verification_event (
 id uuid PRIMARY KEY, service_id uuid NOT NULL REFERENCES oran.service(id),
 actor_id text NOT NULL REFERENCES oran.membership(user_id), method text NOT NULL,
 evidence text NOT NULL, fields_checked text NOT NULL, observed_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE TABLE oran.work_item (
 service_id uuid PRIMARY KEY REFERENCES oran.service(id),
 assigned_to text REFERENCES oran.membership(user_id), due_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE oran.audit_event (
 id uuid PRIMARY KEY, actor_id text NOT NULL REFERENCES oran.membership(user_id),
 action text NOT NULL, subject text NOT NULL, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE oran.personal_profile (
 user_id text PRIMARY KEY REFERENCES oran.membership(user_id), postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
 needs text[] NOT NULL, consented_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
-- The schema is not exposed through the Supabase Data API. Browser roles get no grants.
REVOKE ALL ON SCHEMA oran FROM PUBLIC;
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='oran' LOOP
  EXECUTE format('ALTER TABLE oran.%I ENABLE ROW LEVEL SECURITY', t);
 END LOOP;
END $$;
