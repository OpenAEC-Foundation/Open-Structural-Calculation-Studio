/**
 * De lijnen van de balklaag voor het parametrische beeld: moment, dwarskracht
 * en zakking van een lastset, dezelfde statica als het rekenmodel in
 * `templates/balklaag.ts` (§4). Hier wordt niets getoetst — de getallen die
 * tellen (unity checks, M_y,Ed, V_z,Ed, w_fin) komen uit het blad zelf. Dit
 * bestand tekent alleen de vorm, met de lasten en factoren uit dat blad.
 *
 * Eenheden: lengtes in m, verdeelde lasten in kN/m, puntlasten in kN, EI in
 * kNm². Moment in kNm (positief bij trek aan de onderzijde), dwarskracht in kN,
 * zakking in mm (omlaag positief).
 */

/** De ligger: veld 1 en eventueel een overstek (schema 2) of veld 2 (schema 3). */
export interface Ligger {
  schema: number;
  /** Overspanning van veld 1. */
  L1: number;
  /** Lengte van het overstek; 0 buiten schema 2. */
  a: number;
  /** Overspanning van veld 2; 0 buiten schema 3. */
  L2: number;
  /** Buigstijfheid van de balk. */
  EI: number;
}

/**
 * Een set lasten: verdeelde last op veld 1 en op het tweede deel, puntlast
 * midden in veld 1 en op het tweede deel (midden in veld 2, of op het uiteinde
 * van het overstek).
 */
export interface Lastset {
  w1: number;
  w2: number;
  P1: number;
  P2: number;
}

export const GEEN: Lastset = { w1: 0, w2: 0, P1: 0, P2: 0 };

/** Σ factor · lastset — een combinatie is een optelling van belastinggevallen. */
export function tel(delen: [Lastset, number][]): Lastset {
  const uit = { ...GEEN };
  for (const [s, f] of delen) {
    uit.w1 += f * s.w1;
    uit.w2 += f * s.w2;
    uit.P1 += f * s.P1;
    uit.P2 += f * s.P2;
  }
  return uit;
}

export const totaal = (g: Ligger) => g.L1 + (g.schema === 2 ? g.a : 0) + (g.schema === 3 ? g.L2 : 0);

/**
 * Steunmoment bij de tussenoplegging, positief bij trek aan de bovenzijde:
 * bij twee velden uit de drie-momentenvergelijking, bij een overstek uit het
 * evenwicht van de kraag.
 */
export function steunmoment(g: Ligger, s: Lastset): number {
  if (g.schema === 3) {
    const n = g.L1 + g.L2;
    return (s.w1 * g.L1 ** 3 + s.w2 * g.L2 ** 3) / (8 * n) + (3 * (s.P1 * g.L1 ** 2 + s.P2 * g.L2 ** 2)) / (16 * n);
  }
  if (g.schema === 2) return (s.w2 * g.a ** 2) / 2 + s.P2 * g.a;
  return 0;
}

/**
 * De belastinggevallen BG1 … BG5 uit de lasten per balk, zoals het blad ze
 * definieert (§4): BG1 permanent overal, BG2 veranderlijk op veld 1, BG3
 * veranderlijk op het tweede deel (veld 2 of het overstek), BG4 puntlast
 * midden in veld 1, BG5 puntlast op het tweede deel (midden in veld 2 of op
 * het uiteinde van het overstek). Het overstek is voor de schaakbordbelasting
 * een tweede deel, net als veld 2.
 */
export function belastinggevallen(g: Ligger, lasten: { g: number; q: number; F: number }): Record<1 | 2 | 3 | 4 | 5, Lastset> {
  const twee = g.schema === 2 || g.schema === 3;
  return {
    1: { w1: lasten.g, w2: twee ? lasten.g : 0, P1: 0, P2: 0 },
    2: { w1: lasten.q, w2: 0, P1: 0, P2: 0 },
    3: { w1: 0, w2: twee ? lasten.q : 0, P1: 0, P2: 0 },
    4: { w1: 0, w2: 0, P1: lasten.F, P2: 0 },
    5: { w1: 0, w2: 0, P1: 0, P2: twee ? lasten.F : 0 },
  };
}

