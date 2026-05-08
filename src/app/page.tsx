"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnalysisState } from "@/components/AnalysisState";
import { DirectionBalanceReport } from "@/components/DirectionBalanceReport";
import { ReelCard } from "@/components/ReelCard";
import { ReelDetailPanel } from "@/components/ReelDetailPanel";
import { ScoreCard } from "@/components/ScoreCard";
import { mockReels } from "@/data/mockReels";
import { mockMetricSnapshots } from "@/data/mockMetricSnapshots";
import { getMetricSummary } from "@/lib/metricTracking";
import { generatePolarReelsReport } from "@/lib/reportGenerator";
import type { AnalysisPayload, DirectionInsight, PolarReelsAnalysis, PolarUser, ReelItem, ReelMetricSnapshot, TrackedAccount } from "@/types/reel";

type TabId = "overview" | "evidence" | "reflection" | "insight";

const loadingSteps = [
  {
    label: "계정 데이터 요청",
    description: "Instagram 계정에서 최근 Reel 목록과 기본 반응 데이터를 불러오고 있습니다.",
    progress: 20,
  },
  {
    label: "콘텐츠 신호 추출",
    description: "각 Reel의 도입 방식, 전개 구조, 소재와 톤을 분류하고 있습니다.",
    progress: 45,
  },
  {
    label: "방향성 점수 계산",
    description: "반복 패턴, 고반응 이후 변화, 후킹 의존도와 소재 범위를 계산하고 있습니다.",
    progress: 70,
  },
  {
    label: "요약 리포트 구성",
    description: "계정 흐름을 요약하고 근거 카드와 회고 질문을 정리하고 있습니다.",
    progress: 90,
  },
];

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "요약" },
  { id: "evidence", label: "근거" },
  { id: "reflection", label: "방향" },
  { id: "insight", label: "인사이트" },
];

