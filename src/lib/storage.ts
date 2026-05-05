import type { GameRecord, PlayerState } from './types';
import type { WipState } from './wipTypes';
import { totalTourRounds } from './tour';

const KEY = 'cityguesser_v1';
const WIP_KEY = 'cg_wip_v1';

function nowId(): string {
  return crypto.randomUUID();
}

const defaultState = (): PlayerState => ({
  playerId: nowId(),
  nickname: '',
  citiesAppeared: [],
  easterEggDone: false,
  totalGames: 0,
  bestScore: 0,
  bestTimeSec: 999999,
  bestStreak: 0,
  currentStreak: 0,
  records: [],
  explorerSeeds: 0,
  seenImages: {},
  tourSessionCompleted: 0,
});

export function loadState(): PlayerState {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return defaultState();
    const p = JSON.parse(s) as PlayerState;
    if (!p.playerId) p.playerId = nowId();
    if (!p.citiesAppeared) p.citiesAppeared = [];
    if (!p.records) p.records = [];
    if (p.explorerSeeds == null) p.explorerSeeds = 0;
    if (p.bestTimeSec == null) p.bestTimeSec = 999999;
    if (p.currentStreak == null) p.currentStreak = 0;
    if (p.easterEggDone == null) p.easterEggDone = false;
    try {
      if (localStorage.getItem('easter_egg_done') === 'true') p.easterEggDone = true;
    } catch {
      /* ignore */
    }
    if (!p.seenImages) p.seenImages = {};
    if (p.tourSessionCompleted == null) p.tourSessionCompleted = 0;
    return p;
  } catch {
    return defaultState();
  }
}

export function saveState(p: PlayerState): void {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function markImageSeen(cityId: string, imageIndex: number): void {
  const st = loadState();
  const arr = st.seenImages[cityId] ? [...st.seenImages[cityId]] : [];
  if (!arr.includes(imageIndex)) arr.push(imageIndex);
  st.seenImages[cityId] = arr;
  saveState(st);
}

export function getSeenMap(): Record<string, number[]> {
  return { ...loadState().seenImages };
}

/** 题库中每个城市 id 在 seenImages 中至少有一条记录（任一张图被展示过即算）—— v1.2 彩蛋触发条件 */
export function allQuizCitiesSeenOnce(allCityIds: string[]): boolean {
  if (allCityIds.length === 0) return false;
  const st = loadState();
  return allCityIds.every((id) => (st.seenImages[id]?.length ?? 0) > 0);
}

/** 题库中每个城市的各张图都至少出现过一次时，清空 seen，之后换用新一轮图片组合 */
export function clearSeenIfExhausted(
  cities: { id: string; images: { length: number } }[]
): void {
  if (cities.length === 0) return;
  const st = loadState();
  const allFull = cities.every((c) => {
    const s = new Set(st.seenImages[c.id] || []);
    return s.size >= c.images.length;
  });
  if (!allFull) return;
  st.seenImages = {};
  saveState(st);
}

/** 彩蛋「再玩一轮」：只清空已见图片记录，保留 playerId、昵称及其他进度（v1.3） */
export function clearSeenImagesKeepIdentity(): void {
  const st = loadState();
  st.seenImages = {};
  saveState(st);
}

export function saveWip(w: WipState): void {
  localStorage.setItem(WIP_KEY, JSON.stringify(w));
}

export function loadWip(): WipState | null {
  try {
    const s = localStorage.getItem(WIP_KEY);
    if (!s) return null;
    return JSON.parse(s) as WipState;
  } catch {
    return null;
  }
}

export function clearWip(): void {
  localStorage.removeItem(WIP_KEY);
}

export function validateWip(
  w: WipState,
  cityById: Map<string, { images: { length: number } }>
): WipState | null {
  if (w.version !== 1) return null;
  if (!w.serialized || w.serialized.length !== 20) return null;
  for (const r of w.serialized) {
    if (!cityById.has(r.cityId)) return null;
    for (const oid of r.optionIds) {
      if (!cityById.has(oid)) return null;
    }
  }
  return w;
}

export function uniqueNicknamesCount(): number {
  const st = loadState();
  return new Set([...st.records.map((r) => r.nickname), st.nickname].filter(Boolean)).size;
}

export function appendRecord(
  r: GameRecord,
  citiesThisRound: string[],
  streakAtEnd: number,
  cityListLength: number
): number {
  const st = loadState();
  st.totalGames = (st.totalGames || 0) + 1;
  st.records = [r, ...(st.records || [])].slice(0, 200);
  if (r.score > (st.bestScore || 0)) {
    st.bestScore = r.score;
    st.bestTimeSec = r.totalTimeSec;
  } else if (r.score === (st.bestScore || 0) && r.totalTimeSec < (st.bestTimeSec ?? 1e6)) {
    st.bestTimeSec = r.totalTimeSec;
  }
  st.bestStreak = Math.max(st.bestStreak || 0, streakAtEnd, r.streakAtEnd);
  st.currentStreak = streakAtEnd;
  st.citiesAppeared = [...new Set([...st.citiesAppeared, ...citiesThisRound])];
  const tr = totalTourRounds(cityListLength);
  st.tourSessionCompleted = Math.min(
    (st.tourSessionCompleted || 0) + 1,
    tr
  );
  saveState(st);
  return st.tourSessionCompleted;
}

export function resetTourSession(): void {
  const st = loadState();
  st.tourSessionCompleted = 0;
  saveState(st);
}

export function allCitiesAppeared(cityCount: number): boolean {
  const st = loadState();
  return st.citiesAppeared.length >= cityCount;
}

export function setEasterDone(): void {
  const st = loadState();
  st.easterEggDone = true;
  saveState(st);
  try {
    localStorage.setItem('easter_egg_done', 'true');
  } catch {
    /* ignore */
  }
}

const EASTER_INTRO_ANIM_KEY = 'easter_egg_animation_shown';

/** 结算页彩蛋首发动效是否已播过（v1.4） */
export function hasEasterIntroAnimationPlayed(): boolean {
  try {
    return localStorage.getItem(EASTER_INTRO_ANIM_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markEasterIntroAnimationPlayed(): void {
  try {
    localStorage.setItem(EASTER_INTRO_ANIM_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export function setNickname(nick: string): void {
  const st = loadState();
  const t = nick.trim();
  if (t && t !== st.nickname) st.explorerSeeds = (st.explorerSeeds || 0) + 1;
  st.nickname = t;
  saveState(st);
}

export function percentileByScore(score: number): number {
  const st = loadState();
  const scores = st.records.map((r) => r.score);
  if (scores.length < 2) return 50;
  const below = scores.filter((s) => s < score).length;
  return Math.round((below / scores.length) * 100);
}
