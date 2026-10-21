/**
 * check-balklaag-omhullende — tekenen het balklaagbeeld en het blad de juiste
 * omhullende M-lijn en V-lijn?
 *
 * De omhullende staat per lijn in twee vlakken aan weerszijden van de as,
 * beide doorgetrokken: voor het moment onder de as het grootste veldmoment en
 * boven de as het grootste steunmoment, voor de dwarskracht boven de as de
 * grootste positieve en onder de as de grootste negatieve waarde, over de
 * UGT-combinaties (6.10a en 6.10b). Drie manieren zijn fout:
 *   - alleen het algebraïsche maximum doortrekken: bij een steunpunt toont dat
 *     de lichtste combinatie, en het maatgevende steunmoment hangt dan aan een
 *     stippellijn;
 *   - per x de grootste absolute waarde: waar de positieve en de negatieve
 *     grens even groot zijn, springt die lijn van + naar − zonder dat daar
 *     een last of oplegging zit;
 *   - de puntlast vast in het midden van een veld: de lijn springt dan in het
 *     midden van elk veld, ook waar het schema geen last tekent, en is voor de
 *     dwarskracht bij de opleggingen te klein. De puntlast is een vrije last
 *     en staat per doorsnede op de ongunstigste plaats.
 *
 * Handberekening, schema 1 (twee steunpunten), L = 5 m:
 *   g = 0,5·0,45 + 0,2 = 0,425 kN/m, q = 2,55·0,45 = 1,1475 kN/m, F = 3 kN
 *   6.10b met de verdeelde last: w = 1,2·0,425 + 1,5·1,1475 = 2,23125 kN/m
 *     V(0) = w·L/2 = 5,578 kN,  M(L/2) = w·L²/8 = 6,973 kNm
 *   6.10b met de vrije puntlast, last op de doorsnede zelf:
 *     M(x) = 1,2·0,425·x·(L − x)/2 + 1,5·3·x·(L − x)/L
 *     M(L/2) = 0,51·6,25/2 + 4,5·1,25 = 1,594 + 5,625 = 7,219 kNm  (maatgevend)
 *     V(0)   = 1,2·0,425·5/2 + 1,5·3·1 = 1,275 + 4,5 = 5,775 kN    (maatgevend)
 *     V(L/2) = 0 + 4,5·½ = +2,25 kN met de last vlak rechts, −2,25 kN met de
 *     last vlak links: beide helften lopen door, zonder sprong in het midden
 *   → onder de as 7,219 kNm in het midden; boven de as +5,775 kN bij de eerste
 *     oplegging, onder de as −5,775 kN bij de tweede.
 *
 * Voorbeeld met twee velden (5,05 + 3,00 m, 63×211, h.o.h. 610 mm,
 * G_k = 0,5, Q_k = 2,55 kN/m², F_k = 3 kN, CC2), nagerekend met de
 * drie-momentenvergelijking: P_g,k = 0,3718, q_q,k = 1,556 kN/m.
 *   veld 1, 6.10b, q op veld 1: w = 2,780 kN/m, M_B = (2,780·5,05³ +
 *     0,446·3³)/(8·8,05) = 5,747 kNm, R_A = 2,780·5,05/2 − 5,747/5,05 =
 *     5,882 kN, M_veld = R_A²/(2·w) = 6,22 kNm
 *   steun, 6.10b, q op beide velden: M_B = 2,780·(5,05³ + 3³)/(8·8,05) =
 *     6,72 kNm; V links van B = −(2,780·5,05/2 + 6,72/5,05) = −8,35 kN
 *   → het steunmoment 6,72 kNm is het maatgevende moment van het blad en
 *     staat op de hoofdlijn, gelijk aan M_y,Ed.
 *
 * De toets volgt de omhullende. De tabel van het blad zet de puntlast midden
 * in het veld of op het uiteinde van het overstek en telt hem voor de
 * dwarskracht één keer; in twee gevallen geeft de vrije puntlast meer:
 *   - overstek langer dan het veld (L = 1,00 m, a = 1,50 m): de last op het
 *     uiteinde geeft in het veld V = F·a/L = 1,5·F. Links van het
 *     middensteunpunt: |V| = γ_G·(g·L/2 + g·a²/(2·L)) + γ_Q·F·a/L;
 *   - een kort veld naast een lang veld (0,50 + 3,50 m): het veldmoment in
 *     het lange veld is het grootst met de last op de doorsnede zelf, en die
 *     doorsnede ligt niet in het midden. Op afstand t van de eindoplegging:
 *     M(t) = γ_G·(R_C·t − g·t²/2) + γ_Q·F·(t·(L₂ − t)/L₂ − t²·(L₂² − t²)/(2·L₂²·(L₁ + L₂)))
 *     met R_C = g·L₂/2 − M_B,g/L₂ en M_B,g = g·(L₁³ + L₂³)/(8·(L₁ + L₂));
 *     de top ligt hier bij t ≈ 1,34 m, niet in het midden (1,75 m).
 * M_y,Ed en V_z,Ed zijn daarom ten minste de grootste waarde van de lijn.
 *
 * De invloed van de vrije puntlast wordt vergeleken met een onafhankelijke
 * uitwerking: de ligger als stijfheidsmatrix, de last op 600 plaatsen plus
 * vlak links, vlak rechts en op de doorsnede zelf.
 *
 * Draaien: node scripts/check-balklaag-omhullende.mjs
 */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const ts = createRequire(import.meta.url)(join(repo, "node_modules", "typescript"));
