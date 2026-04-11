Vygeneruj PWA ikony pro hospoda.pro.

Projekt potřebuje `public/icon-192.png` a `public/icon-512.png`.

Postup:
1. Zkontroluj, zda soubory již existují v `public/`. Pokud ano, zastav a reportuj.
2. Vygeneruj SVG ikonu pro hospoda.pro:
   - Pozadí: `#131412` (tmavé)
   - Symbol: sklenice piva `local_bar` nebo stylizované "H"
   - Barva symbolu: `#ffbe5b` (amber/primary)
   - Tvar: zaoblené čtverce (rounded square)
3. Použij `sharp` nebo `canvas` (pokud je k dispozici) k vygenerování PNG souborů,
   nebo vygeneruj inline SVG a uloži jako:
   - `public/icon.svg` — základní SVG
   - `public/icon-192.png` — 192×192px PNG
   - `public/icon-512.png` — 512×512px PNG
4. Pokud není k dispozici nástroj pro konverzi, vytvoř alespoň SVG a instruuj uživatele,
   jak konvertovat na PNG (doporučení: Squoosh, SVGR, nebo online converter).
