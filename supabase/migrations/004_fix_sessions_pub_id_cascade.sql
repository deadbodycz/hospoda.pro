-- sessions.pub_id mělo NO ACTION místo CASCADE.
-- Oprava: drop + recreate s ON DELETE CASCADE.

ALTER TABLE sessions
  DROP CONSTRAINT sessions_pub_id_fkey;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_pub_id_fkey
    FOREIGN KEY (pub_id)
    REFERENCES pubs(id)
    ON DELETE CASCADE;
