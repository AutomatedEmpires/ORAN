-- Slice 2: HSDS 3.3.1 listing parts (location, service_at_location, address, phone, schedule) and the ORAN extensions that go with them (location_access, service_hours, service_area_kind). Every CHECK is named so a rejection says which rule it broke.
CREATE TABLE oran.location (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES oran.organization(id),
 location_type text NOT NULL, name text,
 latitude double precision, longitude double precision,
 CONSTRAINT location_type_kind CHECK (location_type IN ('physical','virtual')),
 CONSTRAINT location_latitude_range CHECK (latitude BETWEEN -90 AND 90),
 CONSTRAINT location_longitude_range CHECK (longitude BETWEEN -180 AND 180),
 CONSTRAINT location_coordinates_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
 CONSTRAINT location_coordinates_physical CHECK (location_type = 'physical' OR latitude IS NULL));
-- ORAN extension: how people reach a location and whether its address stays on the server.
CREATE TABLE oran.location_access (
 location_id uuid PRIMARY KEY REFERENCES oran.location(id),
 mode text NOT NULL, confidential boolean NOT NULL DEFAULT false,
 CONSTRAINT location_access_mode CHECK (mode IN ('physical','remote','phone')),
 CONSTRAINT location_access_confidential_physical CHECK (NOT confidential OR mode = 'physical'));
CREATE TABLE oran.service_at_location (
 id uuid PRIMARY KEY, service_id uuid NOT NULL REFERENCES oran.service(id), location_id uuid NOT NULL REFERENCES oran.location(id),
 UNIQUE (service_id, location_id));
CREATE TABLE oran.address (
 id uuid PRIMARY KEY, location_id uuid NOT NULL UNIQUE REFERENCES oran.location(id),
 address_1 text NOT NULL, address_2 text, city text NOT NULL,
 state_province text NOT NULL, postal_code text NOT NULL,
 country text NOT NULL DEFAULT 'US', address_type text NOT NULL DEFAULT 'physical',
 CONSTRAINT address_state_code CHECK (state_province ~ '^[A-Z]{2}$'),
 CONSTRAINT address_postal_code CHECK (postal_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
 CONSTRAINT address_country_us CHECK (country = 'US'),
 CONSTRAINT address_type_physical CHECK (address_type = 'physical'));
CREATE TABLE oran.phone (
 id uuid PRIMARY KEY, service_id uuid NOT NULL REFERENCES oran.service(id),
 number text NOT NULL, extension integer,
 CONSTRAINT phone_number_shape CHECK (number ~ '^(\+1[2-9][0-9]{2}[2-9][0-9]{6}|211|311|511|711|811|988)$'),
 CONSTRAINT phone_extension_range CHECK (extension BETWEEN 1 AND 99999));
CREATE TABLE oran.schedule (
 id uuid PRIMARY KEY, service_id uuid NOT NULL REFERENCES oran.service(id),
 freq text, byday text, opens_at time, closes_at time, valid_from date, valid_to date, description text NOT NULL DEFAULT '',
 CONSTRAINT schedule_freq_weekly CHECK (freq = 'WEEKLY'),
 CONSTRAINT schedule_byday_day CHECK (byday IN ('MO','TU','WE','TH','FR','SA','SU')),
 CONSTRAINT schedule_rule_pair CHECK ((freq IS NULL) = (byday IS NULL)),
 CONSTRAINT schedule_times_pair CHECK ((opens_at IS NULL) = (closes_at IS NULL)),
 CONSTRAINT schedule_times_differ CHECK (opens_at IS NULL OR opens_at <> closes_at),
 -- A weekly rule has a day and both times; a dated exception has a date range and no rule.
 CONSTRAINT schedule_rule_or_exception CHECK (CASE WHEN freq IS NOT NULL THEN opens_at IS NOT NULL AND valid_from IS NULL AND valid_to IS NULL
               ELSE valid_from IS NOT NULL AND valid_to IS NOT NULL AND valid_to >= valid_from END));
-- ORAN extension: no row means the hours are unknown.
CREATE TABLE oran.service_hours (
 service_id uuid PRIMARY KEY REFERENCES oran.service(id),
 kind text NOT NULL, time_zone text,
 CONSTRAINT service_hours_kind CHECK (kind IN ('weekly','always_open','by_appointment')),
 CONSTRAINT service_hours_time_zone CHECK ((kind = 'weekly') = (time_zone IS NOT NULL)));
-- A service can state several areas, but not the same one twice.
ALTER TABLE oran.service_area DROP CONSTRAINT service_area_service_id_key, ADD CONSTRAINT service_area_service_extent UNIQUE (service_id, extent);
-- ORAN extension: the kind of named area a service_area row states.
CREATE TABLE oran.service_area_kind (
 service_area_id uuid PRIMARY KEY REFERENCES oran.service_area(id) ON DELETE CASCADE,
 kind text NOT NULL,
 CONSTRAINT service_area_kind_kind CHECK (kind IN ('zip','city','county','state','nationwide')));
INSERT INTO oran.service_area_kind (service_area_id, kind) SELECT id, 'zip' FROM oran.service_area WHERE extent ~ '^[0-9]{5}$';
ALTER TABLE oran.location ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.location_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.service_at_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.address ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.phone ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.service_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE oran.service_area_kind ENABLE ROW LEVEL SECURITY;
