# Backlog — vastgelegde vervolgstappen

Punten die bewust naar later zijn geschoven, met de reden erbij. Geen
wensenlijst: alles hier is een besluit dat al genomen is, alleen nog niet
uitgevoerd.

De stand van zaken staat in [overdracht.md](overdracht.md).

---

## 1. IFC-export — wat er na de projectbrede export nog open staat

| | |
|---|---|
| Modules | `packages/core/src/ifc-generator.ts`, de export in `CalcTab` |
| Vastgelegd | 25-08-2026 |

Sinds 25-08-2026 schrijft `Opslaan` het héle project als één IFCX (en STEP),
met een element per exemplaar. Wat daarna nog open staat, met de volledige
uitleg in [ifc-export.md](ifc-export.md):

1. **Namespace voor toetsresultaten.** `properties` en `verification` zijn nu
   kale sleutels. OpenAEC werkt met namespaces per domein. Ga na of er al een
   afspraak ligt; zo niet, dan is dit programma de eerste die er een nodig
   heeft.
2. **Detectiedekking.** De valse positieven zijn eruit (zie ifc-export.md),
   maar de herkenning kent drie soorten: paal, fundering, balk. Kolommen,
   wanden en verbindingen worden niet herkend. Uitbreiden vraagt
   domeinkennis, geen giswerk.
3. **Bladen zonder eigen element** leveren nog niets in de IFCX, ook niet
   gekoppeld. Hangt af van punt 1.
4. **Model inladen en elementen aanwijzen.** Het veld `elementen` bestaat, er
   is nog geen manier om het te vullen. Vraagt een viewer-component.
5. **Geometrie.** Bestaat niet in dit programma en zou nieuwe invoer vragen.

---

## 2. De Rust-rapportengine is niet aangesloten

| | |
|---|---|
| Modules | `lib/documentToReport.ts`, `tauri/pdfReport.ts`, `src-tauri/Cargo.toml` |
| Vastgelegd | 25-08-2026 |

Afdrukken loopt sinds 25-08-2026 via de browser (`components/calc/PrintDocument.tsx`),
niet via `openaec-core`. Twee redenen:

1. **De engine gooit tekeningen weg.** `documentToReport` slaat svg- en
   image-knopen over — *"skipped (out-of-scope for PDF)"*. Een blad met
   `@svg` of `@img(` verliest daarmee al zijn tekeningen. Voor een constructieberekening is dat niet acceptabel.
2. **De app is er niet mee te bouwen.** `Cargo.toml` heeft een pad-afhankelijk-
   heid `openaec-core = { path = "../../../../openaec-reports/..." }`. Zonder
   die zusterrepo faalt `cargo build`, en daarmee de hele desktop-app — niet
   alleen de PDF.

`documentToReport.projectToReport` en `savePdfReport` staan er nog; ze worden
alleen niet aangeroepen.

### Wat de proef van 25-08-2026 opleverde

De engine is die dag voor het eerst echt gedraaid, met een wegwerp-crate die
`generate_pdf_bytes` aanroept op de `ReportData` die dit programma zelf
opbouwt. Bevindingen, van hard naar zacht:

1. **Hij is nooit aangeroepen geweest.** Wij stuurden `status: "draft"`, maar
   het schema kent alleen `CONCEPT` / `DEFINITIEF` / `REVISIE`. Serde weigert
   dat, dus élke aanroep zou op de eerste regel zijn omgevallen. Dit is op
   25-08-2026 gerepareerd in `documentToReport.ts`.

2. **De engine heeft assets nodig die niet in de crate zitten.** Zonder
   `OPENAEC_TENANT_DIR`, `OPENAEC_TENANTS_ROOT` en `OPENAEC_FONTS_DIR` (of een
   werkmap ín de reports-monorepo) levert hij 12 lege pagina's van 14 kB. Mét
   die verwijzingen: 868 kB, 13 pagina's, 7 ingesloten fonts, echte getallen.
   Voor een Tauri-app betekent dat: de tenant-map (fonts + template-YAML's)
   moet worden meegeleverd en die omgevingsvariabelen moeten worden gezet.

3. **Maar de uitdraai is nog geen berekening.** Er komen alleen de
   rekentabellen uit — geen voorblad, geen kopjes, geen proza, en geen
   variabelenamen. Je leest `150 mm | 150 mm | mm` zonder te weten dat het
   `D_eq` is. Van de zeven ingesloten fonts wordt er één gebruikt: er staat
   werkelijk niets anders in. Wisselen naar de template `structural_report`
   maakte geen verschil.

4. **Onze converter dubbelt de eenheid.** `result` bevat al "150 mm" en er gaat
   apart nog `unit: "mm"` mee; de engine drukt allebei af.

5. **Er is meer mogelijk dan wij gebruiken.** Het schema kent een `ImageBlock`
   (`src` als pad, URL of base64 — dus tekeningen kúnnen mee) en een
   `CheckBlock` met `description`, `required_value`, `calculated_value`,
   `unity_check` en `limit`. Dat laatste is precies een Eurocode-toetsing; onze
   converter maakt van alles een `calculation`-blok.

**Conclusie:** de engine werkt, maar onze kant ervan is half af. Om deze weg
bruikbaar te maken is nodig: variabelenamen en proza meegeven, `CheckBlock`
gebruiken voor unity checks, tekeningen als `ImageBlock`, de dubbele eenheid
eruit, en de tenant-assets meeleveren. Tot die tijd is afdrukken via de browser
de betere uitdraai — die heeft de tekeningen en de opmaak al.

Punt 2 is op 25-08-2026 opgelost: `openaec-core` is nu een **optionele
git-afhankelijkheid** op de publieke repo in plaats van een pad naar een
zusterrepo. `cargo build` werkt daarmee overal zonder die repo; met
`--features rapportengine` komt de engine mee. Wat nog nodig is om de engine
weer als PDF-weg te gebruiken: een blokvorm in het ReportData-schema waarmee
een tekening of afbeelding mee kan.

Bevestigd op 25-08-2026 met Rust 1.98.0 (MSVC): `cargo check` slaagt zonder de
feature (de app bouwt dus op zichzelf), `cargo check --features rapportengine`
haalt `openaec-core` en `openaec-layout` van commit `3a5fa40a` en compileert
mee, en `cargo build` linkt de binary. `ReportData` en `generate_pdf_bytes`
bestaan nog zoals `lib.rs` ze aanroept.
