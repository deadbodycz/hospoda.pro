# Design: Uložení fotky ceníku

## Kontext

Po naskenování ceníku se fotka ihned zahodí — slouží pouze jako vstup pro OCR. Uživatel chce mít možnost se na naskenovanou fotku kdykoliv podívat přímo ze stránky nastavení hospody, například pro ověření, že ceny byly správně rozpoznány. Fotka se vztahuje k hospodě (ne k session), ukládá se vždy jen nejnovější sken a smaže se při vymazání ceníku nebo uzavření účtu.

## Úložiště

**Supabase Storage** — bucket `menu-photos` (public), soubor `{pubId}.jpg`.

- Při novém skenu se soubor přepíše (`upsert: true`).
- Public URL se uloží do nového sloupce `menu_photo_url text` v tabulce `pubs`.
- Při smazání se soubor odstraní ze Storage a sloupec se nastaví na `null`.

## Datová vrstva

### Migrace `supabase/migrations/005_add_menu_photo_url_to_pubs.sql`
```sql
ALTER TABLE pubs ADD COLUMN menu_photo_url text;
```

### Typ `Pub` (`src/types/index.ts`)
Přidat pole `menu_photo_url: string | null`.

## Upload (`src/app/[pubId]/scan/page.tsx`)

Po úspěšném volání `/api/scan` (před zobrazením `ScanModal`):

1. Konvertovat base64 string na `Blob` (typ `image/jpeg`).
2. Nahrát do Storage: `supabase.storage.from('menu-photos').upload('{pubId}.jpg', blob, { upsert: true, contentType: 'image/jpeg' })`.
3. Získat public URL: `supabase.storage.from('menu-photos').getPublicUrl('{pubId}.jpg')`.
4. Uložit URL: `updatePub({ menu_photo_url: publicUrl })`.

Chyba uploadu je nevýznamná — sken pokračuje normálně, jen bez uložené fotky (tiché selhání, bez toastu).

## Smazání

### `clearAllDrinks` (`src/contexts/SessionContext.tsx`)
Po smazání nápojů:
```ts
await supabase.storage.from('menu-photos').remove([`${pub.id}.jpg`])
await supabase.from('pubs').update({ menu_photo_url: null }).eq('id', pub.id)
```
Aktualizovat lokální state: `dispatch({ type: 'UPDATE_PUB', payload: { menu_photo_url: null } })`.

### `closeSession` (`src/contexts/SessionContext.tsx`)
Totéž jako u `clearAllDrinks` — smazat soubor ze Storage a nullovat sloupec.

## Zobrazení (`src/app/[pubId]/settings/page.tsx`)

Pod hlavičkou sekce CENÍK (řádek se „Smazat vše" / „Přeskenovat"), pokud `pub.menu_photo_url !== null`:

```tsx
<a href={pub.menu_photo_url} target="_blank" rel="noopener noreferrer">
  <img
    src={pub.menu_photo_url}
    alt="Fotka ceníku"
    className="w-full rounded-xl object-cover max-h-48 mb-3"
  />
</a>
```

Pokud `menu_photo_url` je `null`, blok se nezobrazí.

## Supabase Storage bucket setup

Bucket `menu-photos` je potřeba vytvořit v Supabase dashboardu (Storage → New bucket → název `menu-photos`, Public: zapnuto). Není součástí SQL migrací.

## Ověření

1. Spustit migraci a ověřit sloupec v tabulce `pubs`.
2. Vytvořit bucket `menu-photos` v Supabase dashboardu.
3. Naskenovat ceník → ověřit, že soubor vznikl v Storage a URL je uložena v DB.
4. Přejít na Nastavení → thumbnail fotky se zobrazí.
5. Kliknout na thumbnail → otevře se plná fotka v nové záložce.
6. Kliknout „Smazat vše" → thumbnail zmizí, soubor je smazán ze Storage.
7. Zavřít session (Účet → Uzavřít) → thumbnail zmizí, soubor je smazán ze Storage.