/**
 * De partiële factoren uit het blad: γ_G en γ_Q voor 6.10b, en γ_G,a en
 * γ_Q·ψ_0 voor 6.10a. Een blad uit een oudere versie kent 6.10a niet; laat
 * gGa en gQa dan weg (of NaN), dan blijft het bij 6.10b.
 */
export interface Factoren {
  gG: number;
  gQ: number;
  gGa?: number;
  gQa?: number;
}

/** Eén UGT-combinatie: de rij uit de tabel van het blad (5.2), de formule en de lastset. */
export interface Combinatie {
  rij: 1 | 2 | 3 | 4 | 5;
  formule: "6.10a" | "6.10b";
  set: Lastset;
}

/**
 * De UGT-combinaties van §5 als lastset: vijf rijen (veld 1, steun, veld 2 of
 * overstek, en de twee puntlasten), elk met 6.10a en 6.10b.
 */
export function ugtCombinaties(bg: Record<1 | 2 | 3 | 4 | 5, Lastset>, f: Factoren): Combinatie[] {
  const rijen: [Combinatie["rij"], (2 | 3 | 4 | 5)[]][] = [[1, [2]], [2, [2, 3]], [3, [3]], [4, [4]], [5, [5]]];
  const formules: [Combinatie["formule"], number, number][] = [];
  if (Number.isFinite(f.gGa) && Number.isFinite(f.gQa)) formules.push(["6.10a", f.gGa as number, f.gQa as number]);
  formules.push(["6.10b", f.gG, f.gQ]);
  const uit: Combinatie[] = [];
  for (const [rij, veranderlijk] of rijen) {
    for (const [formule, fG, fQ] of formules) {
      uit.push({ rij, formule, set: tel([[bg[1], fG], ...veranderlijk.map((k): [Lastset, number] => [bg[k], fQ])]) });
    }
  }
  return uit;
}

export interface Lijnen {
  M: (x: number) => number;
  V: (x: number) => number;
  u: (x: number) => number;
}

/** Per plaats de grootste en de kleinste waarde van moment en dwarskracht. */
export interface Uitersten {
  Mmax: (x: number) => number;
  Mmin: (x: number) => number;
  Vmax: (x: number) => number;
  Vmin: (x: number) => number;
}

/**
 * De puntlast als vrije last: per plaats x het grootste en het kleinste moment
 * en de grootste en kleinste dwarskracht door een last van 1 kN, over alle
 * plaatsen waar die last kan staan (de invloedslijn van de doorsnede op x,
 * zijn top en zijn dal). Gesloten uitdrukkingen:
 *
 *  - Een veld op twee steunpunten: het moment is het grootst met de last op x
 *    zelf, x·(L − x)/L; de dwarskracht met de last vlak rechts ((L − x)/L) of
 *    vlak links (−x/L) van de doorsnede.
 *  - Overstek: een last op het uiteinde geeft in het veld −a·x/L en de
 *    dwarskracht −a/L; op de kraag zelf telt de last voorbij de doorsnede.
 *  - Twee velden: het steunmoment door een last op afstand p van de
 *    eindoplegging is p·(L² − p²)/(2·L·(L₁ + L₂)), het grootst bij p = L/√3.
 *    Het veld is daarmee een ligger op twee steunpunten met dat eindmoment.
 *    Het kleinste moment komt van een last in het andere veld, of dicht bij
 *    het middensteunpunt van een last in hetzelfde veld links van de
 *    doorsnede (het dal van de invloedslijn, waar de afgeleide nul is).
 */
