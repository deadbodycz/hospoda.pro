Vytvoř git commit pro aktuální změny.

Postup:
1. Spusť `git status` a `git diff` abys pochopil, co je změněno.
2. Spusť `git log --oneline -5` abys viděl styl commitů v repozitáři.
3. Připrav zprávu commitu ve formátu Conventional Commits:
   - `feat:` nová funkce
   - `fix:` oprava chyby
   - `style:` vizuální/CSS změny bez logiky
   - `refactor:` refaktoring bez funkční změny
   - `docs:` dokumentace
   - `chore:` konfigurace, závislosti
   Příklad: `feat: přidat ScanModal s editací nápojů`
4. Přidej relevantní soubory (`git add <soubory>`) — ne `git add -A`, nikdy `.env.local`.
5. Proveď commit.
6. Zeptej se uživatele, zda chce také pushnout (`git push`).