const bron = readFileSync(join(repo, "packages/desktop/src/components/calc/balklaagLijnen.ts"), "utf8");
const map = mkdtempSync(join(tmpdir(), "omhullende-"));
const pad = join(map, "balklaagLijnen.mjs");
writeFileSync(pad, ts.transpileModule(bron, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText);
const m = await import(pathToFileURL(pad).href);
rmSync(map, { recursive: true, force: true });

let fout = 0;
const toets = (ok, tekst) => { console.log(`  ${ok ? "OK  " : "FOUT"}  ${tekst}`); if (!ok) fout++; };
const bijna = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

for (const naam of ["omhullende", "vrijePuntlast", "helften"]) {
  if (typeof m[naam] !== "function") {
    toets(false, `balklaagLijnen.ts exporteert ${naam}()`);
    process.exit(1);
  }
}

const factoren = { gG: 1.2, gQ: 1.5, gGa: 1.35, gQa: 1.5 * 0.4 };
const LASTEN = { g: 0.5 * 0.45 + 0.2, q: 2.55 * 0.45, F: 3 };

// ── onafhankelijk: de ligger als stijfheidsmatrix ─────────────────────────
/**
 * Moment en dwarskracht door een last van 1 op de plaats p. Buigligger met
 * twee vrijheidsgraden per knoop (zakking, hoekverdraaiing), knopen op de
 * opleggingen, het uiteinde en de last; de reacties volgen uit K·u − F. Het
 * teken van V is dat van lijnen(): de som van de krachten links van de snede.
 */
function eenheidslast(g, p) {
  const tot = m.totaal(g);
  const steunen = g.schema === 3 ? [0, g.L1, tot] : [0, g.L1];
  const xs = [...new Set([...steunen, tot, p])].sort((a, b) => a - b);
  const n = 2 * xs.length;
  const K = Array.from({ length: n }, () => new Array(n).fill(0));
  const F = new Array(n).fill(0);
  for (let e = 0; e < xs.length - 1; e++) {
    const L = xs[e + 1] - xs[e];
    const k = [
      [12 / L ** 3, 6 / L ** 2, -12 / L ** 3, 6 / L ** 2],
      [6 / L ** 2, 4 / L, -6 / L ** 2, 2 / L],
      [-12 / L ** 3, -6 / L ** 2, 12 / L ** 3, -6 / L ** 2],
      [6 / L ** 2, 2 / L, -6 / L ** 2, 4 / L],
    ];
    const d = [2 * e, 2 * e + 1, 2 * e + 2, 2 * e + 3];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) K[d[i]][d[j]] += k[i][j];
  }
  F[2 * xs.indexOf(p)] = -1;
  const vast = steunen.map((s) => 2 * xs.indexOf(s));
  const vrij = [...Array(n).keys()].filter((i) => !vast.includes(i));
  const N = vrij.length;
  const A = vrij.map((i) => [...vrij.map((j) => K[i][j]), F[i]]);
  for (let c = 0; c < N; c++) {
    let piv = c;
    for (let r = c + 1; r < N; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = c + 1; r < N; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k <= N; k++) A[r][k] -= f * A[c][k];
    }
  }
  const u = new Array(n).fill(0);
  for (let c = N - 1; c >= 0; c--) {
    let s = A[c][N];
    for (let k = c + 1; k < N; k++) s -= A[c][k] * u[vrij[k]];
    u[vrij[c]] = s / A[c][c];
  }
  const R = vast.map((i) => K[i].reduce((s, kij, j) => s + kij * u[j], 0) - F[i]);
  return {
    M: (x) => steunen.reduce((s, xs_, i) => s + (xs_ < x ? R[i] * (x - xs_) : 0), 0) - (p < x ? x - p : 0),
    V: (x) => steunen.reduce((s, xs_, i) => s + (xs_ < x ? R[i] : 0), 0) - (p < x ? 1 : 0),
  };
}

