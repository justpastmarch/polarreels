import type { ReelMetricSnapshot } from "@/types/reel";

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_HOUR = 60 * 60 * 1000;

/* ============================================================
   Curve generators — each returns an array of cumulative values
   that produces a visually distinct SVG chart pattern.
   ============================================================ */

/** Steady linear growth: constant daily increment */
function linear(
  startViews: number, startLikes: number, startComments: number,
  stepViews: number, stepLikes: number, stepComments: number,
  days: number,
) {
  const v = [startViews], l = [startLikes], c = [startComments];
  for (let i = 1; i < days; i++) {
    v.push(v[i - 1] + stepViews + Math.round((Math.random() - 0.4) * stepViews * 0.4));
    l.push(l[i - 1] + stepLikes + Math.round((Math.random() - 0.4) * stepLikes * 0.4));
    c.push(c[i - 1] + stepComments + Math.round((Math.random() - 0.4) * stepComments * 0.4));
  }
  return { views: v, likes: l, comments: c };
}

/** Quadratic acceleration: growth rate increases over time */
function accelerating(
  startViews: number, startLikes: number, startComments: number,
  baseStepViews: number, baseStepLikes: number, baseStepComments: number,
  accel: number, days: number,
) {
  const v = [startViews], l = [startLikes], c = [startComments];
  for (let i = 1; i < days; i++) {
    const mult = 1 + accel * i;
    v.push(v[i - 1] + Math.round(baseStepViews * mult));
    l.push(l[i - 1] + Math.round(baseStepLikes * mult));
    c.push(c[i - 1] + Math.round(baseStepComments * mult));
  }
  return { views: v, likes: l, comments: c };
}

/** Viral S-curve: slow start → explosive growth → plateau */
function sCurve(
  startViews: number, startLikes: number, startComments: number,
  maxViews: number, maxLikes: number, maxComments: number,
  midpoint: number, steepness: number, days: number,
) {
  const v: number[] = [], l: number[] = [], c: number[] = [];
  for (let i = 0; i < days; i++) {
    const portion = 1 / (1 + Math.exp(-steepness * (i - midpoint)));
    v.push(Math.round(startViews + (maxViews - startViews) * portion));
    l.push(Math.round(startLikes + (maxLikes - startLikes) * portion));
    c.push(Math.round(startComments + (maxComments - startComments) * portion));
  }
  return { views: v, likes: l, comments: c };
}

/** Late breakout: flat then sudden acceleration */
function lateBreakout(
  startViews: number, startLikes: number, startComments: number,
  flatViews: number, flatLikes: number, flatComments: number,
  breakoutDay: number,
  breakoutViews: number, breakoutLikes: number, breakoutComments: number,
  days: number,
) {
  const v: number[] = [], l: number[] = [], c: number[] = [];
  for (let i = 0; i < days; i++) {
    if (i === 0) {
      v.push(startViews); l.push(startLikes); c.push(startComments);
    } else if (i < breakoutDay) {
      v.push(v[i - 1] + flatViews);
      l.push(l[i - 1] + flatLikes);
      c.push(c[i - 1] + flatComments);
    } else {
      const breakoutIndex = i - breakoutDay + 1;
      const mult = 1 + 0.12 * breakoutIndex;
      v.push(v[i - 1] + Math.round(breakoutViews * mult));
      l.push(l[i - 1] + Math.round(breakoutLikes * mult));
      c.push(c[i - 1] + Math.round(breakoutComments * mult));
    }
  }
  return { views: v, likes: l, comments: c };
}

/** Peak then decline: grows to a peak, then starts losing traction */
function peakDecline(
  startViews: number, startLikes: number, startComments: number,
  peakDay: number,
  upViews: number, upLikes: number, upComments: number,
  downViews: number, downLikes: number, downComments: number,
  days: number,
) {
  const v: number[] = [], l: number[] = [], c: number[] = [];
  for (let i = 0; i < days; i++) {
    if (i === 0) {
      v.push(startViews); l.push(startLikes); c.push(startComments);
    } else if (i <= peakDay) {
      const mult = 1 + 0.06 * i;
      v.push(v[i - 1] + Math.round(upViews * mult));
      l.push(l[i - 1] + Math.round(upLikes * mult));
      c.push(c[i - 1] + Math.round(upComments * mult));
    } else {
      const mult = 1 + 0.08 * (i - peakDay);
      v.push(Math.max(startViews, v[i - 1] - Math.round(downViews * mult)));
      l.push(Math.max(startLikes, l[i - 1] - Math.round(downLikes * mult)));
      c.push(Math.max(startComments, c[i - 1] - Math.round(downComments * mult)));
    }
  }
  return { views: v, likes: l, comments: c };
}

