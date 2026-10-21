/**
 * Wachtpost bij een leeg invoerveld (`naam = ?…`) in de rekenkern.
 *
 * Maakt de gebruiker een veld leeg, dan komt er "" binnen. Met een eenheid
 * werd dat " kN": een eenheid zonder getal. Die rekende als 1 kN of gaf
 * verderop NaN en "unit with undefined value" ("Maatgevende UC = NaN"), en een
 * #if koos de verkeerde tak. Zonder eenheid bleef de naam ongedefinieerd.
 *
 * Afspraak (packages/core/src/evaluator.ts, case 'input-prompt'): een leeg
 * veld telt als 0 in de eenheid van het veld, net als een nieuw '?'-veld. Het
 * veld zelf blijft leeg. Dit script bewaakt dat op twee niveaus:
 *   1. een klein blad met velden met, zonder en met samengestelde eenheid,
 *      en met een eenheid met alleen een noemer (1/K);
 *   2. elk rekenblad: alle velden leeg rekent precies als alle velden 0, en
 *      de slotregel zegt dan nooit 'voldoet' (maar 'niet getoetst').
 *
 * Draaien:  node scripts/check-lege-invoer.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const hier = dirname(fileURLToPath(import.meta.url));
const TPL_DIR = join(hier, "../packages/desktop/src/templates");

let fouten = 0;
const meld = (ok, wat, detail = "") => {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK  " : "FOUT"} ${wat}${ok || !detail ? "" : "  -> " + detail}`);
};

/** Uitkomsten (naam → "getal eenheid") en de platte tekst van een doorgerekend blad. */
function doorreken(bron, waarden, scope) {
  const nodes = evaluate(parse(bron), waarden, scope);
  const uitkomsten = {};
  const velden = {};
  const loop = (lijst) => {
    for (const n of lijst) {
      if (n.type === "assignment" || n.type === "var-display") {
        uitkomsten[n.name] = String(n.result);
      }
      if (n.type === "input-prompt") velden[n.name] = n.currentValue;
      if (Array.isArray(n.children)) loop(n.children);
      if (Array.isArray(n.nodes)) loop(n.nodes);
    }
  };
  loop(nodes);
  const tekst = render(nodes).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { uitkomsten, velden, tekst };
}

/** Eerste verschil tussen twee doorrekeningen, of null als ze gelijk zijn. */
function verschil(a, b) {
  for (const naam of new Set([...Object.keys(a.uitkomsten), ...Object.keys(b.uitkomsten)])) {
    if (a.uitkomsten[naam] !== b.uitkomsten[naam]) {
      return `${naam}: ${a.uitkomsten[naam] ?? "—"} tegen ${b.uitkomsten[naam] ?? "—"}`;
    }
  }
  if (a.tekst !== b.tekst) {
    let i = 0;
    while (a.tekst[i] === b.tekst[i]) i++;
    return `tekst: …${a.tekst.slice(Math.max(0, i - 40), i + 40)}… tegen …${b.tekst.slice(Math.max(0, i - 40), i + 40)}…`;
  }
  return null;
}

// ── 1. Klein blad ────────────────────────────────────────────────────────────
console.log("Klein blad — leeg, spaties en een half getal tellen als 0:");
const KLEIN = `N = ?kN
q = ?*(kN/m)
n = ?
p = ?*(mm)
α_T = ? 1/K
N
q
n
p
α_T
x = N + 2kN
z = n + 1
ε_T = α_T*(20 K)
#if p > 0 mm
'tak: p groter dan 0
#else
'tak: p is 0
#end if
`;
// In het veld met eenheid 1/K werd "-" eerder `- 1/K` (-1 K⁻¹) en "K" werd
// `K 1/K` (het getal 1): de eenheid bevat zelf een getal.
const nul = doorreken(KLEIN, { N: "0", q: "0", n: "0", p: "0", α_T: "0" });
meld(
  nul.uitkomsten.N === "0 kN" && nul.uitkomsten.q === "0 kN / m" && nul.uitkomsten.n === "0" &&
    nul.uitkomsten.p === "0 mm" && nul.uitkomsten.α_T === "0 1 / K" && nul.uitkomsten.ε_T === "0" &&
    nul.uitkomsten.x === "2 kN" && nul.tekst.includes("tak: p is 0"),
  "velden op 0 rekenen als 0 in hun eenheid",
  JSON.stringify(nul.uitkomsten),
);
for (const [wat, waarden] of [
  ["niets ingevuld (nieuw blad)", {}],
  ["alle velden leeg", { N: "", q: "", n: "", p: "", α_T: "" }],
  ["alle velden alleen spaties", { N: " ", q: "  ", n: " ", p: "\t", α_T: " " }],
  ["half getal of alleen een teken", { N: "-", q: ",", n: "-", p: ".", α_T: "-" }],
  ["alleen een plus", { N: "+", q: "+", n: "", p: "+", α_T: "+" }],
  ["alleen een eenheid getypt", { N: "kN", q: "kN", n: "", p: "mm", α_T: "K" }],
]) {
  const r = doorreken(KLEIN, waarden);
  const d = verschil(nul, r);
  meld(d === null && !/NaN|undefined|niet gedefinieerd|Error/.test(r.tekst), wat, d ?? r.tekst.slice(0, 160));
}
const leeg = doorreken(KLEIN, { N: "", q: "", n: "", p: "", α_T: "" });
meld(
  Object.values(leeg.velden).every((v) => v === ""),
  "een leeg veld blijft leeg (currentValue)",
  JSON.stringify(leeg.velden),
);
// α_T·ΔT = 1,2·10⁻⁵ K⁻¹ · 20 K = 2,4·10⁻⁴, dimensieloos.
const ingevuld = doorreken(KLEIN, { N: "5", q: "1,5", n: "3", p: "12,5", α_T: "0,000012" });
meld(
  ingevuld.uitkomsten.N === "5 kN" && ingevuld.uitkomsten.q === "1.5 kN / m" &&
    ingevuld.uitkomsten.n === "3" && ingevuld.uitkomsten.p === "12.5 mm" &&
    ingevuld.uitkomsten.α_T === "1.200e-5 1 / K" && ingevuld.uitkomsten.ε_T === "2.400e-4" &&
    ingevuld.tekst.includes("tak: p groter dan 0"),
  "ingevulde waarden (ook met decimale komma) ongewijzigd",
  JSON.stringify(ingevuld.uitkomsten),
);

