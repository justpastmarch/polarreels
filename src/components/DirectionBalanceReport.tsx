import type { PolarReelsAnalysis } from "@/types/reel";

type DirectionBalanceReportProps = {
  report: PolarReelsAnalysis;
};

export function DirectionBalanceReport({ report }: DirectionBalanceReportProps) {
  return (
    <section id="overview" className="glass-card rounded-[2rem] p-4">
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-polar-cyan">Signal Summary</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-polar-text">
            창작 궤적 요약
          </h2>
        </div>
        <p className="text-sm leading-6 text-polar-muted">
          반복·반응·도입·소재 흐름의 기초 신호입니다.
        </p>
      </div>

      <div className="mt-4 grid gap-1.5">
        <ReportLine title="반복 패턴" body={report.repeatedPatternSummary} />
        <ReportLine title="고반응 이후 방향 변화" body={report.postResponseSummary} />
        <ReportLine title="도입 방식 분포" body={report.hookSummary} />
        <ReportLine title="소재 범위" body={report.topicSummary} />
      </div>
    </section>
  );
}

function ReportLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3.5 py-3">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-polar-cyan">{title}</h3>
      <p className="mt-1 line-clamp-1 text-sm leading-6 text-polar-muted">{body}</p>
    </div>
  );
}
