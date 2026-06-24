import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildGameRound, scoreForAnswer } from '../lib/buildRound';
import { GameImageViewport } from '../components/GameImageViewport';
import { loadState, markImageSeen, saveWip } from '../lib/storage';
import { hydrateQuestions, serializeQuestions } from '../lib/roundSerialize';
import { localImageUrl } from '../lib/imageUrl';
import type { City, GameQuestion } from '../lib/types';
import type { WipState } from '../lib/wipTypes';

const TOTAL_Q = 20;
const MAX_GLOBAL_SWAPS = 3;

type FinishPayload = {
  score: number;
  correctCount: number;
  totalTimeSec: number;
  hintsUsed: number;
  streakAtEnd: number;
  cityIds: string[];
  correctCityIds: string[];
};

export function GamePage({
  cities,
  gameKey,
  tourRound,
  resumeSnapshot,
  onFinish,
}: {
  cities: City[];
  gameKey: number;
  tourRound: number;
  resumeSnapshot: WipState | null;
  onFinish: (p: FinishPayload) => void;
}) {
  const byId = useMemo(
    () => new Map(cities.map((c) => [c.id, c] as const)),
    [cities]
  );

  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [, setStreak] = useState(0);
  const [globalSwaps, setGlobalSwaps] = useState(MAX_GLOBAL_SWAPS);
  const [localSwaps, setLocalSwaps] = useState(0);
  const [imgOffset, setImgOffset] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [intro, setIntro] = useState(false);
  const [roundBootstrapped, setRoundBootstrapped] = useState(false);

  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const streakRef = useRef(0);
  const globalSwapsRef = useRef(MAX_GLOBAL_SWAPS);
  const startMs = useRef(Date.now());
  const pauseTotalMs = useRef(0);
  const introOpenAt = useRef<number | null>(null);
  const questionsRef = useRef<GameQuestion[]>([]);
  const correctCityIdsRef = useRef<string[]>([]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  useEffect(() => {
    globalSwapsRef.current = globalSwaps;
  }, [globalSwaps]);

  const applyResume = (w: WipState) => {
    const qs = hydrateQuestions(w.serialized, byId);
    setQuestions(qs);
    setQIndex(w.qIndex);
    setScore(w.score);
    setStreak(w.streak);
    scoreRef.current = w.score;
    correctRef.current = w.correct;
    streakRef.current = w.streak;
    setGlobalSwaps(w.globalSwaps);
    globalSwapsRef.current = w.globalSwaps;
    setLocalSwaps(w.localSwaps);
    setImgOffset(w.imgOffset);
    setAnswered(w.answered);
    setPicked(w.picked);
    setIntro(false);
    startMs.current = w.startMs;
    pauseTotalMs.current = w.pauseTotalMs;
  };

  const applyFresh = useCallback(() => {
    const r = () => Math.random();
    const qs = buildGameRound(cities, r);
    setQuestions(qs);
    setQIndex(0);
    setScore(0);
    setStreak(0);
    scoreRef.current = 0;
    correctRef.current = 0;
    const st = loadState();
    streakRef.current = st.currentStreak || 0;
    setStreak(streakRef.current);
    globalSwapsRef.current = MAX_GLOBAL_SWAPS;
    setGlobalSwaps(MAX_GLOBAL_SWAPS);
    setLocalSwaps(0);
    setImgOffset(0);
    setAnswered(false);
    setPicked(null);
    setIntro(false);
    startMs.current = Date.now();
    pauseTotalMs.current = 0;
    correctCityIdsRef.current = [];
  }, [cities]);

  useEffect(() => {
    setRoundBootstrapped(false);
  }, [gameKey, resumeSnapshot]);

  useEffect(() => {
    if (roundBootstrapped) return;
    if (resumeSnapshot) {
      try {
        applyResume(resumeSnapshot);
      } catch {
        applyFresh();
      }
    } else {
      applyFresh();
    }
    setRoundBootstrapped(true);
  }, [roundBootstrapped, gameKey, resumeSnapshot, byId, applyFresh, cities.length]);

  const q: GameQuestion | undefined = questions[qIndex];
  const displayIdx = q
    ? (q.imageIndex + imgOffset) % Math.max(1, q.city.images.length)
    : 0;
  const image = q?.city.images[displayIdx];

  useEffect(() => {
    if (!q) return;
    const n = q.city.images.length;
    const di = (q.imageIndex + imgOffset) % n;
    markImageSeen(q.city.id, di);
  }, [q, qIndex, imgOffset, gameKey]);

  const persistWip = useCallback(() => {
    const list = questionsRef.current;
    if (list.length !== TOTAL_Q) return;
    if (!q) return;
    const w: WipState = {
      version: 1,
      gameKey,
      tourRound,
      qIndex,
      serialized: serializeQuestions(list),
      score: scoreRef.current,
      correct: correctRef.current,
      globalSwaps,
      localSwaps,
      imgOffset,
      startMs: startMs.current,
      pauseTotalMs: pauseTotalMs.current,
      answered,
      picked,
      streak: streakRef.current,
    };
    saveWip(w);
  }, [
    gameKey,
    q,
    qIndex,
    tourRound,
    globalSwaps,
    localSwaps,
    imgOffset,
    answered,
    picked,
  ]);

  useEffect(() => {
    if (questionsRef.current.length < TOTAL_Q) return;
    const t = setTimeout(persistWip, 80);
    return () => clearTimeout(t);
  }, [persistWip, qIndex, score, answered, globalSwaps, localSwaps, imgOffset, picked, questions.length]);

  const goNext = useCallback(() => {
    if (qIndex + 1 >= TOTAL_Q) {
      onFinish({
        score: scoreRef.current,
        correctCount: correctRef.current,
        totalTimeSec: Math.max(
          0,
          Math.floor(
            (Date.now() - startMs.current - pauseTotalMs.current) / 1000
          )
        ),
        hintsUsed: MAX_GLOBAL_SWAPS - globalSwapsRef.current,
        streakAtEnd: streakRef.current,
        cityIds: questionsRef.current.map((x) => x.city.id),
        correctCityIds: [...new Set(correctCityIdsRef.current)],
      });
      return;
    }
    setQIndex((i) => i + 1);
    setLocalSwaps(0);
    setImgOffset(0);
    setAnswered(false);
    setPicked(null);
    setIntro(false);
  }, [qIndex, onFinish]);

  const onPick = (cityId: string) => {
    if (!q || answered) return;
    setPicked(cityId);
    setAnswered(true);
    if (cityId === q.correctId) {
      correctCityIdsRef.current.push(q.city.id);
      const pts = scoreForAnswer(true, localSwaps);
      const ns = scoreRef.current + pts;
      const nc = correctRef.current + 1;
      const nst = streakRef.current + 1;
      scoreRef.current = ns;
      correctRef.current = nc;
      streakRef.current = nst;
      setScore(ns);
      setStreak(nst);
    } else {
      streakRef.current = 0;
      setStreak(0);
    }
  };

  const openIntro = () => {
    introOpenAt.current = Date.now();
    setIntro(true);
  };

  const closeIntro = () => {
    if (introOpenAt.current) {
      pauseTotalMs.current += Date.now() - introOpenAt.current;
      introOpenAt.current = null;
    }
    setIntro(false);
    // 只关闭介绍弹窗，回到已作答状态；是否进入下一题由用户点「下一题 →」决定
  };

  const onNextNoIntro = () => {
    goNext();
  };

  const isLastQuestion = qIndex >= TOTAL_Q - 1;
  const swapDisabled =
    !q ||
    answered ||
    globalSwaps === 0 ||
    localSwaps >= 2 ||
    q.city.images.length < 2;

  const doSwap = () => {
    if (!q || answered) return;
    if (globalSwaps <= 0) return;
    if (localSwaps >= 2) return;
    if (q.city.images.length < 2) return;
    setGlobalSwaps((g) => g - 1);
    setLocalSwaps((l) => l + 1);
    setImgOffset((o) => o + 1);
  };

  if (!q || !image || questions.length === 0) {
    return <div className="min-h-dvh bg-[#0F1923] text-white p-4">准备题目…</div>;
  }

  const swapLabelShort =
    globalSwaps === 0 ? '换图已用完' : `换一张（剩${globalSwaps}）`;

  return (
    <div className="mx-auto flex h-dvh max-h-dvh min-h-0 w-full max-w-6xl flex-col overflow-hidden bg-[#0F1923] pb-[calc(16px+env(safe-area-inset-bottom))] text-[#F0F4F8]">
      <header className="grid h-11 shrink-0 grid-cols-3 items-center gap-1 px-2 text-[12px] sm:px-3">
        <div className="min-w-0 text-left">
          <span className="text-[#7A9AB8]">第 {tourRound} 局 · </span>
          <span className="font-medium text-white">{qIndex + 1}</span>
          <span className="text-[#7A9AB8]">/20</span>
        </div>
        <div className="flex min-w-0 justify-center">
          <button
            type="button"
            onClick={doSwap}
            disabled={swapDisabled}
            className={`max-w-[10rem] truncate bg-transparent p-0 text-center text-[12px] leading-tight disabled:cursor-not-allowed ${
              globalSwaps === 0
                ? 'text-[#5A7A9A]'
                : 'text-[#6B9DC9] disabled:opacity-45'
            }`}
          >
            {swapLabelShort}
          </button>
        </div>
        <div className="text-right">
          <span className="font-medium text-[#E94560]">{score}</span>
          <span className="text-[#7A9AB8]">分</span>
        </div>
      </header>
      <div className="h-1 shrink-0 overflow-hidden rounded-full bg-white/10 px-4">
        <div
          className="h-full rounded-full bg-[#E94560] transition-all"
          style={{ width: `${((qIndex + 1) / 20) * 100}%` }}
        />
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        <GameImageViewport key={`${gameKey}-${qIndex}-${displayIdx}-${image.url}`} src={localImageUrl(image.url)} />
      </div>

      <div className="flex shrink-0 flex-col px-4 pt-2">
        <div className="grid grid-cols-2 gap-2">
          {q.optionCities.map((c) => {
            const show = answered;
            const isCor = c.id === q.correctId;
            const isPick = c.id === picked;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                disabled={answered}
                className={`h-11 rounded-[12px] border px-2 text-[15px] leading-none duration-300 ease-in-out ${
                  show && isCor
                    ? 'border-[#59C882] bg-[rgba(89,200,130,0.15)] text-[#F0F4F8]'
                    : show && isPick && !isCor
                      ? 'border-red-400/80 bg-[rgba(233,69,96,0.2)] text-[#F0F4F8]'
                      : 'border-white/10 bg-white/5 text-[#C0D0E0] active:border-[#E94560]/50'
                }`}
              >
                {c.name_zh}
              </button>
            );
          })}
        </div>

        {answered && !intro && (
          <div className="mt-2 w-full max-w-md shrink-0 self-center">
            <p className="text-center text-[14px] text-[#7A9AB8]">
              正确答案：{q.city.name_zh}，{q.city.country_zh}
            </p>
            <div className="mt-2 flex h-11 items-center justify-between gap-2">
              <button
                type="button"
                onClick={openIntro}
                className="min-w-0 shrink bg-transparent p-0 text-left text-[13px] text-[#6B9DC9] underline underline-offset-2"
              >
                了解这座城市
              </button>
              <button
                type="button"
                onClick={onNextNoIntro}
                className="h-11 shrink-0 rounded-[12px] bg-[#E94560] px-3.5 text-[15px] font-medium text-white"
              >
                {isLastQuestion ? '查看成绩 →' : '下一题 →'}
              </button>
            </div>
          </div>
        )}
      </div>

      {intro && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-[12px] border border-white/10 bg-[#0F1923] p-4">
            <p className="text-[14px] leading-[1.8] text-[#8AA0B8]">{image.description_zh}</p>
            <button
              type="button"
              onClick={closeIntro}
              className="mt-4 w-full rounded-[12px] py-[14px] text-[14px] font-medium text-[#8AA0B8] bg-transparent"
              style={{ border: '0.5px solid rgba(255, 255, 255, 0.15)' }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
