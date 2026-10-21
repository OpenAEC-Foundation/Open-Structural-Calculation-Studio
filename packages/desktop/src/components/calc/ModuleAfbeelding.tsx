import type { ReactNode } from "react";

/** Schematische catalogusbeelden; onafhankelijk van projectinvoer en rekenwaarden. */
const vlak = "var(--mk-beeld-vlak)";
const accent = "var(--theme-accent)";
const p = (d: string) => <path d={d} />;
const r = (x: number, y: number, w: number, h: number) =>
  <rect x={x} y={y} width={w} height={h} fill={vlak} />;
const kracht = (x: number, y: number, hoek = 0) => (
  <g transform={`translate(${x} ${y}) rotate(${hoek})`} stroke={accent}>
    <path d="M0 0v20m-4-5 4 5 4-5" />
  </g>
);
const steun = (x: number, y: number) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M0 0l-7 10H7ZM-10 14h20" />
  </g>
);

/** Gegenereerde modulebeelden; het symbool benoemt de toets visueel. */
const eigenBeelden = import.meta.glob("../../assets/module-beelden/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** Elk rekenmodule-id heeft een eigen herkenningsbeeld. */
const beelden: Record<string, ReactNode> = {
  ligger: <>{r(26, 43, 108, 8)}{steun(34, 51)}{steun(126, 51)}{kracht(54, 15)}{kracht(80, 15)}{kracht(106, 15)}</>,
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
