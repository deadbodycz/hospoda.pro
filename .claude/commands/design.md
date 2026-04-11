Otevři a analyzuj Stitch design předlohy pro danou obrazovku.

Použití: /design <název>
Hodnoty: onboarding | scan | users | counter

Postup:
1. Podle argumentu přečti odpovídající soubor z `design/stitch/`:
   - `onboarding` → `onboarding_pub_selection.html`
   - `scan`        → `scan_edit_menu.html`
   - `users`       → `add_users_table_setup.html`
   - `counter`     → `draught_counter.html`
2. Extrahuj přesné Tailwind třídy pro všechny klíčové komponenty na dané obrazovce.
3. Porovnej s aktuální implementací v `src/app/` a `src/components/`.
4. Vypiš odchylky — kde se implementace liší od Stitch předlohy.
5. Navrhni konkrétní opravy (s přesnými třídami ze Stitch), ale nič neopravuj, dokud uživatel nepotvrdí.
