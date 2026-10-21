# Splitspunten tussen de referentie-uitwerking en de norm

Bij het calibreren van de modules op de referentiebladen komen soms
verschillen naar boven waarbij het referentieprogramma aantoonbaar iets anders
doet dan de Eurocode. Dit register houdt bij wáár dat gebeurt, wat het verschil
bij een concrete invoer betekent, en welke van de twee lezingen het blad volgt.

## Hoe het werkt

**De referentie-uitwerking is het rekenprogramma dat we vandaag hanteren en is daarom de
standaard.** De reden is nuchter: elke uitkomst in die stand is tegen een
referentieblad na te rekenen. De norm-tak heeft per definitie geen referentie —
er bestaat geen referentie-uitwerking van wat de Eurocode zou geven — en is
daarom alleen op eindigheid en op de richting van het verschil te controleren.

Elk blad rekent op zo'n punt **allebei** uit en kiest er één:

```
X_nb  = …                                 volgens de norm
X_ref = …                                 volgens de referentie-uitwerking
X     = if(rekenwijze ≡ 1; X_ref; X_nb)   de gehanteerde waarde
```

De keuze staat op één regel, nooit binnen een tussenformule — zo blijft de
rekengang leesbaar en zie je in één oogopslag waar de twee lezingen
uiteenlopen. Meestal is dat de laatste stap vóór de u.c. Drukt het blad
tussenwaarden af die van de keuze afhangen, dan staat de keuze zo vroeg dat
elke afgedrukte regel rekenkundig klopt. Is het
splitspunt geen waarde maar een toets die in één stand niet meedoet, dan zet
het blad die toets op `rekenwijze` aan of uit. `rekenwijze` komt uit de
**projectgegevens** en geldt dus voor het hele project; de gekozen stand staat
op de afdruk in de projectkop.

Drie controles bewaken dit:

| script | wat het bewaakt |
|---|---|
| `check-rekenwijze.mjs` | elke `_ref`- of `_nb`-tak bereikt een schakelaar, direct of via een tussenstap. Een tak die wordt uitgerekend, netjes wordt afgedrukt en nergens meetelt, valt hier door. |
| `check-projectvariabelen.mjs` | geen blad zet `rekenwijze` als eigen invoerveld neer |
| de module-controlescripts | draaien elke referentieset twee keer: in de referentiestand moet **élke** waarde exact kloppen, in de norm-stand wordt op eindigheid en op de richting van het verschil getoetst, en waar een handberekening bestaat ook op het getal |

In de referentiestand staat er **geen enkele afwijking open** in de
controlescripts: elk splitspunt is een gewone toets.

Waar dit naartoe gaat: dit programma wordt uiteindelijk onafhankelijk van
de referentie-uitwerking. De norm-tak is de kant die dan overblijft, en draait daarom nu al
mee in plaats van als voetnoot te verstoffen.

Status: **open** = nog te bespreken · **vastgesteld** = keuze staat, blijft zo ·
**vervallen** = bij nader inzien geen afwijking; het nummer blijft staan. De
nummers zijn vast, zodat verwijzingen vanuit de code blijven kloppen.

---

## 8. Balklaag — eigen gewicht met 550 kg/m³ en g = 10 m/s²

| | |
|---|---|
| Module | Balklaag (`templates/balklaag.ts`) |
| Norm | NEN-EN 338 (ρ_mean per sterkteklasse) + NEN-EN 1991-1-1 |
| Referenties | document1 t/m document9 (alle negen) |
| Status | **vastgesteld** — splitspunt: de referentiestand rekent met 550 kg/m³ en g = 10 m/s², de norm-stand met ρ_mean uit EN 338 en g = 9,81 m/s² |

De referentie-uitwerking drukt de juiste ρ_mean af in de materiaaltabel — 420 kg/m³ voor C24 —
en rekent het eigen gewicht vervolgens met **550 kg/m³**:

```
71×221:  A = 15691 mm²  →  G = 8,63 kg/m     (15691 × 550e-9 = 8,63; met 420: 6,59)
96×271:  A = 26016 mm²  →  G = 14,31 kg/m    (26016 × 550e-9 = 14,31)
```

