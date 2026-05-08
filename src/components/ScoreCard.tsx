import type { ScoreInterpretation } from "@/types/reel";

type ScoreCardProps = {
  title: string;
  interpretation: ScoreInterpretation;
  caption: string;
  accent?: "cyan" | "violet" | "lime" | "coral";
};

const accentClasses = {
  cyan: "border-polar-cyan/30 text-polar-cyan bg-polar-cyan/10",
  violet: "border-polar-violet/30 text-polar-violet bg-polar-violet/10",
  lime: "border-polar-lime/30 text-polar-lime bg-polar-lime/10",
  coral: "border-polar-coral/30 text-polar-coral bg-polar-coral/10",
};

export function ScoreCard({ title, interpretation, caption, accent = "cyan" }: ScoreCardProps) {
  const meterPosition = Math.max(6, Math.min(94, interpretation.score));

  return (
    <article className="glass-card h-fit rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-polar-muted">{caption}</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-polar-text">{title}</h3>
        </div>
        <div className={`rounded-full border px-3.5 py-1.5 text-sm font-black ${accentClasses[accent]}`}>
          {interpretation.score}
        </div>
      </div>

      <div className="relative mt-3 h-6 rounded-full border border-polar-line bg-gradient-to-r from-polar-cyan/10 via-polar-panel to-polar-coral/10">
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-polar-panel bg-polar-cyan shadow-neon"
          style={{ left: `${meterPosition}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[0.7rem] text-polar-muted">
        <span>낮음</span>
        <span>현재</span>
        <span>높음</span>
      </div>
      <p className="mt-3 text-sm font-bold text-polar-text">{interpretation.level}</p>
      <p className="mt-1.5 line-clamp-2 max-w-prose text-sm leading-6 text-polar-muted">{interpretation.message}</p>
    </article>
  );
}
