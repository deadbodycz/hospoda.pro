-- Změna drink_logs.drink_id:
--   NOT NULL + ON DELETE RESTRICT  →  nullable + ON DELETE SET NULL
--
-- Důvod: mazání nápojů z ceníku selhalo pokud existovaly záznamy pití
--        (RESTRICT constraint). S SET NULL záznamy zůstanou (účet je přesný),
--        jen odkaz na nápoj zmizí.

ALTER TABLE drink_logs
  ALTER COLUMN drink_id DROP NOT NULL;

-- Přejmenování staré constraint (Supabase ji generuje jako drink_logs_drink_id_fkey)
ALTER TABLE drink_logs
  DROP CONSTRAINT IF EXISTS drink_logs_drink_id_fkey;

ALTER TABLE drink_logs
  ADD CONSTRAINT drink_logs_drink_id_fkey
    FOREIGN KEY (drink_id)
    REFERENCES drinks(id)
    ON DELETE SET NULL;
