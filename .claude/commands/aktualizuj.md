Projdi si poslední změny v kódu a strukturu projektu a aktualizuj soubor CLAUDE.md.

Postup:

1. Spusť `git log --oneline -20` a `git diff HEAD~5 HEAD -- package.json` abys zjistil, co se nedávno změnilo.
2. Přečti aktuální `package.json` a identifikuj všechny knihovny, které nejsou uvedeny v CLAUDE.md (sekce technický stack).
3. Projdi strukturu složek (`app/`, `lib/`, `components/`, `supabase/migrations/`) a zjisti, zda přibyly nové moduly nebo soubory.
4. Přečti aktuální `CLAUDE.md` a aktualizuj tyto sekce:
   - **Technický stack** — doplň nové knihovny nebo technologie
   - **Co je hotové** — přidej nové moduly, pokud chybí
   - **Databázové schema** — doplň nové tabulky z posledních migrací
   - **Klíčové implementační detaily** — doplň nová pravidla nebo pasti, na které jsme narazili v aktuální session
   - **Co zbývá implementovat** — odškrtni dokončené položky, případně přidej nové
5. Zachovej stávající formát, stručnost a přehlednost dokumentu.
6. Po aktualizaci CLAUDE.md proveď commit: `git add CLAUDE.md && git commit -m "docs: aktualizace CLAUDE.md"` a push.
