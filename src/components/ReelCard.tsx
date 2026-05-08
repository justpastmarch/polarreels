import React from "react";
import type { ReelItem } from "@/types/reel";

type ReelCardProps = {
  reel: ReelItem;
  onSelect?: (reel: ReelItem) => void;
};

const formatNumber = (value: number) => new Intl.NumberFormat("ko-KR").format(value);

const hookLabels: Record<string, string> = {
  question: "질문형 도입",
  confession: "고백형 도입",
  shock_claim: "강한 주장형 도입",
  comparison: "비교형 도입",
  numbered_list: "숫자형 도입",
  relatable_situation: "공감 상황형 도입",
  result_first: "결과 선공개형 도입",
  quiet_observation: "관찰형 도입",
};

const structureLabels: Record<string, string> = {
  storytelling: "이야기형 구조",
  listicle: "리스트형 구조",
  problem_solution: "문제-해결 구조",
  before_after: "전후 비교 구조",
  skit: "상황극 구조",
  vlog: "브이로그 구조",
  commentary: "코멘터리 구조",
  tutorial: "튜토리얼 구조",
};

const topicLabels: Record<string, string> = {
  city: "도시 관찰",
  conversation: "대화",
  creator_reflection: "창작 회고",
  daily_life: "일상",
  daily_observation: "일상 관찰",
  local_life: "지역성",
  personal_reflection: "개인적 회고",
  relationship: "관계",
  social_behavior: "사회적 행동 관찰",
  work_style: "일과 생활 방식",
};

const toneLabels: Record<string, string> = {
  calm: "차분함",
  critical: "비판적 관찰",
  humorous: "유머",
  intimate: "친밀함",
  reflective: "회고적",
  relatable: "공감형",
  warm: "따뜻함",
};

const getClicheSignalLabel = (level: number) => {
  if (level >= 75) return "분석 신뢰도 높음";
  if (level >= 50) return "분석 신뢰도 보통";
  if (level >= 25) return "분석 신뢰도 낮음";
  return "분석 신뢰도 매우 낮음";
};

const getRoleLabel = (reel: ReelItem) => {
  if (reel.views >= 18000) return "고반응 기준점";
  if (reel.topicTags.includes("creator_reflection")) return "기준 회복 신호";
  if (reel.platformClicheLevel >= 60) return "분석 신뢰도 높음";
  if (reel.hookType === "quiet_observation") return "고유 관찰 신호";
  return "흐름 확인 카드";
};

const getInsightText = (reel: ReelItem) => {
  if (reel.views >= 18000) {
    return "고반응 기준점 — 이후 콘텐츠의 형식이 이 영상과 가까워졌는지 확인할 지표입니다.";
  }
  if (reel.topicTags.includes("creator_reflection")) {
    return "창작 회고 소재 — 반응과 무관하게 유지하려는 방향성을 보여줍니다.";
  }
  if (reel.platformClicheLevel >= 60) {
    return "분석 신뢰도 높음 — 명확한 패턴이 감지되어 분석 결과의 신뢰도가 높습니다.";
  }
  if (reel.hookType === "quiet_observation") {
    return "관찰형 도입 — 초기 창작 방식의 흔적을 확인하는 단서입니다.";
  }
  return "콘텐츠 흐름 내에서 소재와 형식의 위치를 확인하는 카드입니다.";
};

export function ReelCard({ reel, onSelect }: ReelCardProps) {
  const roleLabel = getRoleLabel(reel);
  const insightText = getInsightText(reel);
  const clicheLabel = getClicheSignalLabel(reel.platformClicheLevel);
  const hookLabel = hookLabels[reel.hookType] ?? reel.hookType;
  const structureLabel = structureLabels[reel.structureType] ?? reel.structureType;

  return (
    <article
      className="glass-card grid cursor-pointer gap-5 rounded-3xl p-5 transition hover:-translate-y-1 hover:border-polar-cyan/40 sm:grid-cols-[9rem_1fr]"
      onClick={() => onSelect?.(reel)}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onSelect) return;
        if (event.key === "Enter" || event.key === " ") onSelect(reel);
      }}
    >
      <div
        className="aspect-[9/16] rounded-2xl border border-polar-line bg-polar-panelSoft bg-cover bg-center shadow-neon"
        style={{ backgroundImage: reel.thumbnailUrl ? `url(${reel.thumbnailUrl})` : undefined }}
        aria-label={`${reel.title} thumbnail`}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-polar-cyan/30 bg-polar-cyan/10 px-3 py-1 font-medium text-polar-cyan">
            {roleLabel}
          </span>
          <span className="text-polar-muted">{reel.postedAt}</span>
          <span className="h-1 w-1 rounded-full bg-polar-muted" />
          <span className="text-polar-muted">조회 {formatNumber(reel.views)}</span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-7 tracking-tight text-polar-text">{reel.title}</h3>
        <p className="mt-2 line-clamp-3 text-[0.95rem] leading-7 text-polar-muted">{reel.caption}</p>

        <div className="mt-4 rounded-2xl border border-polar-cyan/15 bg-polar-cyan/5 p-4">
          <p className="text-sm leading-7 text-polar-text/90">{insightText}</p>
        </div>

        <div className="mt-4 grid gap-3 text-xs text-polar-muted sm:grid-cols-3">
          <Metric label="좋아요" value={formatNumber(reel.likes)} />
          <Metric label="댓글" value={formatNumber(reel.comments)} />
          <Metric label="조회수" value={formatNumber(reel.views)} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Tag label="소재" value={reel.topicTags.map((tag) => topicLabels[tag] ?? tag).join(" · ")} />
          <Tag label="톤" value={reel.toneTags.map((tag) => toneLabels[tag] ?? tag).join(" · ")} />
          <Tag label="도입" value={hookLabel} />
          <Tag label="구조" value={structureLabel} />
          <Tag
            label="신뢰도"
            value={<><span className={`mr-1 inline-block h-2 w-2 rounded-full ${reel.platformClicheLevel >= 50 ? "bg-green-500" : reel.platformClicheLevel >= 25 ? "bg-yellow-500" : "bg-red-500"}`} />{clicheLabel}</>}
          />
        </div>
        <p className="mt-3 text-xs font-semibold text-polar-cyan">클릭하면 상세 지표와 변화량을 볼 수 있습니다.</p>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: React.ReactNode; value?: string }) {
  return (
    <div className="rounded-2xl border border-polar-line bg-polar-panel/85 p-3 text-center">
      <p className="flex items-center justify-center gap-1.5 text-[0.7rem] font-medium text-polar-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-polar-text">{value}</p>
    </div>
  );
}

function Tag({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-polar-line bg-polar-panel/80 px-3 py-1.5 text-polar-muted">
      <span className="shrink-0 font-medium text-polar-cyan">{label}</span>
      <span className="shrink-0 text-polar-line">/</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