/** Uiterste invloed op de plaats x: het raster van lastplaatsen plus de last op en vlak naast x. */
function invloedNumeriek(g, raster, x) {
  const tot = m.totaal(g);
  const d = tot * 1e-7;
  const extra = [x - d, x, x + d].filter((p) => p > 0 && p <= tot && (g.schema === 2 || p < tot)).map((p) => eenheidslast(g, p));
  const alle = [...raster, ...extra];
  const ms = alle.map((o) => o.M(x)), vs = alle.map((o) => o.V(x));
  return { Mmax: Math.max(0, ...ms), Mmin: Math.min(0, ...ms), Vmax: Math.max(0, ...vs), Vmin: Math.min(0, ...vs) };
}

const GEVALLEN = [
  { titel: "schema 1, 5,00 m", g: { schema: 1, L1: 5, a: 0, L2: 0, EI: 1000 } },
  { titel: "schema 2, overstek 4,20 + 0,80 m", g: { schema: 2, L1: 4.2, a: 0.8, L2: 0, EI: 1000 } },
  { titel: "schema 2, overstek 3,00 + 1,50 m (trek in de eerste oplegging)", g: { schema: 2, L1: 3.0, a: 1.5, L2: 0, EI: 1000 }, trek: true },
  { titel: "schema 2, overstek 2,00 + 2,60 m (langer dan het veld)", g: { schema: 2, L1: 2.0, a: 2.6, L2: 0, EI: 1000 }, trek: true },
  { titel: "schema 3, twee velden 4,00 + 3,00 m", g: { schema: 3, L1: 4, a: 0, L2: 3, EI: 1000 } },
  { titel: "schema 3, twee velden 3,60 + 3,60 m zonder puntlast", g: { schema: 3, L1: 3.6, a: 0, L2: 3.6, EI: 1000 }, lasten: { ...LASTEN, F: 0 } },
  { titel: "schema 3, twee velden 3,00 + 4,50 m", g: { schema: 3, L1: 3, a: 0, L2: 4.5, EI: 1000 } },
  { titel: "schema 3, twee velden 1,00 + 6,00 m", g: { schema: 3, L1: 1, a: 0, L2: 6, EI: 1000 } },
  { titel: "schema 3, twee velden 6,00 + 1,00 m", g: { schema: 3, L1: 6, a: 0, L2: 1, EI: 1000 } },
];

// ── de vrije puntlast: gesloten uitdrukkingen tegen de stijfheidsmatrix ───
console.log("Vrije puntlast — top en dal van de invloedslijn per doorsnede:");
for (const { titel, g } of GEVALLEN) {
  const tot = m.totaal(g);
  const NP = 600;
  const raster = [];
  for (let i = 1; i < NP; i++) raster.push(eenheidslast(g, (tot * i) / NP));
  if (g.schema === 2) raster.push(eenheidslast(g, tot));
  const eta = m.vrijePuntlast(g);
  let grootste = 0, waar = "";
  for (let k = 1; k < 160; k++) {
    const x = (tot * k) / 160 + tot * 1.7e-5;      // niet op een oplegging
    const num = invloedNumeriek(g, raster, x);
    for (const naam of ["Mmax", "Mmin", "Vmax", "Vmin"]) {
      const d = Math.abs(eta[naam](x) - num[naam]);
      if (d > grootste) { grootste = d; waar = `${naam} bij x = ${x.toFixed(3)} m: ${eta[naam](x).toFixed(4)} tegen ${num[naam].toFixed(4)}`; }
    }
  }
  // Het dal van het moment ligt tussen twee rasterpunten: tweede orde klein.
  toets(grootste < 2e-4 * Math.max(tot, 1), `${titel}: gelijk aan de stijfheidsmatrix (grootste verschil ${grootste.toExponential(1)}${grootste >= 2e-4 ? `; ${waar}` : ""})`);
}

// ── schema 1: de handberekening ───────────────────────────────────────────
console.log("\nSchema 1 — handberekening:");
{
  const L = 5;
  const g = { schema: 1, L1: L, a: 0, L2: 0, EI: 1000 };
  const o = m.omhullende(g, LASTEN, factoren);
  const M = m.helften(o.Mmax, o.Mmin), V = m.helften(o.Vmax, o.Vmin);
  toets(bijna(M.boven(L / 2), 7.219), `veldmoment in het midden ${M.boven(L / 2).toFixed(3)} kNm = 7,219 kNm (vrije puntlast maatgevend)`);
  toets(bijna(M.onder(L / 2), 0) && bijna(M.onder(L), 0), "geen steunmoment: de helft boven de as blijft nul");
  toets(bijna(V.boven(0), 5.775), `boven de as bij de eerste oplegging ${V.boven(0).toFixed(3)} kN = +5,775 kN (puntlast bij de oplegging)`);
  toets(bijna(V.onder(L), -5.775), `onder de as bij de tweede oplegging ${V.onder(L).toFixed(3)} kN = −5,775 kN`);
  toets(bijna(V.onder(0), 0) && bijna(V.boven(L), 0), "geen trek in de opleggingen (onder 0 bij de eerste, boven 0 bij de tweede)");
  let anti = true;
  for (let i = 0; i <= 200; i++) {
    const x = (L * i) / 200;
    if (!bijna(V.boven(x), -V.onder(L - x))) anti = false;
  }
  toets(anti, "de helft boven de as is het spiegelbeeld van die onder de as");
  const e = 1e-7;
  toets(bijna(V.boven(L / 2 - e), 2.25) && bijna(V.boven(L / 2 + e), 2.25) && bijna(V.onder(L / 2 - e), -2.25) && bijna(V.onder(L / 2 + e), -2.25),
    `geen sprong in het midden: boven ${V.boven(L / 2 - e).toFixed(3)} → ${V.boven(L / 2 + e).toFixed(3)}, onder ${V.onder(L / 2 - e).toFixed(3)} → ${V.onder(L / 2 + e).toFixed(3)} kN`);
}