// ── 2. Elk rekenblad: leeg ≡ 0 ───────────────────────────────────────────────
console.log("\nElk rekenblad — alle invoervelden leeg rekent als alle velden 0:");
const GEEN_BLAD = new Set(["index.ts", "calcpad-includes.ts", "calcpad-samples.ts", "nl-windgebieden.ts"]);

/** Projectgegevens zoals de app ze vóór de eerste regel in de scope zet (als check-renders). */
function projectScope() {
  const src = readFileSync(join(hier, "../packages/desktop/src/store/projectGegevens.ts"), "utf8");
  const scope = {};
  const veld = /naam:\s*"([^"]+)"[\s\S]*?type:\s*"(keuze|tekst)"[\s\S]*?standaard:\s*"([^"]*)"/g;
  for (const [, naam, type, standaard] of src.matchAll(veld)) {
    const n = parseFloat(standaard);
    scope[naam] = type === "keuze" && Number.isFinite(n) ? n : standaard;
  }
  const cc = typeof scope.CC === "number" ? scope.CC : 2;
  scope.K_FI = cc === 1 ? 0.9 : cc === 3 ? 1.1 : 1.0;
  return scope;
}
const SCOPE = projectScope();

/**
 * Bladen die bij lege invoer terecht 'voldoet' zeggen: hun belasting en maten
 * zijn vaste voorbeeldwaarden, geen invoervelden.
 */
const VOORBEELD = new Set([]);
/** Een slotregel met een positief oordeel. */
const voldoet = (tekst) =>
  [...tekst.matchAll(/Maatgevende UC[^→]{0,40}→[^.]{0,120}/g)]
    .map((m) => m[0])
    .find((r) => /voldo(et|en)(?!s+niet)/.test(r) && !/niet getoetst|niet bepaald/.test(r));

let bladen = 0;
let afwijkend = 0;
let onterecht = 0;
for (const bestand of readdirSync(TPL_DIR).filter((f) => f.endsWith(".ts") && !GEEN_BLAD.has(f)).sort()) {
  const src = readFileSync(join(TPL_DIR, bestand), "utf8");
  for (const [, naam, tpl] of src.matchAll(/export const (\w+) = `([\s\S]*?)`;/g)) {
    const velden = new Set();
    for (const m of tpl.matchAll(/^\s*([^\s='#]+)\s*=\s*\?/gmu)) velden.add(m[1].replace(/,/g, "_"));
    if (velden.size === 0) continue;
    bladen++;
    const opNul = {}, opLeeg = {};
    for (const v of velden) { opNul[v] = "0"; opLeeg[v] = ""; }
    let d;
    let oordeel;
    try {
      const leeg = doorreken(tpl, opLeeg, SCOPE);
      d = verschil(doorreken(tpl, opNul, SCOPE), leeg);
      oordeel = voldoet(leeg.tekst);
    } catch (e) {
      d = `gooit: ${String(e.message).slice(0, 120)}`;
    }
    if (d !== null) {
      afwijkend++;
      meld(false, `${bestand} :: ${naam}`, d);
    }
    if (oordeel && !VOORBEELD.has(`${bestand} :: ${naam}`)) {
      onterecht++;
      meld(false, `${bestand} :: ${naam} zegt 'voldoet' bij lege invoer`, oordeel.slice(0, 120));
    }
  }
}
meld(afwijkend === 0, `${bladen} rekenbladen met invoervelden: leeg en 0 geven dezelfde uitkomsten en tekst`);
meld(onterecht === 0, `geen van de ${bladen} rekenbladen zegt 'voldoet' bij lege invoer`);

console.log(
  fouten === 0
    ? "\nEen leeg invoerveld rekent overal als 0 in zijn eenheid."
    : `\n${fouten} controle(s) gezakt.`,
);
process.exit(fouten === 0 ? 0 : 1);
