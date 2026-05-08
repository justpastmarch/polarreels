type AnalysisStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "loading" | "empty" | "error";
};

const toneStyles = {
  loading: "border-polar-cyan/30 text-polar-cyan",
  empty: "border-polar-violet/30 text-polar-violet",
  error: "border-amber-300/30 text-amber-200",
};

export function AnalysisState({
  title,
  description,
  actionLabel,
  onAction,
  tone = "loading",
}: AnalysisStateProps) {
  return (
    <section className="mx-auto max-w-3xl pb-20">
      <div className={`glass-card rounded-[2rem] border p-8 text-center ${toneStyles[tone]}`}>
        <h2 className="text-2xl font-bold text-polar-text">{title}</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-polar-muted">{description}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-polar-text transition hover:border-polar-cyan/60 hover:text-polar-cyan"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