const formatLastTrackedAt = (value: string) => {
  if (!value) return "최근 추적 기록 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "최근 추적 기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function Home() {
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [accountInput, setAccountInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [analysisPayload, setAnalysisPayload] = useState<AnalysisPayload | null>(null);
  const [selectedReel, setSelectedReel] = useState<ReelItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [directionInsight, setDirectionInsight] = useState<DirectionInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [trackedAccounts, setTrackedAccounts] = useState<TrackedAccount[]>([]);
  const [trackedAccountsLoading, setTrackedAccountsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<PolarUser | null>(null);
  const [loginInput, setLoginInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [removingAccount, setRemovingAccount] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [realMetricSnapshots, setRealMetricSnapshots] = useState<ReelMetricSnapshot[]>([]);
  const analysisInFlightRef = useRef(false);
  const demoReport = useMemo(() => generatePolarReelsReport(mockReels), []);

  const activeReels = analysisPayload?.reels ?? mockReels;
  const activeReport = analysisPayload?.report ?? demoReport;
  const accountLabel = analysisPayload?.accountLabel ?? "@sample_creator";
  const loadingStep = loadingSteps[loadingStepIndex];

  const startDemo = () => {
    setErrorMessage("");
    setSelectedReel(null);
    setDirectionInsight(null);
    setInsightLoading(false);
    setLoadingStepIndex(0);
    setAnalysisState("loading");
    window.setTimeout(() => {
      setLoadingStepIndex(3);
      setAnalysisPayload({
        source: "demo",
        accountLabel: "@sample_creator",
        reels: mockReels,
        report: demoReport,
      });
      setAnalysisState(mockReels.length > 0 ? "ready" : "error");
    }, 650);
  };

  const analyzeAccount = async (nextAccount?: string) => {
    if (analysisInFlightRef.current) return;

    const accountToAnalyze = nextAccount ?? accountInput;
    analysisInFlightRef.current = true;
    setErrorMessage("");
    setAnalysisPayload(null);
    setSelectedReel(null);
    setDirectionInsight(null);
    setInsightLoading(false);
    setLoadingStepIndex(0);
    setAnalysisState("loading");

    try {
      const response = await fetch("/api/instagram/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account: accountToAnalyze }),
      });
      const payload = (await response.json()) as Partial<AnalysisPayload> & { error?: string };

      if (!response.ok || payload.error || !payload.reels || !payload.report) {
        throw new Error(payload.error ?? "Instagram 데이터를 불러오지 못했습니다.");
      }

      setLoadingStepIndex(3);
      setAnalysisPayload({
        source: "live",
        accountLabel: payload.accountLabel ?? accountToAnalyze,
        reels: payload.reels as ReelItem[],
        report: payload.report,
        persistence: payload.persistence,
        tagging: payload.tagging,
      });
      setAnalysisState("ready");
      if (currentUser) {
        await saveFavoriteAccount(currentUser.id, payload.accountLabel ?? accountToAnalyze);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Instagram 분석을 완료하지 못했습니다.");
      setAnalysisState("error");
    } finally {
      analysisInFlightRef.current = false;
    }
  };

  const fetchDirectionInsight = useCallback(async (reels: ReelItem[], report: PolarReelsAnalysis) => {
    if (directionInsight) return;
    setInsightLoading(true);
    try {
      const response = await fetch("/api/direction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reels, report }),
      });
      const data = (await response.json()) as { insight?: DirectionInsight } & { error?: string };
      if (data.insight) setDirectionInsight(data.insight);
    } catch {
      // silently degrade
    } finally {
      setInsightLoading(false);
    }
  }, [directionInsight]);

  const fetchTrackedAccounts = useCallback(async (userId?: string) => {
    setTrackedAccountsLoading(true);
    try {
      const suffix = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const response = await fetch(`/api/tracked-accounts${suffix}`, { cache: "no-store" });
      const data = (await response.json()) as { accounts?: TrackedAccount[] };
      setTrackedAccounts(data.accounts ?? []);
    } catch {
      setTrackedAccounts([]);
    } finally {
      setTrackedAccountsLoading(false);
    }
  }, []);

  const saveFavoriteAccount = useCallback(async (userId: string, account: string) => {
    await fetch("/api/tracked-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accountLabel: account }),
    });
    fetchTrackedAccounts(userId);
  }, [fetchTrackedAccounts]);

  const login = async () => {
    const label = loginInput.trim();
    if (!label) return;

    setLoginLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const data = (await response.json()) as { user?: PolarUser };
      if (data.user) {
        setCurrentUser(data.user);
        window.localStorage.setItem("polarreels-user", JSON.stringify(data.user));
        fetchTrackedAccounts(data.user.id);
        setShowLoginModal(false);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const removeFavoriteAccount = async (account: TrackedAccount) => {
    if (!currentUser) return;

    setRemovingAccount(account.accountLabel);
    setTrackedAccounts((accounts) => accounts.filter((item) => item.accountLabel !== account.accountLabel));
    try {
      await fetch(`/api/tracked-accounts?userId=${encodeURIComponent(currentUser.id)}&accountLabel=${encodeURIComponent(account.accountLabel)}`, {
        method: "DELETE",
      });
    } finally {
      setRemovingAccount(null);
      fetchTrackedAccounts(currentUser.id);
    }
  };

  const favoriteInputAccount = async () => {
    const account = accountInput.trim();
    if (!currentUser || !account) return;
    await saveFavoriteAccount(currentUser.id, account.replace(/^@/, ""));
  };

  useEffect(() => {
    if (analysisState === "ready" && activeReels.length > 0) {
      fetchDirectionInsight(activeReels, activeReport);
    }
  }, [analysisState, activeReels, activeReport, fetchDirectionInsight]);

  useEffect(() => {
    const storedUser = window.localStorage.getItem("polarreels-user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as PolarUser;
        if (parsed.id && parsed.label) {
          setCurrentUser(parsed);
          setLoginInput(parsed.label);
          fetchTrackedAccounts(parsed.id);
          return;
        }
      } catch {
        window.localStorage.removeItem("polarreels-user");
      }
    }
  }, [fetchTrackedAccounts]);

  useEffect(() => {
    if (analysisState !== "loading") return;

    setLoadingStepIndex(0);
    const timer = window.setInterval(() => {
      setLoadingStepIndex((currentStep) => Math.min(currentStep + 1, loadingSteps.length - 1));
    }, 2200);

    return () => window.clearInterval(timer);
  }, [analysisState]);

  // Fetch accumulated metric snapshots from Firestore for live accounts
  useEffect(() => {
    if (analysisPayload?.source !== "live" || !analysisPayload.accountLabel) {
      setRealMetricSnapshots([]);
      return;
    }

    const account = analysisPayload.accountLabel.replace(/^@/, "");
    fetch(`/api/metric-snapshots?account=${encodeURIComponent(account)}`)
      .then((res) => res.json() as Promise<{ snapshots?: ReelMetricSnapshot[] }>)
      .then((data) => {
        if (data.snapshots) setRealMetricSnapshots(data.snapshots);
      })
      .catch(() => {
        // silently degrade — no accumulated snapshots
      });
  }, [analysisPayload]);

  return (
    <main className="polar-grid min-h-screen px-5 py-5 md:px-8 lg:px-10">
      {/* Top Navigation */}
      <nav className="sticky top-4 z-20 mx-auto mb-6 grid max-w-7xl gap-3 rounded-[1.5rem] border border-polar-line bg-polar-panel/90 px-4 py-3 shadow-neon backdrop-blur md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-polar-cyan/30 bg-white shadow-neon">
            <img src="/logo.png" alt="PolarReels logo" className="h-full w-full object-contain" />
          </div>
          <p className="text-sm font-bold text-polar-text">PolarReels</p>
        </div>
        <div className="flex justify-center">
          <div className="flex flex-wrap justify-center gap-1 text-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                disabled={analysisState !== "ready"}
                className={`rounded-full px-4 py-2 font-medium transition ${
                  analysisState !== "ready"
                    ? "cursor-not-allowed text-polar-muted/35"
                    : activeTab === tab.id
                    ? "bg-polar-cyan text-white"
                    : "text-polar-text/70 hover:bg-polar-panelSoft"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-start md:justify-end">
          {currentUser ? (
            <div className="flex items-center gap-3 rounded-full border border-polar-line bg-polar-panelSoft/60 px-3 py-2 text-sm">
              <span className="max-w-32 truncate text-polar-muted">{currentUser.label}</span>
              <button
                type="button"
                onClick={() => {
                  setCurrentUser(null);
                  setLoginInput("");
                  window.localStorage.removeItem("polarreels-user");
                  setTrackedAccounts([]);
                }}
                className="text-xs font-semibold text-polar-muted transition hover:text-polar-coral"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="rounded-full bg-polar-text px-5 py-2 text-sm font-bold text-white transition hover:opacity-80"
            >
              로그인
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section — 항상 보임 */}
      <section className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-card rounded-[2rem] p-5 md:p-6">
          <h1 className="text-3xl font-bold tracking-[-0.05em] text-polar-text md:text-5xl">
            당신의 창작이 길을 잃지 않도록, PolarReels
          </h1>
          <div className="mt-5 grid max-w-3xl gap-3 rounded-[1.5rem] border border-polar-line bg-polar-panelSoft/60 p-2.5 sm:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-2 rounded-full border border-polar-line bg-polar-panel px-4 py-2.5 transition focus-within:border-polar-cyan">
              <input
                value={accountInput}
                onChange={(event) => setAccountInput(event.target.value)}
                placeholder="@instagram_handle 또는 https://www.instagram.com/handle/"
                className="min-w-0 flex-1 bg-transparent text-sm text-polar-text outline-none placeholder:text-polar-muted"
                aria-label="Instagram 계정명 또는 프로필 URL"
              />
              {accountInput ? (
                <button
                  type="button"
                  onClick={() => setAccountInput("")}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-polar-muted transition hover:bg-polar-panelSoft hover:text-polar-coral"
                  aria-label="Instagram 계정 입력 지우기"
                >
                  ×
                </button>
              ) : null}
              <button
                type="button"
                onClick={favoriteInputAccount}
                disabled={!currentUser || accountInput.trim().length === 0}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base text-polar-muted transition hover:bg-polar-cyan/10 hover:text-polar-cyan disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="입력한 계정 즐겨찾기"
                title={currentUser ? "즐겨찾기 추가" : "로그인 후 즐겨찾기 가능"}
              >
                ☆
              </button>
            </div>
            <button
              type="button"
              onClick={() => analyzeAccount()}
              disabled={analysisState === "loading" || accountInput.trim().length === 0}
              className="rounded-full bg-polar-text px-6 py-2.5 text-sm font-bold text-white shadow-neon transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
            >
                분석
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={startDemo}
              disabled={analysisState === "loading"}
              className="rounded-full border border-polar-line bg-polar-panel px-6 py-2.5 text-sm font-bold text-polar-text shadow-neon transition hover:scale-[1.02]"
            >
              {analysisState === "loading" ? "분석 중" : "샘플로 먼저 보기"}
            </button>
            <div className="rounded-full border border-polar-line bg-polar-panel px-6 py-2.5 text-sm text-polar-muted">
              {analysisState === "ready" ? `${accountLabel} · 최근 ${activeReels.length}개 Reel` : "계정을 입력하면 분석을 시작합니다"}
            </div>
          </div>
        </div>

        <aside className="glass-card rounded-[2rem] p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-polar-cyan">Favorites</p>
              <h2 className="mt-2 text-xl font-bold text-polar-text">즐겨찾기 계정</h2>
            </div>
            <div className="rounded-full border border-polar-cyan/30 bg-polar-cyan/10 px-3 py-1 text-xs font-bold text-polar-cyan">
              {trackedAccounts.length}
            </div>
          </div>

          <p className="mt-2 text-xs leading-5 text-polar-muted">
            로그인하면 즐겨찾기가 계정별로 저장됩니다. 분석한 계정의 조회수·좋아요·댓글 스냅샷도 누적됩니다.
          </p>

          <div className="mt-4 space-y-2">
            {trackedAccountsLoading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-polar-line bg-polar-panelSoft/60 p-3 text-sm text-polar-muted">
                <span className="h-2 w-2 animate-pulse rounded-full bg-polar-cyan" />
                즐겨찾기를 불러오는 중...
              </div>
            ) : trackedAccounts.length > 0 ? (
              trackedAccounts.map((account) => (
                <div
                  key={account.accountLabel}
                  className="group flex items-start gap-2 rounded-2xl border border-polar-line bg-polar-panelSoft/60 p-3 transition hover:border-polar-cyan/50 hover:bg-polar-cyan/5"
                >
                  <button
                    type="button"
                    disabled={analysisState === "loading"}
                    onClick={() => {
                      setAccountInput(account.accountLabel);
                      analyzeAccount(account.accountLabel);
                    }}
                    className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-polar-text">{account.accountLabel}</span>
                      <span className="rounded-full bg-polar-cyan/10 px-2 py-0.5 text-[0.65rem] font-semibold text-polar-cyan">ON</span>
                    </div>
                    <p className="mt-1 text-xs text-polar-muted">최근 {account.reelCount}개 Reel · {formatLastTrackedAt(account.lastScrapedAt)}</p>
                  </button>
                  {currentUser ? (
                    <button
                      type="button"
                      disabled={removingAccount === account.accountLabel || analysisState === "loading"}
                      onClick={() => removeFavoriteAccount(account)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-polar-line text-sm font-bold text-polar-muted transition hover:border-polar-coral/50 hover:text-polar-coral disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`${account.accountLabel} 즐겨찾기 제거`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-polar-line bg-polar-panelSoft/60 p-3 text-sm leading-6 text-polar-muted">
                아직 즐겨찾기 계정이 없습니다. 로그인한 뒤 계정을 분석하면 목록에 추가됩니다.
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* 로딩 / 에러 / 빈 상태 */}
      {analysisState === "loading" ? (
        <section className="mx-auto mt-6 max-w-3xl pb-20">
          <div className="glass-card rounded-[2rem] border border-polar-cyan/30 p-8 text-polar-cyan">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-polar-cyan">Analysis Progress</p>
                <h2 className="mt-3 text-2xl font-bold text-polar-text">Reels 데이터를 분석 중입니다</h2>
              </div>
              <div className="rounded-full border border-polar-cyan/30 bg-polar-cyan/10 px-4 py-2 text-sm font-bold text-polar-cyan">
                {loadingStep.progress}%
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full border border-polar-line bg-polar-panelSoft">
              <div
                className="h-full rounded-full bg-polar-cyan transition-all duration-700 ease-out"
                style={{ width: `${loadingStep.progress}%` }}
              />
            </div>

            <div className="mt-6 rounded-3xl border border-polar-line bg-polar-panel px-5 py-4">
              <p className="text-sm font-bold text-polar-text">{loadingStep.label}</p>
              <p className="mt-2 text-sm leading-6 text-polar-muted">{loadingStep.description}</p>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-4">
              {loadingSteps.map((step, index) => (
                <div
                  key={step.label}
                  className={`rounded-2xl border px-3 py-3 text-xs transition ${
                    index <= loadingStepIndex
                      ? "border-polar-cyan/40 bg-polar-cyan/10 text-polar-cyan"
                      : "border-polar-line bg-polar-panelSoft/50 text-polar-muted"
                  }`}
                >
                  {step.label}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {analysisState === "error" ? (
        <AnalysisState
          title="계정 분석을 완료하지 못했습니다"
          description={errorMessage || "Instagram 데이터를 불러오지 못했습니다. 공개 계정인지 확인해 주세요."}
          actionLabel="다시 시도"
          onAction={accountInput.trim() ? analyzeAccount : startDemo}
          tone="error"
        />
      ) : null}

      {analysisState === "ready" && activeReels.length === 0 ? (
        <AnalysisState
          title="분석할 Reels가 없습니다"
          description="최근 콘텐츠가 충분하지 않아 방향성 분석이 어렵습니다."
          actionLabel="샘플 보기"
          onAction={startDemo}
          tone="empty"
        />
      ) : null}

      {/* 분석 결과 — 탭 기반 섹션 */}
      {analysisState === "ready" && activeReels.length > 0 ? (
        <section className="mx-auto mt-6 max-w-7xl pb-20">
          {/* 탭 콘텐츠 */}
          {activeTab === "overview" ? (
            <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
              <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
                <div className="rounded-full border border-polar-cyan/20 bg-polar-cyan/10 px-5 py-3 text-sm text-polar-cyan">
                  {analysisPayload?.source === "live" ? "Live 분석" : "샘플 분석"} · {accountLabel}
                </div>
                {analysisPayload?.tagging ? (
                  <div className="rounded-3xl border border-polar-line bg-polar-panel px-5 py-4 text-sm leading-6 text-polar-muted">
                    태깅: {analysisPayload.tagging.mode === "llm" ? "LLM" : "규칙"} · {analysisPayload.tagging.message}
                  </div>
                ) : null}
                {analysisPayload?.persistence ? (
                  <div className="rounded-3xl border border-polar-line bg-polar-panel px-5 py-4 text-sm leading-6 text-polar-muted">
                    저장: {analysisPayload.persistence.saved ? "Firestore 저장됨" : "미저장"} · {analysisPayload.persistence.message}
                  </div>
                ) : null}
                <DirectionBalanceReport report={activeReport} />
              </aside>

              <div className="grid items-start gap-4 md:grid-cols-2">
                <ScoreCard
                  title="구조 반복"
                  caption="비슷한 전개 방식의 반복 빈도"
                  interpretation={activeReport.interpretations.structureRepetition}
                  accent="cyan"
                />
                <ScoreCard
                  title="반응 이후 형식 변화"
                  caption="고반응 영상과 이후 콘텐츠의 형식 유사도"
                  interpretation={activeReport.interpretations.postResponseSimilarity}
                  accent="violet"
                />
                <ScoreCard
                  title="후킹 의존도"
                  caption="특정 도입 방식의 집중도"
                  interpretation={activeReport.interpretations.hookConcentration}
                  accent="lime"
                />
                <ScoreCard
                  title="소재 다양성"
                  caption="최근 콘텐츠의 소재 분포 폭"
                  interpretation={activeReport.interpretations.topicDiversity}
                  accent="coral"
                />
              </div>
            </div>
          ) : null}

          {activeTab === "evidence" ? (
            <div className="mx-auto max-w-7xl">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-polar-lime">Evidence Cards</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-polar-text">창작 흐름 근거 카드</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {activeReels.map((reel) => (
                  <ReelCard key={reel.id} reel={reel} onSelect={setSelectedReel} />
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "reflection" ? (
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-polar-violet">Topic Direction</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-polar-text">다음 영상 주제 설계</h2>
              <p className="mt-3 max-w-2xl text-[0.95rem] leading-7 text-polar-muted">
                인사이트의 해석을 반복하지 않고, 현재 계정 흐름에서 자연스럽게 이어갈 수 있는 영상 주제 후보만 정리합니다.
              </p>

              {insightLoading ? (
                <div className="mt-8 rounded-3xl border border-polar-line bg-polar-panelSoft/60 p-6 text-sm text-polar-muted">
                  영상 주제 후보를 정리하고 있습니다...
                </div>
              ) : directionInsight ? (
                <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-3xl border border-polar-line bg-polar-panel/80 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-polar-cyan">Topic Candidates</p>
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-polar-text">영상 주제 후보</h3>
                    <div className="mt-5 grid gap-3">
                      {directionInsight.topicIdeas.slice(0, 3).map((topic, index) => (
                        <div key={index} className="rounded-2xl border border-polar-line bg-polar-panelSoft/50 p-5">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-polar-violet/10 text-xs font-bold text-polar-violet">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-polar-text">{topic.title}</p>
                              <p className="mt-2 text-xs leading-6 text-polar-muted">{topic.reason}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-polar-line bg-polar-panelSoft/60 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-polar-coral">How to Use</p>
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-polar-text">주제 선택 기준</h3>
                    <div className="mt-5 space-y-3 text-sm leading-7 text-polar-text/80">
                      <p className="rounded-2xl border border-polar-line bg-polar-panel/80 p-4">1. 바로 촬영 가능한 장면이 떠오르는 후보를 먼저 고릅니다.</p>
                      <p className="rounded-2xl border border-polar-line bg-polar-panel/80 p-4">2. 기존 반응을 복제하기보다, 같은 결을 다른 상황에 옮길 수 있는지 봅니다.</p>
                      <p className="rounded-2xl border border-polar-line bg-polar-panel/80 p-4">3. 업로드 후에는 조회수보다 소재·도입·톤이 계정 흐름과 맞았는지 확인합니다.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-3xl border border-polar-line bg-polar-panelSoft/60 p-6 text-sm text-polar-muted">
                  영상 주제 후보를 불러올 수 없습니다. 인사이트가 생성되면 이 탭에 다음 영상 후보가 표시됩니다.
                </div>
              )}
            </div>
          ) : null}

          {activeTab === "insight" ? (
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-polar-violet">Direction Insight</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-polar-text">LLM 종합 인사이트</h2>

              {insightLoading ? (
                <div className="mt-8 rounded-3xl border border-polar-line bg-polar-panelSoft/60 p-6 text-sm text-polar-muted">
                  수집된 데이터를 종합하고 있습니다...
                </div>
              ) : directionInsight ? (
                <div className="mt-8 space-y-6">
                  {/* Summary */}
                  <div className="rounded-3xl border border-polar-line bg-polar-panelSoft/60 p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-polar-cyan">종합</p>
                    <p className="mt-3 max-w-5xl text-base leading-8 text-polar-text/90">{directionInsight.summary}</p>
                  </div>

                  {/* Patterns */}
                  <div>
                    <p className="text-sm font-semibold text-polar-text">감지된 패턴</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {directionInsight.patterns.map((pattern, idx) => (
                        <div key={idx} className="rounded-2xl border border-polar-line bg-polar-panel/80 p-4 text-sm leading-7 text-polar-text/80">
                          {pattern}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observations */}
                  <div className="rounded-3xl border border-polar-line bg-polar-panel/80 p-6">
                    <p className="text-sm font-semibold text-polar-text">데이터가 보여주는 것</p>
                    <ul className="mt-3 space-y-3">
                      {directionInsight.observations.map((obs, idx) => (
                        <li key={idx} className="flex gap-3 text-sm leading-7 text-polar-text/80">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-polar-violet" />
                          {obs}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Reflection points */}
                  <div className="rounded-3xl border border-polar-line bg-polar-panel/80 p-6">
                    <p className="text-sm font-semibold text-polar-text">스스로 확인할 지점</p>
                    <ul className="mt-3 space-y-3">
                      {directionInsight.reflectionPoints.map((point, idx) => (
                        <li key={idx} className="flex gap-3 text-sm leading-7 text-polar-text/80">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-polar-coral" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-3xl border border-polar-line bg-polar-panelSoft/60 p-6 text-sm text-polar-muted">
                  인사이트를 불러올 수 없습니다. 분석 데이터를 확인한 후 다시 시도해 주세요.
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedReel ? (
        <ReelDetailPanel
          reel={selectedReel}
          metricSummary={getMetricSummary(selectedReel, (!analysisPayload || analysisPayload.source === "demo") ? mockMetricSnapshots : realMetricSnapshots)}
          onClose={() => setSelectedReel(null)}
        />
      ) : null}

      {/* 로그인 모달 */}
      {showLoginModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-[2rem] border border-polar-line bg-polar-panel p-6 shadow-neon"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-polar-text">로그인</h2>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-polar-muted transition hover:bg-polar-panelSoft hover:text-polar-text"
              >
                ×
              </button>
            </div>
            <p className="mt-2 text-sm leading-5 text-polar-muted">
              사용자명을 입력하면 간단히 로그인할 수 있습니다. 비밀번호는 필요하지 않습니다.
            </p>
            <div className="mt-5 flex gap-2">
              <input
                value={loginInput}
                onChange={(event) => setLoginInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && loginInput.trim().length > 0 && !loginLoading) login();
                }}
                placeholder="사용자명"
                className="min-w-0 flex-1 rounded-full border border-polar-line bg-polar-panelSoft px-4 py-2.5 text-sm text-polar-text outline-none placeholder:text-polar-muted focus:border-polar-cyan"
                aria-label="로그인 사용자명"
              />
              <button
                type="button"
                onClick={login}
                disabled={loginLoading || loginInput.trim().length === 0}
                className="rounded-full bg-polar-text px-5 py-2.5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loginLoading ? "로딩 중..." : "로그인"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