document7 laat zien dat die 550 een **vaste constante** is en niet aan de
sterkteklasse hangt: GL24h heeft dezelfde ρ_mean van 420 kg/m³, en het blad
houdt onveranderd 8,63 kg/m aan. document9 bevestigt de constante op een derde
doorsnede: 71×146 geeft 10366 × 550e-9 = 5,70 kg/m.

Daarbovenop rekent de referentie-uitwerking met **g = 10 m/s²** in plaats van 9,81:

```
8,63 kg/m × 10 = 0,0863 kN/m  →  afgedrukt als 0,086
8,63 kg/m × 9,81 = 0,0847 kN/m  →  zou 0,085 zijn geweest
```

**Gevolg** — het verschil zit alleen in de permanente lijnlast en werkt door in
u_g,k, w_fin en de UGT. Op het basisgeval (document1, 71×221 C24):

| grootheid | norm-stand | referentiestand |
|---|---|---|
| eigen gewicht balk | **0,0647 kN/m** | 0,0863 kN/m (afgedrukt 0,086) |
| u_g,k | **8,01 mm** | 8,27 mm |
| w_fin | **27,76 mm** | 28,17 mm |
| UC doorbuiging | **1,374** | 1,395 (afgedrukt 1,39) |
| UC buiging | **0,886** | 0,896 (afgedrukt 0,90) |

In de referentiestand komen alle negen referentiebladen exact uit. Het
grootste deel van het verschil zit in de dichtheid (420 tegen 550 kg/m³), een
klein deel in g.

---

## 9. Balklaag — de BGT toetst de geconcentreerde last niet

| | |
|---|---|
| Module | Balklaag (`templates/balklaag.ts`) |
| Norm | NEN-EN 1995-1-1 §2.2.3 + §7.2 |
| Referenties | document1 t/m document9 |
| Status | **vastgesteld** — splitspunt: de referentiestand telt in de BGT alleen de verdeelde last, de norm-stand de grootste van de verdeelde last en de puntlast |

De referentie-uitwerking rekent `u_Q,k` uit — de doorbuiging door de geconcentreerde last —
en gebruikt hem daarna nergens. In de UGT wórden beide combinaties uitgewerkt
(permanent + q, en permanent + Q); in de BGT verschijnt alleen de q-variant.

Op document1 is dat niet onschuldig:

```
q-variant:  1,60 × 8,27 + 1,18 × 12,66 = 28,17 mm   (afgedrukt)
Q-variant:  1,60 × 8,27 + 1,18 ×  5,97 = 20,28 mm   (niet afgedrukt)
grens:      0,004 × 5050                = 20,20 mm
```

De Q-variant zákt dus ook, met 20,28 > 20,20 — je ziet het alleen niet. Op deze
negen bladen is de q-variant altijd maatgevend, dus het eindantwoord verandert
er nergens door, maar dat is toeval van de invoer.

**Ons blad** telt in de referentiestand alleen `u_q,k`, zoals de
referentie-uitwerking. In de norm-stand neemt het `u_var = max(u_q,k; u_Q,k)`
en toetst het dus beide; is de puntlast maatgevend, dan staat de zakking in
het punt waar de eindstand met de puntlast het grootst is. Op alle negen
referenties is de q-variant maatgevend en geven beide standen hetzelfde u_var.

Hetzelfde speelt een verdieping lager in de UGT: de referentie-uitwerking kiest
daar de maatgevende combinatie op de **grootste M**, niet op de grootste u.c.
Dat gaat mis zodra de twee combinaties in een verschillende
belastingsduurklasse vallen — een puntlast is vaak "Kort" (k_mod 0,90) en de
UDL "Middellang" (0,80), en dan kan de kleinere M de grotere u.c. geven. Ons
blad rekent de UGT-combinaties met één k_mod, uit de keuzelijst
*Belastingsduurklasse (maatgevend variabel)*, en kiest daardoor in beide
standen ook op de grootste M; dat is geen splitspunt. Staan de puntlast en de
verdeelde last in een verschillende duurklasse, dan ligt de keuzelijst op de
langste van de twee aan de veilige kant. Op deze negen bladen is de
UDL-combinatie steeds maatgevend.