// ── alle schema's: opbouw van de omhullende, zonder sprongen ──────────────
console.log("\nOmhullende — opbouw uit de combinaties en de vrije puntlast:");
/** Plaatsen waar een grens tussen twee naburige punten springt, buiten de opleggingen. */
function sprongen(f, g, piek, n = 4000) {
  const tot = m.totaal(g);
  const vast = [0, g.L1, tot];
  const uit = [];
  for (let i = 0; i < n; i++) {
    const x0 = (tot * i) / n, x1 = (tot * (i + 1)) / n;
    if (vast.some((b) => b >= x0 - 1e-12 && b <= x1 + 1e-12)) continue;
    if (Math.abs(f(x1) - f(x0)) > 0.02 * piek) uit.push(x0);
  }
  return uit;
}
// De oude lijn (puntlast vast in het midden van het veld), alleen om te laten
// zien dat de sprongtoets zo'n sprong ook echt vangt.
let oudeSprongen = 0;
for (const { titel, g, lasten = LASTEN, trek } of GEVALLEN) {
  const tot = m.totaal(g);
  const o = m.omhullende(g, lasten, factoren);
  const M = m.helften(o.Mmax, o.Mmin), V = m.helften(o.Vmax, o.Vmin);
  const bg = m.belastinggevallen(g, lasten);
  const verdeeld = m.ugtCombinaties(bg, factoren).filter((c) => c.rij <= 3).map((c) => m.lijnen(g, c.set));
  const formules = [[factoren.gG, factoren.gQ], [factoren.gGa, factoren.gQa]];
  const perm = formules.map(([fG]) => m.lijnen(g, m.tel([[bg[1], fG]])));
  const raster = [];
  for (let i = 1; i < 600; i++) raster.push(eenheidslast(g, (tot * i) / 600));
  if (g.schema === 2) raster.push(eenheidslast(g, tot));
  let grootste = 0, helft = true;
  for (let k = 1; k < 120; k++) {
    const x = (tot * k) / 120 + tot * 1.7e-5;
    const num = invloedNumeriek(g, raster, x);
    const ref = {
      Mmax: Math.max(...verdeeld.map((c) => c.M(x)), ...formules.map(([, fQ], i) => perm[i].M(x) + fQ * lasten.F * num.Mmax)),
      Mmin: Math.min(...verdeeld.map((c) => c.M(x)), ...formules.map(([, fQ], i) => perm[i].M(x) + fQ * lasten.F * num.Mmin)),
      Vmax: Math.max(...verdeeld.map((c) => c.V(x)), ...formules.map(([, fQ], i) => perm[i].V(x) + fQ * lasten.F * num.Vmax)),
      Vmin: Math.min(...verdeeld.map((c) => c.V(x)), ...formules.map(([, fQ], i) => perm[i].V(x) + fQ * lasten.F * num.Vmin)),
    };
    for (const naam of ["Mmax", "Mmin", "Vmax", "Vmin"]) grootste = Math.max(grootste, Math.abs(o[naam](x) - ref[naam]));
    if (!bijna(M.boven(x), Math.max(0, o.Mmax(x)), 1e-12) || !bijna(M.onder(x), Math.min(0, o.Mmin(x)), 1e-12)) helft = false;
    if (!bijna(V.boven(x), Math.max(0, o.Vmax(x)), 1e-12) || !bijna(V.onder(x), Math.min(0, o.Vmin(x)), 1e-12)) helft = false;
  }
  toets(grootste < 2e-3, `${titel}: grootste en kleinste M en V gelijk aan combinaties + vrije puntlast (verschil ${grootste.toExponential(1)})`);
  toets(helft, `${titel}: de helften zijn max(0; grootste) en min(0; kleinste)`);
  if (trek) toets(V.onder(0) < -0.01 && V.boven(0) > 0.01, `${titel}: beide helften bij de eerste oplegging (${V.boven(0).toFixed(3)} en ${V.onder(0).toFixed(3)} kN)`);
  const piekV = Math.max(...[0, g.L1 - 1e-9, g.L1 + 1e-9, tot - 1e-9].map((x) => Math.max(V.boven(x), -V.onder(x))));
  const piekM = Math.max(...Array.from({ length: 401 }, (_, i) => Math.max(M.boven((tot * i) / 400), -M.onder((tot * i) / 400))));
  const s = [...sprongen(V.boven, g, piekV), ...sprongen(V.onder, g, piekV), ...sprongen(M.boven, g, piekM), ...sprongen(M.onder, g, piekM)];
  toets(s.length === 0, `${titel}: geen sprong buiten de opleggingen${s.length ? ` (bij x = ${s.slice(0, 3).map((x) => x.toFixed(3)).join(", ")} m)` : ""}`);
  const vast = m.ugtCombinaties(bg, factoren).map((c) => m.lijnen(g, c.set));
  oudeSprongen += sprongen((x) => Math.max(0, ...vast.map((c) => c.V(x))), g, piekV).length;
}
toets(oudeSprongen > 0, `controle zelf: de sprongtoets vangt de sprong van een puntlast vast in het midden (${oudeSprongen}×)`);

