import { useMemo, useState } from 'react';
import { loadState } from '../lib/storage';
import { formatTime } from '../lib/imageUrl';
import type { GameRecord } from '../lib/types';

type Row = { nickname: string; score: number; time: number; streak: number };

function rankStyle(i: number) {
  if (i === 0) return 'bg-[rgba(255,215,0,0.06)] border border-[rgba(255,215,0,0.15)]';
  if (i === 1) return 'bg-[rgba(192,192,192,0.04)] border border-[rgba(192,192,192,0.12)]';
  if (i === 2) return 'bg-[rgba(205,127,50,0.04)] border border-[rgba(205,127,50,0.12)]';
  return 'bg-white/[0.02]';
}

function rankColor(i: number) {
  if (i === 0) return '#FFD700';
  if (i === 1) return '#C0C0C0';
  if (i === 2) return '#CD7F32';
  return '#5A7A9A';
}

export function LeaderboardPage({
  onBack,
  me,
  refreshKey = 0,
}: {
  onBack: () => void;
  me: string;
  refreshKey?: number;
}) {
  const [tab, setTab] = useState<'score' | 'streak'>('score');
  const { scoreRows, streakRows, myScoreRank, myStreakRank } = useMemo(() => {
    const st = loadState();
    const recs: GameRecord[] = st.records || [];
    const byNickScore = new Map<string, { score: number; time: number }>();
    const byNickStreak = new Map<string, number>();
    for (const r of recs) {
      const cur = byNickScore.get(r.nickname);
      if (!cur || r.score > cur.score || (r.score === cur.score && r.totalTimeSec < cur.time)) {
        byNickScore.set(r.nickname, { score: r.score, time: r.totalTimeSec });
      }
      byNickStreak.set(
        r.nickname,
        Math.max(byNickStreak.get(r.nickname) || 0, r.streakAtEnd)
      );
    }
    const scoreRows: Row[] = [...byNickScore.entries()].map(([nickname, v]) => ({
      nickname,
      score: v.score,
      time: v.time,
      streak: 0,
    }));
    scoreRows.sort((a, b) => b.score - a.score || a.time - b.time);
    const streakRows: Row[] = [...byNickStreak.entries()].map(([nickname, streak]) => ({
      nickname,
      score: 0,
      time: 0,
      streak,
    }));
    streakRows.sort((a, b) => b.streak - a.streak);
    const myScoreRank = scoreRows.findIndex((r) => r.nickname === me) + 1;
    const myStreakRank = streakRows.findIndex((r) => r.nickname === me) + 1;
    return { scoreRows, streakRows, myScoreRank, myStreakRank };
  }, [me, refreshKey]);

  const rows = tab === 'score' ? scoreRows.slice(0, 20) : streakRows.slice(0, 20);
  const myR = tab === 'score' ? myScoreRank : myStreakRank;

  return (
    <div className="min-h-dvh flex flex-col bg-[#0F1923] text-[#F0F4F8] max-w-lg mx-auto w-full px-4 pb-8">
      <header className="flex items-center gap-2 py-5">
        <button type="button" onClick={onBack} className="text-[#6B9DC9] text-lg px-1" aria-label="back">
          ←
        </button>
        <h1 className="text-lg font-medium">排行榜</h1>
      </header>
      <div className="flex rounded-[10px] bg-white/[0.04] p-1">
        <button
          type="button"
          onClick={() => setTab('score')}
          className={`flex-1 py-2.5 rounded-[8px] text-[13px] ${
            tab === 'score'
              ? 'bg-[rgba(233,69,96,0.15)] text-[#E94560] font-medium'
              : 'text-[#5A7A9A]'
          }`}
        >
          总分榜
        </button>
        <button
          type="button"
          onClick={() => setTab('streak')}
          className={`flex-1 py-2.5 rounded-[8px] text-[13px] ${
            tab === 'streak'
              ? 'bg-[rgba(233,69,96,0.15)] text-[#E94560] font-medium'
              : 'text-[#5A7A9A]'
          }`}
        >
          连胜榜
        </button>
      </div>
      {tab === 'streak' && (
        <p className="text-[12px] text-[#5A7A9A] mt-3 px-1 py-2 rounded-[10px] bg-white/[0.03]">
          连续答对题数（本机历史单局最好成绩，答错即断后重计）
        </p>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {rows.map((r, i) => {
          const isMe = r.nickname === me;
          return (
            <li
              key={`${r.nickname}-${i}-${tab}`}
              className={`flex items-center gap-3 rounded-[12px] px-4 py-3.5 ${rankStyle(i)} ${
                isMe ? 'ring-1 ring-[#E94560]/30' : ''
              }`}
            >
              <span
                className="w-7 text-center text-sm font-medium"
                style={{ color: rankColor(i) }}
              >
                {i + 1}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium"
                style={{ background: `${rankColor(i)}18`, color: rankColor(i) }}
              >
                {r.nickname.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${i < 3 ? 'font-medium text-[#F0F4F8]' : 'text-[#C0D0E0]'}`}>
                  {r.nickname}
                </div>
                {tab === 'score' && (
                  <div className="text-[11px] text-[#5A7A9A]">用时 {formatTime(r.time)}</div>
                )}
                {tab === 'streak' && (
                  <div className="text-[11px] text-[#5A7A9A]">连续答对</div>
                )}
              </div>
              {tab === 'score' && (
                <span className="text-lg font-medium" style={{ color: i < 3 ? rankColor(i) : '#F0F4F8' }}>
                  {r.score}
                </span>
              )}
              {tab === 'streak' && (
                <span className="text-lg font-medium text-[#E94560]">{r.streak}</span>
              )}
            </li>
          );
        })}
        {rows.length === 0 && <li className="text-center text-[#5A7A9A] py-8">暂无记录，先打一局</li>}
      </ul>
      {me && myR > 0 && (
        <div className="mt-3 rounded-[12px] border border-[#E94560]/20 bg-[rgba(233,69,96,0.08)] px-4 py-3 text-sm text-center text-[#E94560]">
          我的排名：{tab === 'score' ? '总分' : '连胜'} 第 {myR} 名
        </div>
      )}
    </div>
  );
}
