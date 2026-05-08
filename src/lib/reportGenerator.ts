import { analyzeReels, getSignalLevel } from "./analyzeReels";
import type { PolarReelsAnalysis, ReelItem, ScoreInterpretation } from "../types/reel";

const hookLabels: Record<string, string> = {
  question: "질문형 후킹",
  confession: "고백형 후킹",
  shock_claim: "강한 주장형 후킹",
  comparison: "비교형 후킹",
  numbered_list: "숫자형 후킹",
  relatable_situation: "공감 상황형 후킹",
  result_first: "결과 선공개형 후킹",
  quiet_observation: "관찰형 도입",
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

const getTopicDiversityLevel = (score: number) => {
  if (score <= 30) return "좁은 소재 범위";
  if (score <= 60) return "일부 소재 집중";
  if (score <= 80) return "균형 있는 소재 흐름";
  return "넓은 소재 범위";
};

const toInterpretation = (
  score: number,
  message: string,
  level: string = getSignalLevel(score),
): ScoreInterpretation => ({
  score,
  level,
  message,
});

const formatTopics = (topics: string[]) => {
  if (topics.length === 0) return "특정 소재";
  return topics.map((topic) => topicLabels[topic] ?? topic).join(", ");
};

const getTailoredReflectionPrompts = (signals: ReturnType<typeof analyzeReels>) => {
  const dominantHook = hookLabels[signals.dominantHookType] ?? "특정 도입 방식";
  const dominantTopics = formatTopics(signals.dominantTopics);
  const prompts = [];

  prompts.push({
    title: "반복이 시작된 지점 확인",
    basis:
      signals.scores.structureRepetition >= 61
        ? `최근 콘텐츠에서 유사한 패턴이 ${signals.scores.structureRepetition}만큼 강하게 감지되었습니다.`
        : `현재 패턴 반복 신호는 ${signals.scores.structureRepetition}입니다. 아직 한 방향으로만 강하게 모이진 않았습니다.`,
    question: "이 반복은 내가 계속 가져가고 싶은 창작 방식인가요, 아니면 반응 이후 자연스럽게 굳어진 습관인가요?",
    checkPoint: "다음 콘텐츠 전에 유지할 구조 1개와 바꿔볼 구조 1개를 구분해보세요.",
  });

  prompts.push({
    title: "고반응 이후의 거리 확인",
    basis:
      signals.highResponseReelIds.length > 0
        ? `고반응 기준 콘텐츠 ${signals.highResponseReelIds.length}개 이후의 형식 변화를 확인했습니다.`
        : "고반응 기준 콘텐츠를 판단하기에는 데이터가 아직 적습니다.",
    question: "높은 반응을 얻은 콘텐츠 이후, 비슷한 표현을 반복한 이유는 확신에 가까웠나요, 불안에 가까웠나요?",
    checkPoint: "조회수가 높았던 형식과 장기적으로 남기고 싶은 기준이 만나는 지점을 하나 적어보세요.",
  });

  prompts.push({
    title: "자주 기대는 도입 방식 확인",
    basis: `현재 자주 보이는 도입 방식은 ${dominantHook}입니다. 후킹 쏠림 신호는 ${signals.scores.hookConcentration}입니다.`,
    question: "이 도입 방식은 내 목소리를 잘 열어주나요, 아니면 반응을 먼저 의식하게 만드나요?",
    checkPoint: "다음 콘텐츠에서 같은 도입을 쓰더라도 톤이나 소재 중 하나는 의도적으로 확인해보세요.",
  });

  prompts.push({
    title: "최근 중심 소재 확인",
    basis: `최근 자주 나타난 소재는 ${dominantTopics}입니다.`,
    question: "이 소재들은 지금 내 계정의 중심에 가까운가요, 아니면 최근 반응 때문에 자주 등장하게 되었나요?",
    checkPoint: "최근 줄어든 소재 중 다시 꺼내고 싶은 것이 있는지 확인해보세요.",
  });

  return prompts;
};

export const generatePolarReelsReport = (reels: ReelItem[]): PolarReelsAnalysis => {
  const signals = analyzeReels(reels);
  const { scores } = signals;

  const repeatedPatternMessage =
    scores.structureRepetition >= 61
      ? "최근 콘텐츠에서 비슷한 소재, 톤, 후킹, 구조 조합이 반복적으로 나타납니다. 이 반복이 의도한 창작 방식인지 확인해보세요."
      : "최근 콘텐츠의 패턴 반복 신호는 비교적 낮습니다. 현재 흐름이 여러 표현 방식을 함께 유지하고 있는지 살펴볼 수 있습니다.";

  const postResponseMessage =
    scores.postResponseSimilarity >= 61
      ? "고반응 콘텐츠 이후 유사한 형식이 이어지는 신호가 보입니다. 단기 반응과 장기적으로 유지하고 싶은 기준 사이의 균형을 점검해보세요."
      : "고반응 콘텐츠 이후에도 형식이 크게 한 방향으로 모이지는 않았습니다. 현재 선택이 어떤 기준에서 이어지고 있는지 확인해볼 수 있습니다.";

  const hookMessage =
    scores.hookConcentration >= 61
      ? "특정 후킹 방식의 패턴이 뚜렷하게 감지됩니다. 더 강하게 만들라는 뜻이 아니라, 자주 기대고 있는 표현 방식을 확인하기 위한 참고점입니다."
      : "후킹 방식이 한쪽으로 강하게 모인 신호는 크지 않습니다. 지금의 표현 방식이 의도한 톤과 맞는지 살펴보세요.";

  const topicMessage =
    scores.topicDiversity <= 40
      ? "최근 소재 범위가 일부 방향에 모여 있습니다. 낮은 다양성이 반드시 문제는 아니며, 의도한 전문성인지 확인해보세요."
      : "최근 소재가 여러 방향으로 분포되어 있습니다. 이 범위가 장기적으로 유지하고 싶은 계정 기준과 맞는지 확인해보세요.";

  return {
    scores,
    interpretations: {
      structureRepetition: toInterpretation(scores.structureRepetition, repeatedPatternMessage),
      postResponseSimilarity: toInterpretation(scores.postResponseSimilarity, postResponseMessage),
      hookConcentration: toInterpretation(scores.hookConcentration, hookMessage),
      topicDiversity: toInterpretation(scores.topicDiversity, topicMessage, getTopicDiversityLevel(scores.topicDiversity)),
    },
    repeatedPatternSummary:
      signals.topRepeatedSignatureCount > 1
        ? `가장 자주 나타난 패턴은 ${signals.topRepeatedSignatureCount}개 콘텐츠에서 반복되었습니다.`
        : "뚜렷하게 반복되는 단일 패턴은 아직 크지 않습니다.",
    postResponseSummary:
      signals.highResponseReelIds.length > 0
        ? `고반응 기준 콘텐츠 ${signals.highResponseReelIds.length}개 이후의 형식 변화를 확인했습니다.`
        : "고반응 기준 콘텐츠를 확인하기에는 데이터가 아직 적습니다.",
    hookSummary: signals.dominantHookType
      ? `현재 자주 나타나는 후킹 방식은 ${hookLabels[signals.dominantHookType] ?? signals.dominantHookType}입니다.`
      : "후킹 방식의 반복 신호를 확인하기에는 데이터가 아직 적습니다.",
    topicSummary: `최근 자주 나타난 소재는 ${formatTopics(signals.dominantTopics)}입니다. 이 흐름이 의도한 선택인지 확인해보세요.`,
    reflectionQuestions: [
      "이 반복은 의도한 창작 방식인가요?",
      "높은 반응 이후 비슷한 표현을 반복하고 있지는 않나요?",
      "최근 줄어든 주제는 정말 더 이상 중요하지 않은가요?",
      "지금의 콘텐츠 방향은 처음의 창작 기준과 얼마나 가까운가요?",
      "단기 반응과 장기적으로 유지하고 싶은 정체성 사이의 균형은 어떤가요?",
    ],
    reflectionPrompts: getTailoredReflectionPrompts(signals),
  };
};
