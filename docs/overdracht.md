# Overdracht — opbouw en werkafspraken

Stand: 21-10-2026, versie 2026.43.0.
Dit document is het startpunt voor wie verder bouwt: hoe het in elkaar zit,
welke afspraken gelden, hoe je controleert en hoe je bouwt.

---

## 1. Opbouw

| Deel | Wat |
|---|---|
| `packages/core` | Rekenkern op mathjs: `parser.ts` (CalcPAD-achtige syntax), `evaluator.ts` (rekent, registreert de eigen functies), `renderer.ts` (HTML). Eigen oplossers: `ligger.ts` (ligger op 1–4 steunpunten, overstek, inklemming, gerber; Timoshenko optioneel), `raamwerk.ts` (vlakke raamwerken, α_cr), `doorsnede.ts` (samengestelde doorsneden). Bouwen: `npm --prefix packages/core run build`; desktop en scripts gebruiken `dist`. |
| `packages/desktop/src/templates` | De rekenbladen, elk als tekst (CalcPAD-achtig) in een TypeScript-string. Registratie in `index.ts`. |
| `packages/desktop/src/components/calc` | Parametrische beelden (`*Designer.tsx`), koppeling blad↔beeld (`designerKeuze.tsx`, via een herkenningstekst uit de titel), modulecatalogus met status (`projectTree.ts`), uitkomst van een blad (`bladResultaat.ts`), afdruk (`PrintDocument.tsx/.css`, `PrintBlad.tsx`, `paginering.ts`), rekenversie en bijwerken van bladen (`bladVersie.ts`, `BladBijwerken.tsx`). |
| `packages/desktop/src/rapport`, `components/rapport` | Constructierapport (hoofdstukken, uitgangspunten, belastingen met opbouwen en gewichtenbibliotheek `gewichten.ts`, bijlage A met de rekenbladen). |
| `packages/desktop/src/store` | Project (exemplaren/bladen, projectgegevens, rapport), projectbestand, undo. |
| `scripts/check-*.mjs` | Controles; `node scripts/check-alles.mjs` draait ze allemaal (nu 24 controles). |

## 2. Afspraken in de bladen

- **Tekst en rekenen**: regels met `'` zijn tekst/HTML, `#if/#else if/#else/#end if`, `#hide/#show`, `@select` voor keuzelijsten, `x = ?` voor invoer. mathjs kan geen tekst met `+` samenvoegen: gebruik `#if`-takken of losse tekstregels.
- **Slotregel**: `Maatgevende UC = … → … voldoet / voldoet niet`. `bladResultaat.leesResultaat` leest daaruit UC en oordeel voor de rapportkop. Kan het blad niet toetsen (onvolledige invoer), dan geen UC en een duidelijke melding; nooit een onterecht 'voldoet'.
- **Uitdraai kaal houden** (afdruk en rapportbijlage): koppen, invoer, formules met ingevulde waarden, tabellen, lijnen, UC's. Geen uitleg op papier.
  - Een prozaregel die helemaal cursief staat (`'<i>…</i>`) is uitleg: de kern geeft hem de klasse `calc-uitleg` en de afdruk laat hem weg. Een toelichting achter een formule langer dan 60 tekens ook.
  - `<i class="ook-afdruk">…</i>` houdt een cursieve regel op papier: gebruik dat voor *niet getoetst*, aannames en *buiten dit blad*.
  - `<span class="alleen-scherm"></span>` in een regel haalt de hele regel van papier; `<span class="alleen-scherm">…</span>` alleen dat stuk; `alleen-afdruk` omgekeerd.
  - `<span class="kolom-2|3|4"></span>` in de toelichting zet korte regels naast elkaar.
- **Rekenwijze**: de projectinstelling `rekenwijze` kiest op gemarkeerde punten tussen de referentie-uitwerking (1) en de norm (0). Een splitspunt heet `X_ref` / `X_nb` met `X = if(rekenwijze ≡ 1; X_ref; X_nb)`; `check-rekenwijze.mjs` bewaakt dat. Gebruik het achtervoegsel `_ref` voor niets anders. Bewuste afwijkingen staan in `docs/afwijkingen-referentie.md`.
- **Invoernamen** mogen niet gelijk zijn aan projectvariabelen (`CC`, `RC`, `DesignLife`, `K_FI`, `onderdeel`, `windgebied`, `terreincategorie`, `rekenwijze`, `locatie`, …); `check-projectvariabelen.mjs` bewaakt dat.
- **Bestaande bladen**: een blad bewaart zijn eigen kopie van de bladtekst. Met *Bladen bijwerken* gaat het naar de nieuwe tekst; bestaande invoer blijft, nieuwe velden krijgen hun beginwaarde. Kies nieuwe velden en beginwaarden zo dat een bijgewerkt oud blad **nooit stil gunstiger** uitkomt (nieuwe keuze standaard op het oude gedrag, of een veilige standaard). Beelden vullen hun `DEFAULTS` ook in bestaande bladen in (seed): een nieuwe standaardwaarde mag een oud blad niet stil veranderen.
- **Omhullende M- en V-lijn** (balklaag): per lijn twee doorgetrokken vlakken aan weerszijden van de as — het grootste veldmoment en het grootste steunmoment, +V en −V. Geen maatgevende waarde op een stippellijn. Een vrije puntlast staat per doorsnede op de ongunstigste plaats (`vrijePuntlast` in `balklaagLijnen.ts`, in het blad `eMx`/`eMn`/`eVx`/`eVn`), niet vast in het midden van een veld. De toets is nooit kleiner dan de lijn: `M_y,Ed` en `V_z,Ed` nemen ten minste de grootste waarde van de omhullende. `check-balklaag-omhullende.mjs` bewaakt dit tegen een onafhankelijke stijfheidsmatrix.
- **Getallen voor een beeld**: een beeld leest de uitkomsten van zijn blad onafgerond (`waarde` op de knoop, via `leesGetallen`), niet de op vier cijfers afgeronde tekst; anders komt een nagerekende lijn een cijfer naast de waarde in de kop uit.

