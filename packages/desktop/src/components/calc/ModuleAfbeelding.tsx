import type { ReactNode } from "react";

/** Schematische catalogusbeelden; onafhankelijk van projectinvoer en rekenwaarden. */
const vlak = "var(--mk-beeld-vlak)";
const p = (d: string) => <path d={d} />;

/** Gegenereerde modulebeelden; het symbool benoemt de toets visueel. */
const eigenBeelden = import.meta.glob("../../assets/module-beelden/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** Elk rekenmodule-id heeft een eigen herkenningsbeeld. */
const beelden: Record<string, ReactNode> = {
  balklaag: <>{[0, 1, 2, 3].map((i) => <path key={i} d={`M${24 + i * 23} 62l28-35 9 3-28 35v10l-9-3Z`} fill={vlak} />)}{p("m24 62 81 11 31-37M24 72l81 11 31-37")}</>,
};

export default function ModuleAfbeelding({ templateId }: { templateId: string }) {
  const beeld = beelden[templateId];
  if (!beeld) return null;
  const foto = eigenBeelden[`../../assets/module-beelden/${templateId}.webp`];
  return (
    <span className="mk-afbeelding" aria-hidden="true">
      {foto && <img src={foto} alt="" loading="lazy" />}
      <svg viewBox="0 -10 160 110" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {beeld}
      </svg>
    </span>
  );
}
