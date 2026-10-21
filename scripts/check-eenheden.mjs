/**
 * Eenheden met alleen een noemer, zoals een uitzettingscoëfficiënt in 1/K of
 * 1/degC (issue #13). De rekenwaarde was goed, maar de weergave niet:
 *   1. de uitkomst viel terug op het automatisch gekozen voorvoegsel van de
 *      rekenbibliotheek (12 MK⁻¹) en toonde dan "12 1/K";
 *   2. in de ingevulde formule stond "1.200e-5 1 / K": twee getallen achter
 *      elkaar, die de formuleopmaak niet kan lezen. Dan kwam de ruwe tekst in
 *      beeld, als "(1.200e−51/K)∗(20K)";
 *   3. een uitkomst in e-notatie stond er als "1.200e−5", met een min die als
 *      aftrekking oogt;
 *   4. een invoerveld met eenheid 1/K verloor zijn eenheid, waarna α·ΔT de
 *      eenheid K kreeg in plaats van dimensieloos te zijn;
 *   5. omrekenen met `to 1/degC` gaf een foutmelding.
 * En wat er bij het herstel nog misging:
 *   6. degC in een samengestelde noemer (W/(m·degC)) bleef "degC" in beeld,
 *      met de haakjes om de noemer aan de letters vast;
 *   7. `to 1/m/s` werd omgerekend naar s/m in plaats van 1/(m·s);
 *   8. "-" in een invoerveld met eenheid 1/K rekende als -1 K⁻¹ in plaats van
 *      als 0, en "K" als het getal 1.
 *
 * Handberekening (het blad uit de melding):
 *   α_T = 0,000012 K⁻¹ = 1,2·10⁻⁵ K⁻¹,  ΔT = 20 K,  L = 5 m
 *   ε_T = α_T·ΔT = 1,2·10⁻⁵ · 20 = 2,4·10⁻⁴ (dimensieloos)
 *   ΔL  = ε_T·L  = 2,4·10⁻⁴ · 5000 mm = 1,2 mm
 * Een temperatuurverschil van 1 K is even groot als 1 °C. Per graad Celsius
 * gelden dus dezelfde getallen, en 1,2·10⁻⁵ K⁻¹ omgerekend naar 1/degC blijft
 * 1,2·10⁻⁵.
 *
 * Draaien:  node scripts/check-eenheden.mjs
 * Vereist een gebouwde core:  npm --prefix packages/core run build
 */
import { parse, evaluate, render } from "../packages/core/dist/index.js";
import { evaluate as mathEvaluate } from "mathjs";

let fouten = 0;
const meld = (ok, wat, detail = "") => {
  if (!ok) fouten++;
  console.log(`  ${ok ? "OK  " : "FOUT"} ${wat}${ok || !detail ? "" : "  -> " + detail}`);
};
const ongeveer = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

/** Toewijzingen per naam, met de LaTeX van de gerenderde regel erbij. */
function doorreken(bron, waarden = {}) {
  const nodes = evaluate(parse(bron), waarden);
  const regels = {};
  for (const n of nodes) {
    if (n.type !== "assignment") continue;
    const html = render([n]);
    const latex = (html.match(/<annotation encoding="application\/x-tex">([\s\S]*?)<\/annotation>/) ?? [])[1] ?? "";
    regels[n.name] = { ...n, waarde: Number.parseFloat(n.result), latex: latex.replace(/&amp;/g, "&") };
  }
  return regels;
}

// ─── 1. De eenvoudige vorm: rekenwaarde en eenheid ──────────────────
console.log("Rekenwaarde en eenheid van α = 10⁻⁵ per graad:");
for (const eenheid of ["K", "degC"]) {
  const r = doorreken(`alpha = 1e-5 / ${eenheid}\ndelta = 20 ${eenheid}\nrek = alpha * delta`);
  meld(
    ongeveer(r.alpha?.waarde, 1e-5) && r.alpha?.unit === `1 / ${eenheid}`,
    `alpha = 1e-5 / ${eenheid} → 1e-5 1 / ${eenheid}`,
    r.alpha?.result,
  );
  meld(ongeveer(r.rek?.waarde, 2e-4) && r.rek?.unit === "", `rek = 2e-4, dimensieloos`, r.rek?.result);
}