## 3. Normen

- Eurocodes met de Nederlandse nationale bijlagen (NEN-EN 1990 t/m 1997 + NB, NEN 9997-1). Waar de norm-stand rekent, volgt hij de NB; bijvoorbeeld k_cr = 1,0 voor prismatische houten liggers (NB bij 6.1.7(2)).
- **Normtekst nooit in de repo**: alleen artikel-, formule- en tabelnummers. Controleren gebeurt tegen lokale normteksten van de gebruiker, die niet in de repo staan.
- Editie en nationale bijlage moeten per project worden vastgesteld.
- Het tabblad *Normbestanden* bewaart eigen PDF's met normnummer en editie in de lokale applicatieopslag (IndexedDB). Deze bestanden gaan niet mee in een projectbestand of de repository. De tool toont de bron voor handmatige controle en leidt er geen rekenwaarden of conformiteit uit af.
- Waar een waarde niet uit de beschikbare tekst te onderbouwen was, is die **invoer** met een korte uitleg op het scherm, of staat de toets als *niet getoetst* op het blad.

## 4. Controleren

```
node scripts/check-alles.mjs
cd packages/desktop && npx tsc --noEmit -p .
```

- Een module heeft een eigen check met handberekeningen (als commentaar bij de verwachting) en vaak een onafhankelijke uitwerking in het script zelf. Verwachtingen alleen aanpassen met een handberekening die aantoont dat de nieuwe waarde juist is.
- `check-renders.mjs` rekent elk blad met elke keuze uit de keuzelijsten; `check-designerkeuze.mjs` controleert blad↔beeld; `check-blad-bijwerken.mjs` het bijwerken.
- Afdruk als PDF (dev-server `npm run dev --workspace=@openaec/structural-calculation-studio`, poort 3021): `node scripts/rapport-pdf.mjs <project.json> <uit.pdf>`. Voor een proefproject met alleen `templateId`'s: `--beginwaarden`, anders rekenen bladen met een beeld met lege invoer.
- Prestaties van de rekenkern en de volgende matrixproef: [rekenkern-prestaties.md](rekenkern-prestaties.md). Herhaal de warme meting met `node scripts/bench-rekenkern.mjs` na het bouwen van de core.
- Werkwijze die fouten vond die de eigen checks misten: na het bouwen van een module rekent een tweede, onafhankelijke controle minstens twee gevallen met de hand na en zoekt gericht naar een onterecht 'voldoet'.

## 5. Bouwen en uitbrengen

- Versie (jaar.week.volgnummer) op zeven plekken: `packages/desktop/package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, de desktop-regel in `package-lock.json`, de app-regel in `src-tauri/Cargo.lock`, en de versieregel in `src/i18n/locales/{nl,en}/common.json`.
- Installer: `npm run tauri build` in `packages/desktop`. WebView2 wordt meegebundeld (`webviewInstallMode` embedBootstrapper, `WebView2Loader.dll` in `bundle.resources`).
- Draait de gebouwde app nog, dan houdt die `target/release/WebView2Loader.dll` vast en faalt de build: bouw dan met een eigen `CARGO_TARGET_DIR` (bijvoorbeeld `src-tauri/target-installer`, niet in git).

## 6. Modules

Status in de catalogus: *gereed* (gecalibreerd op referentiebladen), *controleren* (toetsing compleet en nagerekend, nog niet tegen referentiebladen gelegd), *hoeveelhedenraming* (nagerekende hoeveelheden zonder constructieve sterktetoets).

| Groep | Modules |
|---|---|
| Hout | Balklaag (houten vloerbalken: enkelvoudige ligger, overstek, twee velden, raveelbalk; vijf belastinggevallen, omhullende M- en V-lijn, trillingen, oplegdruk, kip) |
| Bibliotheek | CalcPAD-syntaxdemo |

De toetsing van de balklaag staat in [balklaag-toetsing.md](balklaag-toetsing.md),
de bewuste splitspunten tussen referentie-uitwerking en norm in
[afwijkingen-referentie.md](afwijkingen-referentie.md).

Een nieuwe module bestaat uit een rekenblad in `packages/desktop/src/templates`
(geregistreerd in `index.ts`), een regel in de catalogus (`projectTree.ts`), zo
nodig een parametrisch beeld (`*Designer.tsx`, gekoppeld in
`designerKeuze.tsx`), een catalogusbeeld en een eigen `scripts/check-<module>.mjs`.

## 7. Open punten

Zie [backlog.md](backlog.md): IFC-export en rapportengine.