export function vrijePuntlast(g: Ligger): Uitersten {
  const { L1 } = g;
  if (g.schema === 2) {
    const a = g.a;
    const tot = L1 + a;
    return {
      Mmax: (x) => (x <= L1 ? (x * (L1 - x)) / L1 : 0),
      Mmin: (x) => (x <= L1 ? (-a * x) / L1 : -(tot - x)),
      Vmax: (x) => (x <= L1 ? (L1 - x) / L1 : 1),
      Vmin: (x) => (x <= L1 ? -Math.max(x, a) / L1 : 0),
    };
  }
  if (g.schema === 3) {
    const L2 = g.L2;
    const n = L1 + L2;
    const tot = n;
    // Steunmoment door een last op afstand p van de eindoplegging van een veld L.
    const ms = (p: number, L: number) => (p * (L * L - p * p)) / (2 * L * n);
    // Grootste steunmoment door een last in een veld L.
    const top = (L: number) => (L * L) / (3 * Math.sqrt(3) * n);
    // Moment op afstand t van de eindoplegging van veld L; het andere veld is La.
    const mMax = (t: number, L: number) => (t * (L - t)) / L - (ms(t, L) * t) / L;
    const mMin = (t: number, L: number, La: number) => {
      const ander = (-top(La) * t) / L;
      const rad = t > 0 ? (L * L - (2 * L * n * (L - t)) / t) / 3 : -1;
      if (rad <= 0) return ander;
      const p = Math.sqrt(rad);
      return Math.min(ander, (p * (L - t)) / L - (t * ms(p, L)) / L);
    };
    return {
      Mmax: (x) => (x <= L1 ? mMax(x, L1) : mMax(tot - x, L2)),
      Mmin: (x) => (x <= L1 ? mMin(x, L1, L2) : mMin(tot - x, L2, L1)),
      Vmax: (x) => {
        if (x <= L1) return (L1 - x) / L1 - ms(x, L1) / L1;
        const t = tot - x;
        return Math.max(t / L2 + ms(t, L2) / L2, top(L1) / L2);
      },
      Vmin: (x) => {
        if (x <= L1) return Math.min(-x / L1 - ms(x, L1) / L1, -top(L2) / L1);
        const t = tot - x;
        return -(L2 - t) / L2 + ms(t, L2) / L2;
      },
    };
  }
  return {
    Mmax: (x) => (x * (L1 - x)) / L1,
    Mmin: () => 0,
    Vmax: (x) => (L1 - x) / L1,
    Vmin: (x) => -x / L1,
  };
}

/**
 * De omhullende van de UGT (§5 van het blad): per plaats het grootste en het
 * kleinste moment en de grootste en kleinste dwarskracht. Daarin de
 * combinaties met de verdeelde last (rij 1, 2 en 3: veld 1, beide delen, het
 * tweede deel) en de combinatie met de puntlast, elk met 6.10a en 6.10b. De
 * puntlast is een vrije last en staat per doorsnede op de ongunstigste plaats
 * (vrijePuntlast). Met de puntlast vast in het midden van een veld zou de
 * lijn daar springen, ook waar het schema geen last tekent, en zou hij voor
 * de dwarskracht bij de opleggingen te klein zijn.
 */
export function omhullende(g: Ligger, lasten: { g: number; q: number; F: number }, f: Factoren): Uitersten {
  const bg = belastinggevallen(g, lasten);
  const verdeeld = ugtCombinaties(bg, f).filter((c) => c.rij <= 3).map((c) => lijnen(g, c.set));
  const formules: [number, number][] = [[f.gG, f.gQ]];
  if (Number.isFinite(f.gGa) && Number.isFinite(f.gQa)) formules.push([f.gGa as number, f.gQa as number]);
  const eta = vrijePuntlast(g);
  // Per formule de permanente last met zijn factor, en de puntlast met de zijne.
  const punt = formules.map(([fG, fQ]) => ({ G: lijnen(g, tel([[bg[1], fG]])), P: fQ * lasten.F }));
  return {
    Mmax: (x) => Math.max(...verdeeld.map((c) => c.M(x)), ...punt.map((k) => k.G.M(x) + k.P * eta.Mmax(x))),
    Mmin: (x) => Math.min(...verdeeld.map((c) => c.M(x)), ...punt.map((k) => k.G.M(x) + k.P * eta.Mmin(x))),
    Vmax: (x) => Math.max(...verdeeld.map((c) => c.V(x)), ...punt.map((k) => k.G.V(x) + k.P * eta.Vmax(x))),
    Vmin: (x) => Math.min(...verdeeld.map((c) => c.V(x)), ...punt.map((k) => k.G.V(x) + k.P * eta.Vmin(x))),
  };
}