/** Oscillating: periodic up-down-up pattern */
function oscillating(
  startViews: number, startLikes: number, startComments: number,
  baseViews: number, baseLikes: number, baseComments: number,
  amplitude: number, frequency: number, days: number,
) {
  const v: number[] = [], l: number[] = [], c: number[] = [];
  for (let i = 0; i < days; i++) {
    if (i === 0) {
      v.push(startViews); l.push(startLikes); c.push(startComments);
    } else {
      const wave = amplitude * Math.sin(frequency * i);
      v.push(v[i - 1] + Math.max(1, Math.round(baseViews + wave * baseViews)));
      l.push(l[i - 1] + Math.max(1, Math.round(baseLikes + wave * baseLikes)));
      c.push(c[i - 1] + Math.max(1, Math.round(baseComments + wave * baseComments)));
    }
  }
  return { views: v, likes: l, comments: c };
}

/** Slow burn: barely moves for a long time then gradually picks up */
function slowBurn(
  startViews: number, startLikes: number, startComments: number,
  tinyViews: number, tinyLikes: number, tinyComments: number,
  inflectionDay: number, surgeViews: number, surgeLikes: number, surgeComments: number,
  days: number,
) {
  const v: number[] = [], l: number[] = [], c: number[] = [];
  for (let i = 0; i < days; i++) {
    if (i === 0) {
      v.push(startViews); l.push(startLikes); c.push(startComments);
    } else if (i < inflectionDay) {
      v.push(v[i - 1] + tinyViews + Math.round(Math.random() * 2));
      l.push(l[i - 1] + tinyLikes);
      c.push(c[i - 1] + tinyComments);
    } else {
      const mult = 1 + 0.1 * (i - inflectionDay);
      v.push(v[i - 1] + Math.round(surgeViews * mult));
      l.push(l[i - 1] + Math.round(surgeLikes * mult));
      c.push(c[i - 1] + Math.round(surgeComments * mult));
    }
  }
  return { views: v, likes: l, comments: c };
}

/** Steady plateau: grows consistently then flattens */
function steadyPlateau(
  startViews: number, startLikes: number, startComments: number,
  stepViews: number, stepLikes: number, stepComments: number,
  plateauDay: number, days: number,
) {
  const v: number[] = [], l: number[] = [], c: number[] = [];
  for (let i = 0; i < days; i++) {
    if (i === 0) {
      v.push(startViews); l.push(startLikes); c.push(startComments);
    } else if (i < plateauDay) {
      v.push(v[i - 1] + stepViews);
      l.push(l[i - 1] + stepLikes);
      c.push(c[i - 1] + stepComments);
    } else {
      const fade = Math.max(0.1, 1 - 0.08 * (i - plateauDay));
      v.push(v[i - 1] + Math.round(stepViews * fade));
      l.push(l[i - 1] + Math.round(stepLikes * fade));
      c.push(c[i - 1] + Math.round(stepComments * fade));
    }
  }
  return { views: v, likes: l, comments: c };
}

/** Flat / underperformer: barely any growth */
function flat(
  startViews: number, startLikes: number, startComments: number,
  tinyViews: number, tinyLikes: number, tinyComments: number,
  days: number,
) {
  const v: number[] = [], l: number[] = [], c: number[] = [];
  for (let i = 0; i < days; i++) {
    if (i === 0) {
      v.push(startViews); l.push(startLikes); c.push(startComments);
    } else {
      const noiseV = Math.round((Math.random() - 0.3) * tinyViews);
      const noiseL = Math.round((Math.random() - 0.3) * tinyLikes);
      const noiseC = Math.round((Math.random() - 0.3) * tinyComments);
      v.push(v[i - 1] + Math.max(0, tinyViews + noiseV));
      l.push(l[i - 1] + Math.max(0, tinyLikes + noiseL));
      c.push(c[i - 1] + Math.max(0, tinyComments + noiseC));
    }
  }
  return { views: v, likes: l, comments: c };
}

/* ============================================================
   Builder: takes a curve output + reelId + startDate + hourOffset
   and produces ReelMetricSnapshot[].
   ============================================================ */

function buildSnapshots(
  reelId: string,
  startDate: string,
  hourOffset: number,
  data: { views: number[]; likes: number[]; comments: number[] },
): ReelMetricSnapshot[] {
  const start = new Date(startDate).getTime();
  return data.views.map((_, i) => ({
    reelId,
    capturedAt: new Date(start + i * MS_DAY + hourOffset * MS_HOUR).toISOString(),
    views: data.views[i],
    likes: data.likes[i],
    comments: data.comments[i],
  }));
}

