/**
 * Modulecatalogus en naslagbibliotheek voor het zijpaneel.
 *
 * Dit bestand beschrijft WAT je kunt invoegen, niet wat er in je project zit.
 * De projectinhoud staat in `store/projectStore.ts`: een lijst exemplaren, elk
 * met een eigen kopie van de rekentekst en eigen invoerwaarden. Een module uit
 * deze catalogus kan dus meerdere keren in een project voorkomen.
 *
 *   - `moduleCatalogus` — rekenmodules, gegroepeerd per materiaal. Invoegen
 *     maakt er een exemplaar van.
 *   - `bibliotheek` — naslag, zoals de CalcPAD-voorbeelden. Ook invoegbaar.
 *
 * `templateId` matcht een sleutel in `src/templates/index.ts`.
 */

/**
 * Hoe ver de toetsing van een module is. De teksten die de gebruiker ziet
 * (kort en met uitleg) staan in de vertalingen: `bladVersie.status` en
 * `bladVersie.statusUitleg` in i18n/locales/{nl,en}/common.json.
 */
export type ModuleStatus =
  /** Toetsing uitgewerkt én nagerekend op referentiebladen. */
  | "gereed"
  /** Toetsing staat er, maar is nog niet tegen referentiebladen gecontroleerd. */
  | "controleren"
  /** Hoeveelheden geraamd en nagerekend; geen constructieve toetsing. */
  | "raming"
  /** Alleen invoer en parametrisch beeld — de toetsing moet nog worden gemaakt. */
  | "concept";

/**
 * Publicatie staat los van de status hierboven.
 *
 * De status zegt hoe ver de tóétsing is; publicatie zegt of de module is
 * nagekeken en vrijgegeven om mee te werken. Een module kan gecalibreerd zijn
 * en toch nog niet zijn nagekeken — dan is hij wel bruikbaar maar niet
 * vrijgegeven, en dat hoort de gebruiker te zien.
 */
export const PUBLICATIE_UITLEG = {
  gepubliceerd: "Gepubliceerd — nagekeken en vrijgegeven",
  onuitgegeven: "Nog niet gepubliceerd — nog niet nagekeken",
} as const;

export type TreeNode =
  | { kind: "section"; id: string; label: string; children: TreeNode[] }
  | { kind: "category"; id: string; label: string; defaultExpanded?: boolean; children: TreeNode[]; count?: number; bronUrl?: string }
  | {
      kind: "item";
      id: string;
      label: string;
      templateId?: string;
      emphasis?: boolean;
      status?: ModuleStatus;
      /** Nagekeken en vrijgegeven. Ontbreekt of `false` = nog niet. */
      gepubliceerd?: boolean;
    };

/**
 * Calc-sheets binnen het huidige project, gegroepeerd per materiaal. Binnen een
 * categorie eerst de constructiedelen (kolom, ligger, wand), daarna de
 * verbindingen en tot slot de losse toetsen. Hoe ver een module is, staat in
 * `status` (zie `ModuleStatus`), niet in de indeling.
 */
export const moduleCatalogus: TreeNode[] = [
  {
    kind: "category",
    id: "cat-algemeen",
    label: "Algemeen",
    defaultExpanded: true,
    count: 1,
    children: [
      { kind: "item", id: "sheet-ligger", label: "Ligger (hout of staal)", templateId: "ligger", status: "controleren" },
    ],
  },
  {
    kind: "category",
    id: "cat-hout",
    label: "Hout",
    defaultExpanded: true,
    count: 1,
    children: [
      { kind: "item", id: "sheet-balklaag", label: "Balklaag (houten vloerbalken)", templateId: "balklaag", status: "gereed", gepubliceerd: true },
    ],
  },
];

export const bibliotheek: TreeNode[] = [
  {
    kind: "category",
    id: "calcpad-samples",
    label: "CalcPAD voorbeelden",
    defaultExpanded: false,
    count: 1,
    children: [
      { kind: "item", id: "cpd-calcpad-demo", label: "CalcPAD syntax demo", templateId: "calcpad-demo" },
    ],
  },
];

/** Wat de app van een sjabloon moet weten zodra het een exemplaar wordt. */
export interface ModuleInfo {
  templateId: string;
  label: string;
  status?: ModuleStatus;
  /** Categorie waaronder hij in de catalogus staat (Staal, Beton, ...). */
  categorie: string;
}

function verzamel(nodes: TreeNode[], categorie: string, uit: Record<string, ModuleInfo>) {
  for (const node of nodes) {
    if (node.kind === "item") {
      if (node.templateId && !uit[node.templateId]) {
        uit[node.templateId] = {
          templateId: node.templateId,
          label: node.label,
          status: node.status,
          categorie,
        };
      }
    } else {
      verzamel(node.children, node.kind === "category" ? node.label : categorie, uit);
    }
  }
}

/** Sjabloon-id naar label en status, voor de naamgeving van nieuwe exemplaren. */
export const modulesPerTemplate: Record<string, ModuleInfo> = (() => {
  const uit: Record<string, ModuleInfo> = {};
  verzamel(moduleCatalogus, "Algemeen", uit);
  verzamel(bibliotheek, "Bibliotheek", uit);
  return uit;
})();