// ─── 2. Het blad uit de melding ─────────────────────────────────────
for (const [eenheid, tex, texSub] of [
  ["K", "\\mathrm{K}", "\\text{K}"],
  ["degC", "{}^{\\circ}\\mathrm{C}", "{}^{\\circ}\\text{C}"],
]) {
  console.log(`\nBlad uit de melding, per ${eenheid}:`);
  const r = doorreken(
    `L = 5m\nΔT = 20 ${eenheid}\nα_T = 0.000012*(1/${eenheid})\nε_T = α_T*ΔT\nΔL = ε_T*L to mm`,
  );
  const { α_T: a, ε_T: e, ΔL: dl } = r;
  meld(ongeveer(a?.waarde, 1.2e-5) && a?.unit === `1 / ${eenheid}`, "α_T = 1,2·10⁻⁵ 1/" + eenheid, a?.result);
  meld(ongeveer(e?.waarde, 2.4e-4) && e?.unit === "", "ε_T = 2,4·10⁻⁴, dimensieloos", e?.result);
  meld(ongeveer(dl?.waarde, 1.2) && dl?.unit === "mm", "ΔL = 1,2 mm", dl?.result);

  // De uitkomst van α_T: macht van tien en de eenheid als breuk 1/K.
  meld(a?.latex.includes("1.2 \\times 10^{-5}"), "α_T toont 1,2 × 10⁻⁵", a?.latex);
  meld(a?.latex.includes(`\\frac{\\mathrm{1}}{${tex}}`), `α_T toont de eenheid 1/${eenheid}`, a?.latex);
  meld(!/\de-\d/.test(a?.latex ?? ""), "α_T zonder e-notatie", a?.latex);

  // De ingevulde formule van ε_T moet leesbaar zijn en zelf weer de uitkomst
  // geven: dan staat er niets anders dan wat er gerekend is.
  let herrekend = Number.NaN;
  try { herrekend = Number(mathEvaluate(e?.substitution ?? "")); } catch { /* blijft NaN */ }
  meld(ongeveer(herrekend, 2.4e-4), "ingevulde formule van ε_T rekent terug tot 2,4·10⁻⁴", e?.substitution);
  meld(e?.latex.includes(`1.2 \\times 10^{-5} \\, {${texSub}}^{-1}`), `ε_T vult α_T in als 1,2 × 10⁻⁵ ${eenheid}⁻¹`, e?.latex);
  meld(!e?.latex.includes("1 / ") && !/\de-\d/.test(e?.latex ?? ""), "ε_T zonder ruwe tekst of e-notatie", e?.latex);
  meld(!(a?.latex ?? "").includes("degC") && !(e?.latex ?? "").includes("degC"), "geen 'degC' in beeld", e?.latex);
}

// ─── 2b. degC in een samengestelde noemer ───────────────────────────
console.log("\ndegC in een samengestelde noemer:");
{
  // Een temperatuurverschil van 1 °C is 1 K: 0,04 W/(m·°C) = 0,04 W/(m·K).
  const r = doorreken(
    "λ = 0.04 W/(m*degC)\nλ_K = λ to W/(m*K)\nk = 2/(h*degC)\nU = 3 W/(m^2*K)",
  );
  const graden = "{}^{\\circ}\\mathrm{C}";
  meld(ongeveer(r.λ?.waarde, 0.04) && r.λ?.unit === "W / (m degC)", "λ = 0,04 W/(m·degC)", r.λ?.result);
  meld(ongeveer(r.λ_K?.waarde, 0.04) && r.λ_K?.unit === "W / (m K)", "λ = 0,04 W/(m·K)", r.λ_K?.result);
  meld(r.λ?.latex.includes(`\\frac{\\mathrm{W}}{\\mathrm{m}\\,${graden}}`), "λ toont W/(m·°C)", r.λ?.latex);
  meld(r.k?.latex.includes(`\\frac{\\mathrm{1}}{\\mathrm{h}\\,${graden}}`), "k toont 1/(h·°C)", r.k?.latex);
  // De haakjes om de noemer zijn in een breuk overbodig; ook zonder degC.
  meld(r.U?.latex.includes("\\frac{\\mathrm{W}}{{\\mathrm{m}}^{2}\\,\\mathrm{K}}"), "U toont W/(m²·K)", r.U?.latex);
  const alles = [r.λ, r.k, r.U].map((x) => x?.latex ?? "").join(" ");
  meld(!alles.includes("degC") && !alles.includes("\\mathrm{("), "geen 'degC' of haakje aan een eenheid", alles);
}

