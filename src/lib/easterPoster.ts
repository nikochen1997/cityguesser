import type { City, GameRecord } from './types';
import { localImageUrl } from './imageUrl';

/** 从存档汇总「答对过的城市」id（v1.5 起每局写入 correctCityIds） */
export function collectCorrectCityIdsFromRecords(records: GameRecord[]): string[] {
  const s = new Set<string>();
  for (const r of records) {
    if (r.correctCityIds?.length) {
      r.correctCityIds.forEach((id) => s.add(id));
    }
  }
  return [...s];
}

export function aggregatePosterStats(records: GameRecord[]): {
  totalCorrect: number;
  totalQuestions: number;
  totalTimeSec: number;
} {
  let totalCorrect = 0;
  let totalQuestions = 0;
  let totalTimeSec = 0;
  for (const r of records) {
    totalCorrect += r.correctCount;
    totalQuestions += 20;
    totalTimeSec += r.totalTimeSec;
  }
  return { totalCorrect, totalQuestions, totalTimeSec };
}

export function accuracyPercent(totalCorrect: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  return Math.round((totalCorrect / totalQuestions) * 1000) / 10;
}

export function titleTier(rate: number): { zh: string; en: string } {
  if (rate >= 95) return { zh: '🌍 环球百科全书', en: 'World Encyclopedia' };
  if (rate >= 90) return { zh: '✈️ 环球探险家', en: 'Global Explorer' };
  if (rate >= 80) return { zh: '🧭 城市猎人', en: 'City Hunter' };
  if (rate >= 70) return { zh: '🗺️ 地图漫游者', en: 'Map Wanderer' };
  if (rate >= 60) return { zh: '📸 好奇旅人', en: 'Curious Traveler' };
  return { zh: '🌱 萌新出发', en: 'Fresh Start' };
}

export function formatDateCn(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatMmSs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export type CityImagePick = { cityId: string; url: string };

export function buildCityImagePool(cityIds: string[], cityById: Map<string, City>): CityImagePick[] {
  const pairs: CityImagePick[] = [];
  for (const id of cityIds) {
    const c = cityById.get(id);
    if (!c?.images?.length) continue;
    for (const im of c.images) {
      pairs.push({ cityId: id, url: localImageUrl(im.url) });
    }
  }
  return pairs;
}

/** 随机背景 + 最多 4 张缩略（优先不同城市） */
export function shufflePosterAssets(pool: CityImagePick[], rng: () => number): {
  backgroundUrl: string;
  thumbUrls: string[];
} {
  if (!pool.length) return { backgroundUrl: '', thumbUrls: [] };
  const bg = pool[Math.floor(rng() * pool.length)]!.url;
  const thumbs: string[] = [];
  const byCity = new Map<string, string[]>();
  for (const p of pool) {
    if (!byCity.has(p.cityId)) byCity.set(p.cityId, []);
    byCity.get(p.cityId)!.push(p.url);
  }
  const cities = [...byCity.keys()].sort(() => rng() - 0.5);
  for (const cid of cities) {
    if (thumbs.length >= 4) break;
    const urls = byCity.get(cid)!;
    thumbs.push(urls[Math.floor(rng() * urls.length)]!);
  }
  const flat = pool.map((p) => p.url);
  let guard = 0;
  while (thumbs.length < 4 && flat.length > 0 && guard < 30) {
    guard += 1;
    const u = flat[Math.floor(rng() * flat.length)]!;
    if (!thumbs.includes(u)) thumbs.push(u);
  }
  return { backgroundUrl: bg, thumbUrls: thumbs.slice(0, 4) };
}