---

## Weergavefouten (geen rekengevolg)

Deze zijn puur cosmetisch aan de kant van de referentie-uitwerking, maar goed om te kennen bij het
lezen van een referentieblad:

- **Balklaag** — `V_Q,k` wordt afgedrukt als de **onverminderde** Q_k (2,00 kN),
  dus zonder de concentratiefactor k_r. document3 maakt dat hard: daar is
  F_Q,k = 1,34 kN, staat er `V_Q,k = 2,00 kN`, en rekent de UGT-combinatie
  eronder met 1,34 (`1,20 × 1,73 + 1,50 × 1,34 = 4,08`). De gedrukte waarde
  hoort bij geen van beide en wordt nergens gebruikt.
- **Balklaag** — de u.c. bij buiging is niet te reproduceren uit de gedrukte
  operanden: `13,2 / 14,8` geeft 0,89, het blad drukt 0,90 af. Er wordt intern
  met 13,229 / 14,769 = 0,8957 gerekend. Reken na met de onafgeronde waarden.
- **Balklaag** — in de k_mod-tabel staat achter elke waarde een tweede getal
  tussen haakjes (klasse 1: `0,60(0,50) 0,80(0,65) 0,90(0,80)`; klasse 3:
  `0,50(0,40) 0,65(0,55) 0,70(0,65)`). Die tweede kolom wordt op geen van de
  negen bladen gebruikt — gerekend wordt altijd met de eerste, en die klopt met
  Tabel 3.1. Wat de haakjes betekenen is onbekend.

---

## Werkwijze

Alle gecalibreerde modules hebben een controlescript in `scripts/`. Samen te
draaien met:

```
npm run check
```

Dat bouwt de core en draait elk `scripts/check-*.mjs`: per gecalibreerde
module één, plus de algemene bewakers zoals `check-afkortingen`,
`check-designerkeuze`, `check-renders` en `check-projectvariabelen` (die
laatste bewaakt de grens tussen projectgegevens en bladinvoer — zie
`docs/projectmodel.md`).
Elk script zet de invoer van de referentiebladen in de module en vergelijkt de
tussenstappen met het afgedrukte getal; de tolerantie volgt uit de
gedocumenteerde precisie, dus `96` toetst op ±0,5 en `45,7` op ±0,05. De
punten uit dít register lopen via de schakelaar: in de referentiestand zijn
het gewone toetsen, in de norm-stand controleert `toetsNormStand` (in
`scripts/lib/refcheck.mjs`) eindigheid en richting, aangevuld met
handberekeningen waar die er zijn. De parameter `afwijkend` van `toets()`
blijft bestaan voor een verschil dat nog geen schakelaar heeft: dat wordt
gemeld maar telt niet als fout.

Een ander gereedschap beantwoordt een andere vraag: `npm run snapshot` haalt
alle rekenbladen door parse → evaluate → render, zodat je vóór en ná een
wijziging in `packages/core` kunt vergelijken. Dat zegt "er is niets
veranderd"; de controlescripts zeggen "het klopt nog met het referentieblad".
Je hebt ze allebei nodig.

Bij een nieuwe afwijking:

1. Reken in het blad beide lezingen uit (`X_nb`, `X_ref`) en kies op één regel
   met `if(rekenwijze ≡ 1; X_ref; X_nb)`; `check-rekenwijze.mjs` controleert
   dat elke tak een schakelaar bereikt.
2. Toets in het controlescript (`check-<module>.mjs`) de referentiestand exact
   tegen het referentieblad en de norm-stand met `toetsNormStand`, zo mogelijk
   met een handberekening.
3. Voeg een `#if`-blok toe dat in de referentiestand het verschil meldt zodra
   het bij die invoer optreedt.
4. Noteer hem hier, met module, normartikel, referentiebladen en het
   getalsmatige gevolg.
