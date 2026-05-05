export type Difficulty = 'easy' | 'medium' | 'hard';

export interface CityImage {
  url: string;
  description_zh: string;
  photographer?: string;
}

export interface City {
  id: string;
  name_zh: string;
  name_en: string;
  country_zh: string;
  country_en: string;
  difficulty: Difficulty;
  images: CityImage[];
}

export interface QuizBank {
  cities: City[];
}

export interface GameQuestion {
  city: City;
  imageIndex: number;
  optionCities: City[]; // length 4, order shown to user
  correctId: string;
}

export type AppScreen = 'home' | 'easter' | 'game' | 'result' | 'leaderboard';

export interface GameRecord {
  nickname: string;
  score: number;
  correctCount: number;
  totalTimeSec: number;
  hintsUsed: number;
  at: number;
  streakAtEnd: number;
  /** v1.5：本局答对的城市 id（用于通关海报抽图） */
  correctCityIds?: string[];
}

export interface PlayerState {
  playerId: string;
  nickname: string;
  citiesAppeared: string[];
  easterEggDone: boolean;
  totalGames: number;
  bestScore: number;
  bestTimeSec: number;
  bestStreak: number;
  currentStreak: number;
  records: GameRecord[];
  /** 用于首页展示：至少 1247 或本地注册数 */
  explorerSeeds: number;
  /** 城市 id → 已出现过的图片序号 0/1/2，用于 v1.1 去重 */
  seenImages: Record<string, number[]>;
  /**
   * 本轮回合（约 ceil(城数/20) 局为一轮）已完整打完的局数
   * 新轮回后清零
   */
  tourSessionCompleted: number;
}
