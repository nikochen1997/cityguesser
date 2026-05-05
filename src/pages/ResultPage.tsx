import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { formatTime } from '../lib/imageUrl';
import { hasEasterIntroAnimationPlayed, markEasterIntroAnimationPlayed } from '../lib/storage';

export function ResultPage({
  score,
  correct,
  timeSec,
  hints,
  rankPercent,
  totalRounds,
  tourCompletedThisSession,
  onContinueNext,
  onStartNewCycle,
  onHome,
  onRank,
  onShare,
  tourAllDone,
  easterUnlockOffer,
  onEaster,
}: {
  score: number;
  correct: number;
  timeSec: number;
  hints: number;
  rankPercent: number;
  totalRounds: number;
  /** 本轮回合在本局打完后，已累计完成几局 */
  tourCompletedThisSession: number;
  onContinueNext: () => void;
  onStartNewCycle: () => void;
  onHome: () => void;
  onRank: () => void;
  onShare: () => void;
  /** 本轮回合已全部打完最后一局 */
  tourAllDone: boolean;
  easterUnlockOffer: boolean;
  onEaster: () => void;
}) {
  const [show, setShow] = useState(0);
  const [showCaption, setShowCaption] = useState(false);
  const [eggCardVisible, setEggCardVisible] = useState(
    () => Boolean(easterUnlockOffer && hasEasterIntroAnimationPlayed())
  );
  const [eggCardKey, setEggCardKey] = useState(0);

  const interruptRef = useRef<(() => void) | null>(null);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let s = 0;
    const id = setInterval(() => {
      s = Math.min(score, s + Math.max(1, Math.ceil((score - s) / 10)));
      setShow(s);
      if (s >= score) window.clearInterval(id);
    }, 50);
    return () => window.clearInterval(id);
  }, [score]);

  const clearAnimTimers = useCallback(() => {
    timersRef.current.forEach((tid) => window.clearTimeout(tid));
    timersRef.current = [];
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const revealEggCard = useCallback(() => {
    markEasterIntroAnimationPlayed();
    setShowCaption(false);
    setEggCardVisible(true);
    setEggCardKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!easterUnlockOffer || hasEasterIntroAnimationPlayed()) {
      if (easterUnlockOffer) setEggCardVisible(true);
      interruptRef.current = null;
      return;
    }

    let cancelled = false;

    const finishOrInterrupt = () => {
      if (cancelled) return;
      cancelled = true;
      clearAnimTimers();
      interruptRef.current = null;
      revealEggCard();
    };

    interruptRef.current = finishOrInterrupt;

    const tFireworks = window.setTimeout(() => {
      const end = Date.now() + 1500;
      intervalRef.current = window.setInterval(() => {
        if (cancelled || Date.now() > end) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }
        confetti({
          particleCount: 42,
          spread: 58,
          origin: { x: 0.1, y: 0.05 },
          colors: ['#FFD700', '#FF8C00', '#FFFFFF', '#FFA500'],
          ticks: 120,
          gravity: 1.05,
        });
        confetti({
          particleCount: 42,
          spread: 58,
          origin: { x: 0.9, y: 0.05 },
          colors: ['#FFD700', '#FF8C00', '#FFFFFF', '#FFA500'],
          ticks: 120,
          gravity: 1.05,
        });
      }, 230);
    }, 1000);
    timersRef.current.push(tFireworks);

    const tCaption = window.setTimeout(() => {
      if (cancelled) return;
      setShowCaption(true);
    }, 2500);
    timersRef.current.push(tCaption);

    const tReveal = window.setTimeout(() => {
      if (cancelled) return;
      finishOrInterrupt();
    }, 3500);
    timersRef.current.push(tReveal);

    return () => {
      cancelled = true;
      clearAnimTimers();
      interruptRef.current = null;
    };
  }, [easterUnlockOffer, clearAnimTimers, revealEggCard]);

  const wrapInterrupt = useCallback(
    (fn: () => void) => () => {
      interruptRef.current?.();
      fn();
    },
    []
  );

  const nextRoundNum = Math.min(tourCompletedThisSession + 1, totalRounds);

  return (
    <div className="relative mx-auto flex min-h-dvh max-h-dvh w-full max-w-lg flex-col overflow-y-auto bg-[#0F1923] px-7 text-[#F0F4F8]">
      {showCaption && (
        <div
          className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center"
          aria-hidden
        >
          <p
            className="cg-caption-pop text-2xl font-medium text-[#FFD700] opacity-0"
            style={{ textShadow: '0 0 24px rgba(255,215,0,0.35)' }}
          >
            🎉 One More Thing...
          </p>
        </div>
      )}

      <p className="mt-10 text-center text-[12px] tracking-[4px] text-[#5A7A9A]">
        CHALLENGE COMPLETE
      </p>
      <p className="mt-1 text-center text-[13px] text-[#7A9AB8]">本局成绩</p>
      <div className="mt-6 text-center">
        <span className="text-[64px] font-medium leading-none text-[#E94560] sm:text-[72px]">
          {show}
        </span>
        <span className="text-[14px] text-[#5A7A9A]"> / 200 分</span>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2.5">
        {[
          { n: String(correct), l: '答对题数' },
          { n: formatTime(timeSec), l: '总用时' },
          { n: String(hints), l: '换图次数' },
        ].map((x) => (
          <div key={x.l} className="rounded-[12px] bg-white/[0.04] py-4 text-center">
            <div className="text-2xl font-medium text-[#F0F4F8]">{x.n}</div>
            <div className="mt-1 text-[11px] text-[#5A7A9A]">{x.l}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[12px] border border-[#E94560]/20 bg-[rgba(233,69,96,0.08)] py-4 text-center">
        <p className="text-[13px] text-[#E94560]">
          你超越了 <span className="text-lg font-medium">{rankPercent}</span> % 的玩家
        </p>
        <p className="mt-1 text-[12px] text-[#5A7A9A]">（基于本机历史记录估算）</p>
      </div>

      {easterUnlockOffer && eggCardVisible && (
        <div
          key={eggCardKey}
          className="egg-slide-in mt-5 rounded-[12px] bg-[rgba(255,215,0,0.06)] px-4 py-3 text-center"
          style={{ border: '0.5px solid rgba(255, 215, 0, 0.3)' }}
        >
          <p className="text-[12px] text-[#FFD700]">你已完成环球图鉴，已解锁隐藏彩蛋</p>
          <button
            type="button"
            onClick={wrapInterrupt(onEaster)}
            className="mt-2 w-full rounded-[12px] py-3 text-[15px] font-medium text-[#1A1A2E] shadow-sm"
            style={{ background: 'linear-gradient(135deg, #FFD700, #FF8C00)' }}
          >
            恭喜通关！解锁隐藏关卡
          </button>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2.5 pb-6 pt-4">
        {!tourAllDone && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={wrapInterrupt(onContinueNext)}
              className="w-full rounded-[14px] bg-[#E94560] py-4 font-medium text-white"
            >
              继续第 {nextRoundNum} 局 →
            </button>
            <p className="text-center text-[12px] text-[#5A7A9A]">
              本轮共 {totalRounds} 局，已完成 {Math.min(tourCompletedThisSession, totalRounds)} 局
            </p>
          </div>
        )}
        {tourAllDone && !easterUnlockOffer && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={wrapInterrupt(onStartNewCycle)}
              className="w-full rounded-[14px] bg-[#E94560] py-4 font-medium text-white"
            >
              开始新一轮 →
            </button>
            <p className="text-center text-[12px] text-[#5A7A9A]">新一轮将展示不同的城市图片</p>
          </div>
        )}
        <button
          type="button"
          onClick={wrapInterrupt(onHome)}
          className="w-full rounded-[14px] border border-white/10 bg-white/[0.04] py-3 text-[14px] text-[#7A9AB8]"
        >
          返回首页
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={wrapInterrupt(onRank)}
            className="rounded-[14px] border border-white/10 bg-white/[0.06] py-3 text-[14px] text-[#8AA0B8]"
          >
            排行榜
          </button>
          <button
            type="button"
            onClick={wrapInterrupt(onShare)}
            className="rounded-[14px] border border-white/10 bg-white/[0.06] py-3 text-[14px] text-[#8AA0B8]"
          >
            分享成绩
          </button>
        </div>
      </div>
    </div>
  );
}
