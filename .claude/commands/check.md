Zkontroluj zdraví projektu:

1. Spusť `npm run build` a zachyť výstup. Pokud build selže, oprav všechny chyby a spusť znovu.
2. Spusť `npx tsc --noEmit` a oprav všechny TypeScript chyby.
3. Zkontroluj, zda existuje `.env.local` — pokud ne, upozorni uživatele, ale nepokračuj s buildem jako by chyběl.
4. Zkontroluj, zda jsou v `public/` soubory `icon-192.png` a `icon-512.png`. Pokud ne, napiš upozornění.
5. Shrň výsledky ve formě checklistu: ✓ (OK) nebo ✗ (chyba + popis).