/**
 * De omhullende als twee vlakken aan weerszijden van de as: aan de ene kant de
 * grootste positieve, aan de andere de grootste negatieve waarde. Voor het
 * moment zijn dat het grootste veldmoment en het grootste steunmoment, voor
 * de dwarskracht +V en −V. Alleen het algebraïsche maximum tekenen toont bij
 * een steunpunt de lichtste combinatie; per x de grootste absolute waarde
 * kiezen geeft een schijnsprong waar de twee grenzen even groot zijn.
 */
export function helften(max: (x: number) => number, min: (x: number) => number): { boven: (x: number) => number; onder: (x: number) => number } {
  return {
    boven: (x) => Math.max(0, max(x)),
    onder: (x) => Math.min(0, min(x)),
  };
}

/** Moment, dwarskracht en zakking van één lastset op afstand x van het begin. */
export function lijnen(g: Ligger, s: Lastset): Lijnen {
  const { L1, EI } = g;
  const a = g.schema === 2 ? g.a : 0;
  const L2 = g.schema === 3 ? g.L2 : 0;
  const tot = L1 + a + L2;
  const Ms = steunmoment(g, s);
  const Ra = (s.w1 * L1) / 2 + s.P1 / 2 - Ms / L1;
  const Rc = L2 > 0 ? (s.w2 * L2) / 2 + s.P2 / 2 - Ms / L2 : 0;
  // Zakking van een veld met lengte L: verdeelde last, puntlast in het midden
  // en een inklemmend moment aan het eind; t vanaf de scharnierende oplegging.
  const up = (t: number, L: number) => {
    const r = t <= L / 2 ? t : L - t;
    return (r * (3 * L * L - 4 * r * r)) / 48;
  };
  const uv = (t: number, L: number, w: number, P: number) =>
    (w * t * (L ** 3 - 2 * L * t * t + t ** 3)) / 24 + P * up(t, L) - (Ms * t * (L * L - t * t)) / (6 * L);
  // Hoekverdraaiing van veld 1 bij de tweede oplegging; positief draait het overstek omlaag.
  const tv = (Ms * L1) / 3 - (s.w1 * L1 ** 3) / 24 - (s.P1 * L1 * L1) / 16;
  return {
    M: (x) => {
      if (x <= L1) return Ra * x - (s.w1 * x * x) / 2 - s.P1 * Math.max(0, x - L1 / 2);
      const t = tot - x;
      if (a > 0) return (-s.w2 * t * t) / 2 - s.P2 * t;
      return Rc * t - (s.w2 * t * t) / 2 - s.P2 * Math.max(0, t - L2 / 2);
    },
    V: (x) => {
      if (x <= L1) return Ra - s.w1 * x - (x > L1 / 2 ? s.P1 : 0);
      const t = tot - x;
      if (a > 0) return s.w2 * t + s.P2;
      return s.w2 * t + (t > L2 / 2 ? s.P2 : 0) - Rc;
    },
    u: (x) => {
      let v: number;
      if (x <= L1) v = uv(x, L1, s.w1, s.P1);
      else if (a > 0) {
        const z = x - L1;
        v = tv * z + (s.w2 * z * z * (6 * a * a - 4 * a * z + z * z)) / 24 + (s.P2 * z * z * (3 * a - z)) / 6;
      } else v = uv(tot - x, L2, s.w2, s.P2);
      return (1000 * v) / EI;
    },
  };
}
