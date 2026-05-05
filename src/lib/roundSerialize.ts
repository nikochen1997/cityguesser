import type { City, GameQuestion } from './types';

export type SerializedQuestion = {
  cityId: string;
  imageIndex: number;
  optionIds: [string, string, string, string];
  correctId: string;
};

export function serializeQuestions(list: GameQuestion[]): SerializedQuestion[] {
  return list.map((g) => ({
    cityId: g.city.id,
    imageIndex: g.imageIndex,
    optionIds: g.optionCities.map((c) => c.id) as [string, string, string, string],
    correctId: g.correctId,
  }));
}

export function hydrateQuestions(
  rows: SerializedQuestion[],
  byId: Map<string, City>
): GameQuestion[] {
  return rows.map((s) => {
    const city = byId.get(s.cityId);
    if (!city) throw new Error(`未知城市: ${s.cityId}`);
    const options = s.optionIds.map((id) => {
      const c = byId.get(id);
      if (!c) throw new Error(`未知城市: ${id}`);
      return c;
    });
    return {
      city,
      imageIndex: s.imageIndex,
      optionCities: options,
      correctId: s.correctId,
    };
  });
}