/* ============================================================
   Each reel gets a tailored pattern ↓
   ============================================================ */

export const mockMetricSnapshots: ReelMetricSnapshot[] = [
  // reel-001: quiet observation — slow steady climb, slight noise
  ...buildSnapshots("reel-001", "2026-04-01", 9, linear(420, 38, 5, 95, 7, 1, 16)),

  // reel-002: similar style, steady — textbook linear
  ...buildSnapshots("reel-002", "2026-04-03", 10, linear(580, 55, 6, 130, 9, 1, 16)),

  // reel-003: relationship topic picks up — flat week then breakout ⇧
  ...buildSnapshots("reel-003", "2026-04-05", 14, lateBreakout(820, 72, 9, 60, 5, 1, 5, 340, 28, 4, 16)),

  // reel-004: confession style — grows, peaks at day 10, then declines
  ...buildSnapshots("reel-004", "2026-04-07", 11, peakDecline(710, 63, 8, 10, 160, 14, 2, 90, 8, 1, 16)),

  // reel-005: breakout hit — classic S-curve viral
  ...buildSnapshots("reel-005", "2026-04-09", 8, sCurve(4200, 320, 36, 28000, 2100, 240, 6, 0.6, 16)),

  // reel-006: follows the pattern, strong — accelerating quadratic
  ...buildSnapshots("reel-006", "2026-04-11", 15, accelerating(3200, 260, 30, 400, 32, 4, 0.18, 16)),

  // reel-007: listicle hit — strong S-curve (even sharper than 005)
  ...buildSnapshots("reel-007", "2026-04-13", 9, sCurve(4800, 420, 48, 35000, 3000, 340, 7, 0.7, 16)),

  // reel-008: question hook does well — oscillating (weekend lulls)
  ...buildSnapshots("reel-008", "2026-04-15", 12, oscillating(3800, 310, 35, 520, 42, 5, 0.25, 0.7, 16)),

  // reel-009: work topic — slow burn then takes off
  ...buildSnapshots("reel-009", "2026-04-17", 10, slowBurn(5200, 410, 47, 35, 3, 0, 8, 580, 48, 6, 16)),

  // reel-010: question hook repeat — flat underperformer
  ...buildSnapshots("reel-010", "2026-04-19", 16, flat(2900, 240, 27, 30, 2, 0, 16)),

  // reel-011: confession returns — moderate then late spike
  ...buildSnapshots("reel-011", "2026-04-21", 7, lateBreakout(1800, 150, 17, 200, 16, 2, 10, 500, 42, 5, 16)),

  // reel-012: warm relationship — smooth linear
  ...buildSnapshots("reel-012", "2026-04-23", 13, linear(2200, 180, 21, 180, 14, 2, 16)),

  // reel-013: relatable morning — oscillating with higher amplitude
  ...buildSnapshots("reel-013", "2026-04-25", 6, oscillating(2600, 220, 25, 380, 30, 3, 0.35, 0.9, 16)),

  // reel-014: observation style — peak then slow decline
  ...buildSnapshots("reel-014", "2026-04-27", 10, peakDecline(1600, 140, 14, 8, 200, 17, 2, 120, 10, 1, 16)),

  // reel-015: relatable relationship late-april — steady then late breakout
  ...buildSnapshots("reel-015", "2026-04-29", 11, lateBreakout(3100, 260, 29, 350, 28, 3, 9, 700, 58, 7, 16)),

  // reel-016: creator reflection — very slow burn (shorter run)
  ...buildSnapshots("reel-016", "2026-05-01", 9, slowBurn(1100, 100, 14, 20, 1, 0, 6, 180, 16, 3, 12)),

  // reel-017: return to observation — near flat
  ...buildSnapshots("reel-017", "2026-05-03", 14, flat(1600, 140, 18, 50, 4, 0, 12)),

  // reel-018: reflection steady — grow then plateau
  ...buildSnapshots("reel-018", "2026-05-05", 8, steadyPlateau(1300, 120, 17, 170, 14, 2, 7, 12)),

  // reel-019: reflection continues — growth plateauing (shorter window)
  ...buildSnapshots("reel-019", "2026-05-07", 10, steadyPlateau(1200, 110, 15, 200, 18, 2, 5, 10)),

  // reel-020: newest reel — only 5 data points, just launched
  ...buildSnapshots("reel-020", "2026-05-09", 17, accelerating(2100, 180, 24, 280, 22, 3, 0.05, 5)),
];