// ── het beeld: BalklaagDesigner tekent de twee helften ───────────────────
// De tekening zelf draait in React; hier alleen of de M-lijn en de V-lijn de
// omhullende uit balklaagLijnen.ts gebruiken, elk als twee doorgetrokken lijnen.
console.log("\nHet beeld:");
{
  const beeld = readFileSync(join(repo, "packages/desktop/src/components/calc/BalklaagDesigner.tsx"), "utf8");
  const lijnen = [...beeld.matchAll(/<KrachtenLijn\b[\s\S]*?\/>/g)].map((t) => t[0]);
  const mLijnen = lijnen.filter((t) => /kleur=\{KLEUR_M\}/.test(t));
  const vLijnen = lijnen.filter((t) => /kleur=\{KLEUR_V\}/.test(t));
  toets(/\bomhullende\(ligger, lasten,/.test(beeld) && /helften\(omh\.Mmax, omh\.Mmin\)/.test(beeld) && /helften\(omh\.Vmax, omh\.Vmin\)/.test(beeld),
    "BalklaagDesigner rekent beide lijnen met omhullende() en helften()");
  toets(mLijnen.length === 2 && /f=\{Momh\.boven\}/.test(mLijnen[0]) && /f=\{Momh\.onder\}/.test(mLijnen[1]),
    `twee M-lijnen: veldmoment en steunmoment (gevonden: ${mLijnen.length})`);
  toets(vLijnen.length === 2 && /f=\{Vomh\.boven\}/.test(vLijnen[0]) && /f=\{Vomh\.onder\}/.test(vLijnen[1]),
    `twee V-lijnen, boven en onder de as (gevonden: ${vLijnen.length})`);
  toets(lijnen.every((t) => !/\bstippel=/.test(t)), "alle lijnen doorgetrokken: geen maatgevende waarde op een stippellijn");
}

// ── het rekenblad zelf: de omhullende in §5 (SVG) ─────────────────────────
// Per lijn twee doorgetrokken vlakken, elk aan zijn eigen kant van de as. De
// waarden in de figuur zijn die van de omhullende hierboven (met de lasten en
// factoren van het blad), ze overlappen elkaar en de titels niet en blijven
// binnen de tekening, ook bij een heel kort eerste of tweede veld. De lijn
// komt nergens boven de waarde waarmee het blad toetst.
console.log("\nHet rekenblad, §5.3:");
{
  const { parse, evaluate, render } = await import(pathToFileURL(join(repo, "packages/core/dist/index.js")).href);
  const { laadTemplate } = await import(pathToFileURL(join(repo, "scripts/lib/refcheck.mjs")).href);
  const BASIS = {
    profiel: "12", sterkteklasse: "2", klimaat: "1", duurklasse: "2", schema: "1", ligger: "1",
    L_d: "5000", a_opl: "50", hoh: "600", t_vloer: "18", E_beschot: "7000", b_vloer: "5",
    a_over: "0", L_veld2: "0", b_sparing: "0", l_staart: "0", b_ond: "0", b_zelf: "0", h_zelf: "0",
    G_k: "1.0", Q_k: "1.75", F_k: "2", belastingcat: "2",
    "ψ_0_zelf": "0", "ψ_2_zelf": "0", controleer: "1", grensfactor: "0.004",
    controleer_trilling: "0", "ζ": "0.01", a_tril: "1", b_tril: "120",
  };
  const VOORBEELD = {
    schema: "3", L_d: "5000", L_veld2: "3000", profiel: "10", b_zelf: "63", h_zelf: "211", hoh: "610",
    t_vloer: "25", G_k: "0.5", Q_k: "2.55", F_k: "3", belastingcat: "1",
  };
  const blad = parse(laadTemplate("balklaag.ts"));
  const punten = (s) => s.trim().split(/\s+/).map((p) => p.split(",").map(Number));
  // Tekstvak van een label, 11 px vet: ongeveer 5,6 px per teken, 8 px hoog.
  const vak = (t) => {
    const b = 5.6 * t.tekst.length;
    const x0 = t.anker === "end" ? t.x - b : t.anker === "middle" ? t.x - b / 2 : t.x;
    return { x0, x1: x0 + b, y0: t.y - 8, y1: t.y + 1 };
  };
  function* knopen(lijst) {
    for (const n of lijst) {
      yield n;
      if (n.type === "conditional-branch") yield* knopen(n.children);
    }
  }

  for (const { titel, invoer, trekEerste, trekLaatste, verwacht, hand } of [
    { titel: "schema 1, 5,00 m", invoer: {} },
    { titel: "schema 2, overstek 3,00 + 1,50 m", invoer: { schema: "2", L_d: "2950", a_over: "1500" }, trekEerste: true },
    { titel: "schema 3, twee velden 3,00 + 4,50 m", invoer: { schema: "3", L_d: "2950", L_veld2: "4500" } },
    { titel: "schema 3, twee velden 1,00 + 6,00 m", invoer: { schema: "3", L_d: "950", L_veld2: "6000" }, trekEerste: true },
    { titel: "schema 3, twee velden 6,00 + 1,00 m", invoer: { schema: "3", L_d: "5950", L_veld2: "1000" }, trekLaatste: true },
    // Twee gevallen waarin de vrije puntlast meer geeft dan de tabel van het blad (zie de kop).
    { titel: "schema 2, overstek 1,00 + 1,50 m, grote puntlast", invoer: { schema: "2", L_d: "950", a_over: "1500", F_k: "7", Q_k: "0.5" },
      hand: (u, g) => ({ V_z_Ed: u["γ_G"] * (u.P_g_k * g.L1 / 2 + u.P_g_k * g.a ** 2 / (2 * g.L1)) + u["γ_Q"] * u.F_Q_k * g.a / g.L1 }) },
    { titel: "schema 3, twee velden 0,50 + 3,50 m, grote puntlast", invoer: { schema: "3", L_d: "450", L_veld2: "3500", F_k: "7", Q_k: "0.5", G_k: "0.3" },
      hand: (u, g) => {
        const n = g.L1 + g.L2, gk = u.P_g_k;
        const Rc = (gk * g.L2) / 2 - (gk * (g.L1 ** 3 + g.L2 ** 3)) / (8 * n) / g.L2;
        let top = 0;
        for (let t = 0; t <= g.L2; t += 0.0005) {
          const invloed = (t * (g.L2 - t)) / g.L2 - (t * t * (g.L2 ** 2 - t * t)) / (2 * g.L2 ** 2 * n);
          top = Math.max(top, u["γ_G"] * (Rc * t - (gk * t * t) / 2) + u["γ_Q"] * u.F_Q_k * invloed);
        }
        return { M_y_Ed: top };
      } },
    { titel: "voorbeeld, twee velden 5,05 + 3,00 m", invoer: VOORBEELD, trekLaatste: true,
      verwacht: { M: [6.22, 2.183, -6.723], V: [5.88, -8.349, 6.41, -3.483], MyEd: 6.723 } },
  ]) {
    const waarden = { ...BASIS, ...invoer };
    const nodes = evaluate(blad, waarden, { CC: 2, K_FI: 1, rekenwijze: 1 });
    const html = render(nodes);
    const uit = {};
    for (const n of knopen(nodes)) {
      if ((n.type === "assignment" || n.type === "var-display") && typeof n.waarde === "number") uit[n.name] = n.waarde;
    }
    const svg = /<svg class="omhullende"[\s\S]*?<\/svg>/.exec(html)?.[0] ?? "";
    const mVlakken = [...svg.matchAll(/<polygon points="([^"]+)" style="(fill:rgba\(239,68,68,[^"]*)"/g)];
    const vlakken = [...svg.matchAll(/<polygon points="([^"]+)" style="(fill:rgba\(59,130,246,[^"]*)"/g)];
    if (vlakken.length !== 2 || mVlakken.length !== 2) {
      toets(false, `blad ${titel}: twee M-vlakken en twee V-vlakken in de SVG van §5 (gevonden: ${mVlakken.length} en ${vlakken.length})`);
      continue;
    }
    toets([...mVlakken, ...vlakken].every((v) => !v[2].includes("dasharray")), `blad ${titel}: alle vlakken doorgetrokken`);
    const [mv, ms] = mVlakken.map((v) => punten(v[1]));
    const mAs = mv[0][1];
    toets(mv.every(([, y]) => y >= mAs - 0.01) && ms.every(([, y]) => y <= mAs + 0.01),
      `blad ${titel}: veldmoment nergens boven, steunmoment nergens onder de as`);
    const [bp, op] = vlakken.map((v) => punten(v[1]));
    const as = bp[0][1];
    toets(bp.every(([, y]) => y <= as + 0.01) && op.every(([, y]) => y >= as - 0.01),
      `blad ${titel}: positieve helft nergens onder, negatieve nergens boven de as`);
    // Geen sprong in de dwarskracht binnen een veld: de stap tussen twee
    // naburige punten blijft klein tegenover de grootste waarde.
    const hoogte = Math.max(...bp.map(([, y]) => as - y), ...op.map(([, y]) => y - as));
    const binnen = (vlak) => vlak.slice(1, -1).every(([, y], i, rij) => i === 0 || i === 26 || Math.abs(y - rij[i - 1][1]) <= 0.2 * hoogte);
    toets(binnen(bp) && binnen(op), `blad ${titel}: geen sprong in de V-lijn binnen een veld`);

    // De waarden in de figuur. Randpunten van de vlakken: 1 = begin,
    // 26 = links van de tweede oplegging, 27 = rechts ervan, 52 = eind van veld 2.
    const alleTeksten = [...svg.matchAll(/<text x="([^"]+)" y="([^"]+)"([^>]*)>([^<]*)<\/text>/g)]
      .map((t) => ({ x: Number(t[1]), y: Number(t[2]), anker: /text-anchor="(\w+)"/.exec(t[3])?.[1] ?? "start", tekst: t[4], v: Number(t[4]), blauw: t[3].includes("fill:#2563eb") }));
    const teksten = alleTeksten.filter((t) => t.blauw && Number.isFinite(t.v));
    const mTeksten = alleTeksten.filter((t) => !t.blauw && Number.isFinite(t.v));
    const titels = alleTeksten.filter((t) => !Number.isFinite(t.v));
    toets(titels.length === 2 && titels[0].tekst === "M-lijn [kNm]" && titels[1].tekst === "V-lijn [kN]",
      `blad ${titel}: alleen de titels M-lijn en V-lijn als tekst (gevonden: ${titels.map((t) => t.tekst).join(" | ")})`);
    const randen = [[1, "eerste oplegging"], [26, "tweede oplegging (links)"]];
    if (waarden.schema === "3") randen.push([27, "tweede oplegging (rechts)"], [52, "derde oplegging"]);
    else if (waarden.schema === "2") randen.push([27, "tweede oplegging (rechts)"]);
    for (const [vlak, teken, naam] of [[bp, 1, "positief"], [op, -1, "negatief"]]) {
      for (const [k, plek] of randen) {
        const [px, py] = vlak[k];
        if (Math.abs(as - py) < 1) continue;
        const t = teksten.find((t) => Math.abs(t.x - px) <= 15 && Math.abs(t.y - py) <= 20 && Math.sign(t.v) === teken && Math.sign(as - t.y) === teken);
        toets(!!t, `blad ${titel}: waarde ${naam} bij de ${plek}${t ? ` (${t.v} kN)` : " ontbreekt"}`);
      }
    }

    // Dezelfde omhullende als het beeld, met de lasten en factoren van het blad.
    const g = {
      schema: Number(waarden.schema), EI: 1000,
      L1: (Number(waarden.L_d) + Number(waarden.a_opl)) / 1000,
      a: waarden.schema === "2" ? Number(waarden.a_over) / 1000 : 0,
      L2: waarden.schema === "3" ? Number(waarden.L_veld2) / 1000 : 0,
    };
    const tot = m.totaal(g);
    const o = m.omhullende(g, { g: uit.P_g_k, q: uit.q_q_k, F: uit.F_Q_k },
      { gG: uit["γ_G"], gQ: uit["γ_Q"], gGa: uit["γ_G_a"], gQa: uit["γ_Q_a"] });
    const M = m.helften(o.Mmax, o.Mmin), V = m.helften(o.Vmax, o.Vmin);
    const top = (f, a, b) => Math.max(...Array.from({ length: 2001 }, (_, i) => f(a + ((b - a) * i) / 2000)));
    const e = tot * 1e-9;
    // Een moment kleiner dan 3 % van het grootste krijgt geen waarde in de figuur.
    const mAlle = [top(M.boven, 0, g.L1), tot > g.L1 ? top(M.boven, g.L1, tot) : 0, M.onder(g.L1)];
    const mRef = mAlle.filter((v) => Math.abs(v) > 0.03 * Math.max(...mAlle.map(Math.abs)));
    const vRef = [V.boven(0), V.onder(0), V.boven(g.L1), V.onder(g.L1),
      ...(tot > g.L1 ? [V.boven(g.L1 + e), V.onder(g.L1 + e)] : []),
      ...(g.schema === 3 ? [V.boven(tot - e), V.onder(tot - e)] : [])].filter((v) => Math.abs(v) > 0.006);
    const staat = (lijst, v) => lijst.some((t) => Math.abs(t.v - v) <= 0.003 * Math.abs(v) + 0.0006);
    const mist = [...mRef.filter((v) => !staat(mTeksten, v)).map((v) => `${v.toFixed(3)} kNm`), ...vRef.filter((v) => !staat(teksten, v)).map((v) => `${v.toFixed(3)} kN`)];
    toets(mist.length === 0 && mTeksten.length === mRef.length && teksten.length === vRef.length,
      `blad ${titel}: de waarden in de figuur zijn die van de omhullende (${mTeksten.length} + ${teksten.length} waarden${mist.length ? `; ontbreekt: ${mist.join(", ")}` : ""})`);
    if (verwacht) {
      toets(verwacht.M.every((v) => mTeksten.some((t) => bijna(t.v, v, 0.0015))) && verwacht.V.every((v) => teksten.some((t) => bijna(t.v, v, 0.0015))),
        `blad ${titel}: handberekening (${mTeksten.map((t) => t.tekst).join(", ")} kNm; ${teksten.map((t) => t.tekst).join(", ")} kN)`);
      const grootste = Math.max(...mTeksten.map((t) => Math.abs(t.v)));
      toets(bijna(uit.M_y_Ed, verwacht.MyEd, 0.0015) && bijna(grootste, verwacht.MyEd, 0.0015),
        `blad ${titel}: het maatgevende moment M_y,Ed = ${uit.M_y_Ed.toFixed(3)} kNm staat als steunmoment op de hoofdlijn`);
    }
    if (hand) {
      for (const [naam, v] of Object.entries(hand(uit, g))) {
        toets(bijna(uit[naam], v, 0.002 * v), `blad ${titel}: ${naam.replace(/_/g, ",").replace(",", "_")} = ${uit[naam].toFixed(3)} volgt de vrije puntlast (handberekening ${v.toFixed(3)})`);
      }
    }
    // De lijn blijft onder de waarde waarmee het blad toetst.
    const piekM = Math.max(...mRef.map(Math.abs), 0), piekV = Math.max(...vRef.map(Math.abs), 0);
    toets(piekM <= uit.M_y_Ed * 1.001 + 1e-6 && piekV <= uit.V_z_Ed * 1.001 + 1e-6,
      `blad ${titel}: de lijn komt niet boven M_y,Ed en V_z,Ed (${piekM.toFixed(3)} ≤ ${uit.M_y_Ed.toFixed(3)} kNm, ${piekV.toFixed(3)} ≤ ${uit.V_z_Ed.toFixed(3)} kN)`);

    const vakken = [...teksten, ...mTeksten, ...titels].map((t) => ({ t, ...vak(t) }));
    const botsing = [];
    for (let i = 0; i < vakken.length; i++) {
      for (let j = i + 1; j < vakken.length; j++) {
        const a = vakken[i], b = vakken[j];
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) botsing.push(`${a.t.tekst} en ${b.t.tekst}`);
      }
    }
    toets(botsing.length === 0, `blad ${titel}: waarden en titels overlappen niet${botsing.length ? ` (${botsing.join("; ")})` : ""}`);
    const [, , bw, bh] = (/viewbox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 0 0").split(/\s+/).map(Number);
    const buiten = vakken.filter((v) => v.x0 < 0 || v.x1 > bw || v.y0 < 0 || v.y1 > bh).map((v) => v.t.tekst);
    toets(buiten.length === 0, `blad ${titel}: waarden en titels binnen de tekening${buiten.length ? ` (buiten: ${buiten.join(", ")})` : ""}`);

    if (!invoer.schema) {
      const links = as - bp[1][1];
      const rechts = op[op.length - 2][1] - as;
      toets(links > 0 && rechts > 0 && Math.abs(links - rechts) <= 0.02 * links,
        `blad ${titel}: V-lijn antisymmetrisch (links ${links.toFixed(1)} px boven, rechts ${rechts.toFixed(1)} px onder de as)`);
    }
    if (trekEerste) toets(op[1][1] > as + 1, `blad ${titel}: trek in de eerste oplegging zichtbaar onder de as`);
    if (trekLaatste) toets(bp[52][1] < as - 1, `blad ${titel}: trek in de derde oplegging zichtbaar boven de as`);
  }
}

if (fout) {
  console.log(`\n${fout} fout(en)`);
  process.exit(1);
}
console.log("\nbalklaag omhullende: alles in orde");
