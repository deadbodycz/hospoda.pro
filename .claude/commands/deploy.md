Nasaď aktuální kód na Vercel přes GitHub.

Postup:
1. Spusť `git status` — ujisti se, že nejsou uncommitted změny. Pokud jsou, zastav a upozorni uživatele.
2. Spusť `npm run build` — nasadit broken build je zakázáno.
3. Spusť `git log --oneline origin/main..HEAD` — ukaž, co se bude nasazovat.
4. Zeptej se uživatele na potvrzení: "Chceš pushnout tyto commity na main a spustit Vercel deploy?"
5. Po potvrzení spusť `git push origin main`.
6. Vercel automaticky zachytí push. Řekni uživateli, aby zkontroloval deploy na https://vercel.com/dashboard nebo přímo na hospoda.pro.

Poznámka: Nikdy nepoužívej `--force` push na `main`.
