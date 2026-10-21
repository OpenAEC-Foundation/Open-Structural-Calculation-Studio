/**
 * 4.3 Toegepaste materialen: welke regel waar komt te staan.
 *
 * Rechts naast de materialen staat de tabel met bevestigingsmiddelen, in de
 * referentie vanaf de derde materiaalregel. Op een regel die de twee tabellen
 * delen heeft de opmerking bij een materiaal alleen de kolommen 4 en 5; op de
 * andere regels loopt ze, zoals in een spreadsheet, over de lege cellen ernaast
 * door. Een lange opmerking liep zo over de bevestigingsmiddelen heen.
 *
 * Daarom schuift de tabel met bevestigingsmiddelen omlaag naar de eerste plek
 * waar geen van zijn regels naast een te lange opmerking staat; in het
 * uiterste geval komt hij onder de materialen. Of een opmerking past, wordt
 * ruim geschat (tekstBreedte). Is de schatting toch te krap, bijvoorbeeld met
 * een breder lettertype in de huisstijl, dan breekt de opmerking op een
 * gedeelde regel af binnen haar eigen twee kolommen: de regel wordt hoger,
 * maar de tekst loopt nooit over de tabel ernaast.
 *
 * Zonder React en zonder imports met waarden, zodat scripts/check-rapport.mjs
 * dit bestand rechtstreeks kan laden.
 */
import type { Bevestigingsregel, Materiaalregel } from "./model.ts";

/** Waar de tabel met bevestigingsmiddelen in de referentie begint: naast de derde materiaalregel. */
export const BEVESTIGING_VANAF = 2;

/**
 * De kolommen van de cellen, als [eerste kolom, aantal], binnen het
 * ingesprongen vlak van hoofdstuk 4 (kolom 1 hier is kolom 2 van het vel).
 */
export const KOLOMMEN = {
  type: [1, 2],
  soort: [3, 1],
  opmerking: [4, 2],
  bevestigingType: [6, 2],
  bevestigingKwaliteit: [8, 1],
} as const satisfies Record<string, readonly [number, number]>;

/** Rastermaten uit RapportAfdruk.css, in pt: kolombreedte, celmarge links en rechts, lettergrootte. */
const KOLOM_PT = 53.8;
const CEL_PT = 1.4;
const LETTER_PT = 10;

/** Ruimte voor een opmerking op een regel naast de bevestigingsmiddelen, in em: twee kolommen min de celmarges. */
export const OPMERKING_RUIMTE = (KOLOMMEN.opmerking[1] * KOLOM_PT - 2 * CEL_PT) / LETTER_PT;

/**
 * Tekenbreedtes in em, per groep naar boven afgerond op het breedste teken van
 * die groep in Segoe UI, het standaardlettertype van de huisstijl (gemeten:
 * i en l 0,24, f 0,31, r 0,35, J 0,36, g en q 0,59, M 0,90, W 0,93, O 0,75).
 *
 * De rest van Latin-1 telt als 1,0 em: het breedste daarvan is @ (0,96), dan
 * ¾ ½ ¼ © ® (0,89–0,95). Alles daarbuiten telt als 1,25 em: dat dekt ‰ (1,21)
 * en de breedste Latijnse letters (Ǆ, Ǳ 1,24), en ruim — 1,0, œ en Œ 0,93,
 * → 0,86 en ≥ 0,69; een schatting mag te ruim zijn, nooit te krap. Een paar
 * tekens in Segoe UI zijn breder (o.a. ❶ 1,33, Ѹ 1,31, ⸻ 1,99); die breken af
 * in hun eigen kolommen (zie boven).
 */
const SMAL = new Set([..." .,;:'!|ijlI"]);
const HALF = new Set([..."frtJ()[]{}"]);
const BREED = new Set([..."mwMW%&æÆ"]);

function tekenBreedte(t: string): number {
  if (SMAL.has(t)) return 0.29;
  if (HALF.has(t)) return 0.36;
  if (BREED.has(t)) return 0.95;
  if (/[a-zß-öø-ÿ]/.test(t)) return 0.6;
  if (/[A-ZÀ-Þ0-9]/.test(t)) return 0.76;
  // Eén teken, dus één codepunt (tekstBreedte loopt per codepunt).
  return (t.codePointAt(0) ?? 0) <= 0xff ? 1.0 : 1.25;
}

/**
 * Geschatte breedte van een tekst in em. Bewust ruim: elk teken telt als het
 * breedste van zijn groep, zodat een opmerking die volgens de schatting past
 * ook werkelijk past.
 */
export function tekstBreedte(tekst: string): number {
  let breedte = 0;
  for (const t of tekst) breedte += tekenBreedte(t);
  return breedte;
}

/** Past deze opmerking op een regel naast de bevestigingsmiddelen? */
export function pastNaastBevestiging(opmerking: string): boolean {
  return tekstBreedte(opmerking.trim()) <= OPMERKING_RUIMTE;
}

/** Eén regel van de tabel: een materiaal, een bevestigingsmiddel, of allebei. */
export interface Materiaalrij {
  materiaal?: Materiaalregel;
  bevestiging?: Bevestigingsregel;
  /** De eerste regel van de bevestigingsmiddelen: die krijgt de lijn erboven. */
  eersteBevestiging: boolean;
}

/**
 * Op welke regel de bevestigingsmiddelen beginnen: de eerste regel vanaf
 * BEVESTIGING_VANAF waarbij geen van de `aantal` regels naast een te lange
 * opmerking staat.
 */
export function bevestigingBegin(materialen: readonly Materiaalregel[], aantal: number): number {
  const vrij = (i: number) => {
    const m = materialen[i];
    return m === undefined || pastNaastBevestiging(m.opmerking);
  };
  const past = (begin: number) => Array.from({ length: aantal }, (_, j) => begin + j).every(vrij);
  // Voorbij de laatste materiaalregel is alles vrij, dus dit stopt uiterlijk daar.
  let begin = BEVESTIGING_VANAF;
  while (!past(begin)) begin++;
  return begin;
}

/** De regels van 4.3 in volgorde, met de bevestigingsmiddelen op hun plek ernaast. */
export function materialenRijen(
  materialen: readonly Materiaalregel[],
  bevestiging: readonly Bevestigingsregel[],
): Materiaalrij[] {
  const begin = bevestigingBegin(materialen, bevestiging.length);
  const aantal = Math.max(materialen.length, begin + bevestiging.length);
  return Array.from({ length: aantal }, (_, i): Materiaalrij => {
    const rij: Materiaalrij = { eersteBevestiging: bevestiging.length > 0 && i === begin };
    const m = materialen[i];
    const b = i >= begin ? bevestiging[i - begin] : undefined;
    if (m) rij.materiaal = m;
    if (b) rij.bevestiging = b;
    return rij;
  });
}
