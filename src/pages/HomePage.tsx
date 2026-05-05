import { useState, useEffect } from 'react';
import { loadState, setNickname, clearWip } from '../lib/storage';
import type { WipState } from '../lib/wipTypes';

export function HomePage({
  onStart,
  onLeaderboard,
  cityCount,
  pendingWip,
  onResumeWip,
  onAbandonWip,
}: {
  onStart: (nickname: string) => void;
  onLeaderboard: () => void;
  cityCount: number;
  pendingWip: WipState | null;
  onResumeWip: (w: WipState) => void;
  onAbandonWip: () => void;
}) {
  const [nick, setNick] = useState('');
  const [explorers, setExplorers] = useState(1247);

  useEffect(() => {
    const st = loadState();
    if (st.nickname) setNick(st.nickname);
    setExplorers(Math.max(1247, 1240 + (st.explorerSeeds || 0) + (st.totalGames || 0)));
  }, [cityCount]);

  return (
    <div
      className="min-h-dvh flex flex-col items-center bg-[#0F1923] text-[#F0F4F8] px-8 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(15,25,35,0.92) 0%, #0F1923 100%), 
          repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 32px)`,
      }}
    >
      {pendingWip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-[12px] border border-white/10 bg-[#0F1923] p-5">
            <p className="text-[15px] text-[#F0F4F8] text-center">
              你有未完成的第 {pendingWip.tourRound} 局
            </p>
            <p className="text-[13px] text-[#7A9AB8] text-center mt-2">
              已答{' '}
              {pendingWip.answered
                ? pendingWip.qIndex + 1
                : pendingWip.qIndex}{' '}
              / 20 题
            </p>
            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                onClick={() => onResumeWip(pendingWip)}
                className="w-full py-3 rounded-[14px] bg-[#E94560] text-white font-medium"
              >
                继续游戏
              </button>
              <button
                type="button"
                onClick={() => {
                  clearWip();
                  onAbandonWip();
                }}
                className="w-full py-3 rounded-[14px] border border-white/10 text-[#8AA0B8] text-sm"
              >
                放弃进度，重新开始
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm flex flex-col items-center z-10" style={{ marginTop: 140 }}>
        <p
          className="text-[11px] text-[#6B9DC9] uppercase text-center"
          style={{ letterSpacing: 6 }}
        >
          Global City Challenge
        </p>
        <h1 className="text-[42px] font-medium tracking-[-1px] mt-1">CityGuesser</h1>
        <p className="text-[15px] text-[#7A9AB8] mt-3">用眼睛环游世界</p>

        <div className="w-full mt-[60px]">
          <label className="text-[12px] text-[#5A7A9A] pl-1">你的昵称</label>
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="输入昵称开始挑战..."
            className="mt-1 w-full rounded-[12px] border border-white/10 bg-white/[0.06] px-4 py-3.5 text-[15px] text-[#F0F4F8] placeholder:text-[#4A6A8A] outline-none focus:border-[#E94560]/40"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            const t = nick.trim() || '探索者';
            setNickname(t);
            setNick(t);
            onStart(t);
          }}
          className="w-full mt-5 rounded-[14px] py-4 bg-[#E94560] text-white text-base font-medium"
        >
          开始游戏
        </button>
        <button
          type="button"
          onClick={onLeaderboard}
          className="w-full mt-4 rounded-[14px] py-3.5 border border-white/10 bg-white/[0.06] text-[14px] text-[#8AA0B8]"
        >
          排行榜
        </button>
      </div>
      <p className="absolute bottom-10 text-center text-[12px] text-[#3A5A7A]">
        已有 <span className="text-[#E94560] font-medium">{explorers.toLocaleString()}</span> 位探索者参与挑战
      </p>
    </div>
  );
}