// ─── 3. Invoerveld met eenheid 1/K ──────────────────────────────────
console.log("\nInvoerveld met eenheid 1/K:");
const veldenBlad = "ΔT = ? K\nα_T = ? 1/K\nL = ? m\nε_T = α_T*ΔT\nΔL = ε_T*L to mm";
{
  const r = doorreken(veldenBlad, { ΔT: "20", α_T: "0,000012", L: "5" });
  meld(ongeveer(r.ε_T?.waarde, 2.4e-4) && r.ε_T?.unit === "", "ε_T = 2,4·10⁻⁴, dimensieloos", r.ε_T?.result);
  meld(ongeveer(r.ΔL?.waarde, 1.2) && r.ΔL?.unit === "mm", "ΔL = 1,2 mm", r.ΔL?.result);
}
// Een leeg veld of een halve invoer telt als 0 in de eenheid van het veld
// (check-lege-invoer): ook bij 1/K blijft de rek dan dimensieloos. "-" werd
// eerder `- 1/K` (-1 K⁻¹, ε_T = -20) en "K" werd `K 1/K` (het getal 1).
for (const [invoer, wat] of [["", "leeg veld"], ["-", "alleen een min"], ["+", "alleen een plus"], ["K", "alleen een eenheid"]]) {
  const r = doorreken(veldenBlad, { ΔT: "20", α_T: invoer, L: "5" });
  meld(r.ε_T?.result === "0" && r.ε_T?.unit === "", `${wat}: ε_T = 0, dimensieloos`, r.ε_T?.result);
}

// ─── 4. Omrekenen naar een inverse eenheid ──────────────────────────
console.log("\nOmrekenen naar een inverse eenheid:");
{
  const r = doorreken("a = 1.2e-5/K to 1/degC\nb = 1.2e-5/K|1/degC\nc = (2/m) to 1/mm");
  meld(ongeveer(r.a?.waarde, 1.2e-5) && r.a?.unit === "1 / degC", "a = 1,2·10⁻⁵ K⁻¹ to 1/degC", r.a?.result);
  meld(ongeveer(r.b?.waarde, 1.2e-5) && r.b?.unit === "1 / degC", "b = 1,2·10⁻⁵ K⁻¹ | 1/degC", r.b?.result);
  // 2 per meter = 2 per 1000 mm = 0,002 per mm.
  meld(ongeveer(r.c?.waarde, 0.002) && r.c?.unit === "1 / mm", "c = 2 m⁻¹ to 1/mm = 0,002 1/mm", r.c?.result);
}
{
  // 1/m/s is 1/(m·s), niet (m/s)⁻¹ = s/m. De doeleenheid staat er zoals een
  // formule hem leest: 1/m*s is (1/m)·s = s/m.
  const r = doorreken("a = 3/(m*s) to 1/m/s\nb = 3 s/m to 1/m*s");
  meld(ongeveer(r.a?.waarde, 3) && r.a?.unit === "1 / (m s)", "a = 3/(m·s) to 1/m/s = 3 1/(m s)", r.a?.result);
  meld(ongeveer(r.b?.waarde, 3) && r.b?.unit === "s / m", "b = 3 s/m to 1/m*s = 3 s/m", r.b?.result);
}

// ─── 5. Andere eenheden houden hun weergave ─────────────────────────
console.log("\nOverige eenheden ongewijzigd:");
{
  // q·L²/8 = 5 · 4² / 8 = 10 kN·m
  const r = doorreken("q = 5 kN/m\nL = 4 m\nM = q*L^2/8\nσ = 12 N/mm^2\nW = 2e5 mm^3\nM_R = σ*W to kN*m");
  meld(r.M?.substitution === "(5 kN / m)*(4 m)^2/8", "ingevulde formule q·L²/8", r.M?.substitution);
  meld(r.M?.result === "10 kN m", "M = 10 kN m", r.M?.result);
  // σ·W = 12 N/mm² · 2·10⁵ mm³ = 2,4·10⁶ N·mm = 2,4 kN·m
  meld(r.M_R?.substitution === "(12 N / mm^2)*(200000 mm^3)", "ingevulde formule σ·W", r.M_R?.substitution);
  meld(ongeveer(r.M_R?.waarde, 2.4), "M_R = 2,4 kN m", r.M_R?.result);
}

console.log(fouten === 0 ? "\nEenheden met alleen een noemer: akkoord." : `\n${fouten} fout(en).`);
process.exit(fouten === 0 ? 0 : 1);
