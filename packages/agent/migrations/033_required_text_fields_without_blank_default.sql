-- Required text fields lose their '' default.
--
-- Data Studio asks for a field nobody touched only when its column has no
-- default, and it counts only NULL as missing. A required field whose column
-- defaulted to '' passed the form untouched and reached the database, where a
-- not-blank check refused it. Stewards saw only "An unexpected error
-- occurred."
--
-- Without the default, the form refuses an untouched or emptied field. The
-- columns stay NOT NULL, so the Directus API also refuses a missing or null
-- value, with a readable validation error, for every caller. The not-blank
-- checks from migration 016 stay as the last line for writers outside
-- Directus.
--
-- No writer can depend on these defaults: the checks already refuse the ''
-- they supply. Existing rows are not touched.

alter table content.chapter_update_requests
  alter column title drop default,
  alter column summary drop default;

alter table content.chapter_update_request_links
  alter column label drop default,
  alter column url drop default;

alter table content.chapter_update_request_proof_signals
  alter column label drop default,
  alter column value drop default;

-- An initiative belongs to a chapter and a project to a guild, and the forms
-- now say so. Their foreign keys refuse '' (migration 011, and migration 012
-- wherever every project already had a guild).
alter table content.chapter_initiatives
  alter column chapter_slug drop default;

alter table content.projects
  alter column guild_slug drop default;

-- Not changed: chapter_update_request_links.chapter_slug and
-- chapter_update_request_proof_signals.chapter_slug keep their '' default.
-- The database fills them from the parent request (migration 027), and Data
-- Studio would ask for a value nobody can enter if they had none.
