BEGIN;

CREATE FUNCTION generate_league_slug(league_name text) RETURNS text
LANGUAGE sql VOLATILE AS $$
  SELECT COALESCE(NULLIF(trim(BOTH '-' FROM regexp_replace(
    translate(replace(replace(lower(league_name), 'œ', 'oe'), 'æ', 'ae'),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
      'aaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', '-', 'g')), ''), 'ligue') || '-' || gen_random_uuid()::text;
$$;

ALTER TABLE league ADD COLUMN slug varchar(190);
UPDATE league SET slug = generate_league_slug(name);
ALTER TABLE league ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX uq_league_slug ON league(slug);
ALTER TABLE league ADD CONSTRAINT ck_league_slug
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

CREATE FUNCTION preserve_league_slug() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.slug := generate_league_slug(NEW.name);
  ELSIF NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'The public league slug is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_league_slug
  BEFORE INSERT OR UPDATE ON league
  FOR EACH ROW EXECUTE FUNCTION preserve_league_slug();

COMMIT;
