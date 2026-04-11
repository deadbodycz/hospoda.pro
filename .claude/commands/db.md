Zkontroluj nebo vygeneruj Supabase databázové migrace.

Postup:
1. Přečti sekci "Supabase schéma" v CLAUDE.md — to je zdrojová pravda.
2. Projdi složku `supabase/migrations/` (pokud existuje) a zjisti, které tabulky jsou již migrovány.
3. Porovnej s CLAUDE.md schématem a identifikuj chybějící tabulky nebo sloupce.
4. Pokud existuje `supabase/` složka a Supabase CLI, vygeneruj migraci příkazem:
   `npx supabase migration new <nazev_migrace>`
   a vyplň SQL dle CLAUDE.md schématu.
5. Pokud složka `supabase/` neexistuje, vytvoř `supabase/migrations/` a soubor
   `001_initial_schema.sql` s kompletním SQL dle CLAUDE.md schématu.
6. Vypiš výsledek — co bylo vytvořeno nebo co chybí.

Poznámka: Row Level Security (RLS) není v aktuální specifikaci — nevytvářej RLS políčky, dokud není explicitně požadováno.
