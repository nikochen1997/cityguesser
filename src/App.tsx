import { useCallback, useEffect, useMemo, useState } from 'react';
import type { City } from './lib/types';
import {
  appendRecord,
  allQuizCitiesSeenOnce,
  clearSeenImagesKeepIdentity,
  loadState,
  percentileByScore,
  clearWip,
  validateWip,
  loadWip,
  resetTourSession,
} from './lib/storage';
import { totalTourRounds } from './lib/tour';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { EasterEggPage } from './pages/EasterEggPage';
import type { AppScreen } from './lib/types';
import type { WipState } from './lib/wipTypes';

type FinishPayload = {
  score: number;
  correctCount: number;
  totalTimeSec: number;
  hintsUsed: number;
  streakAtEnd: number;
  cityIds: string[];
  correctCityIds: string[];
};

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [cities, setCities] = useState<City[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [nick, setNick] = useState('');
  const [gameKey, setGameKey] = useState(0);
  const [lastResult, setLastResult] = useState<FinishPayload | null>(null);
  const [tourAfterLast, setTourAfterLast] = useState(0);
  const [lbKey, setLbKey] = useState(0);
  const [resumeForGame, setResumeForGame] = useState<WipState | null>(null);
  const [pendingWip, setPendingWip] = useState<WipState | null>(null);
  const [easterUnlockOffer, setEasterUnlockOffer] = useState(false);

  const cityMap = useMemo(
    () => new Map(cities.map((c) => [c.id, c] as const)),
    [cities]
  );

  const tr = useMemo(() => totalTourRounds(cities), [cities]);

  const tourRoundForGame = useMemo(() => {
    if (resumeForGame) return resumeForGame.tourRound;
    const c = loadState().tourSessionCompleted || 0;
    if (c >= tr) return 1;
    return c + 1;
  }, [resumeForGame, tr, gameKey, screen]);

  useEffect(() => {
    fetch('/cityguesser_quizbank.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d) => setCities(d.cities))
      .catch(() => setLoadErr('无法加载题库，请确认 public/cityguesser_quizbank.json 存在'));
  }, []);

  useEffect(() => {
    if (cities.length === 0) return;
    const w = loadWip();
    if (!w) {
      setPendingWip(null);
      return;
    }
    const valid = validateWip(w, cityMap);
    setPendingWip(valid);
  }, [cities, cityMap]);

  const goGame = useCallback((resume: WipState | null) => {
    setResumeForGame(resume);
    if (resume) {
      setGameKey(resume.gameKey);
    } else {
      setGameKey((k) => k + 1);
    }
    setScreen('game');
  }, []);

  const onStart = (n: string) => {
    setNick(n);
    goGame(null);
  };

  const onFinish = (p: FinishPayload) => {
    clearWip();
    setResumeForGame(null);
    setLastResult(p);
    const name = nick.trim() || '探索者';
    const newTour = appendRecord(
      {
        nickname: name,
        score: p.score,
        correctCount: p.correctCount,
        totalTimeSec: p.totalTimeSec,
        hintsUsed: p.hintsUsed,
        at: Date.now(),
        streakAtEnd: p.streakAtEnd,
        correctCityIds: p.correctCityIds,
      },
      p.cityIds,
      p.streakAtEnd,
      tr
    );
    setTourAfterLast(newTour);
    const st2 = loadState();
    setEasterUnlockOffer(
      allQuizCitiesSeenOnce(cities.map((c) => c.id)) && !st2.easterEggDone
    );
    setScreen('result');
  };

  const openLeaderboard = () => {
    setLbKey((k) => k + 1);
    setScreen('leaderboard');
  };

  const onResumeWip = (w: WipState) => {
    setPendingWip(null);
    goGame(w);
  };

  const onAbandonWip = () => {
    setPendingWip(null);
  };

  if (loadErr) {
    return (
      <div className="min-h-dvh bg-[#0F1923] text-red-300 flex items-center justify-center p-4">
        {loadErr}
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <div className="min-h-dvh bg-[#0F1923] text-[#7A9AB8] flex items-center justify-center">
        正在加载题库…
      </div>
    );
  }

  if (screen === 'easter') {
    return (
      <EasterEggPage
        cities={cities}
        onCompleteToHome={() => {
          setScreen('home');
        }}
        onPlayAgain={() => {
          clearSeenImagesKeepIdentity();
          clearWip();
          setResumeForGame(null);
          resetTourSession();
          goGame(null);
        }}
      />
    );
  }

  if (screen === 'game') {
    return (
      <GamePage
        key={`${gameKey}-${resumeForGame ? 'r' : 'n'}`}
        cities={cities}
        gameKey={gameKey}
        tourRound={tourRoundForGame}
        resumeSnapshot={resumeForGame}
        onFinish={onFinish}
      />
    );
  }

  if (screen === 'result' && lastResult) {
    const p = lastResult;
    const allDone = tourAfterLast >= tr;
    return (
      <ResultPage
        score={p.score}
        correct={p.correctCount}
        timeSec={p.totalTimeSec}
        hints={p.hintsUsed}
        rankPercent={percentileByScore(p.score)}
        totalRounds={tr}
        tourCompletedThisSession={tourAfterLast}
        tourAllDone={allDone}
        easterUnlockOffer={easterUnlockOffer}
        onEaster={() => {
          setScreen('easter');
        }}
        onContinueNext={() => {
          goGame(null);
        }}
        onStartNewCycle={() => {
          resetTourSession();
          goGame(null);
        }}
        onHome={() => {
          setScreen('home');
          setLastResult(null);
          setEasterUnlockOffer(false);
        }}
        onRank={openLeaderboard}
        onShare={async () => {
          const text = `CityGuesser：我得了 ${p.score} 分 / 200，答对 ${p.correctCount} 题，用时 ${p.totalTimeSec} 秒。你行吗？`;
          try {
            if (navigator.share) await navigator.share({ text, title: 'CityGuesser' });
            else await navigator.clipboard.writeText(text);
          } catch {
            try {
              await navigator.clipboard.writeText(text);
            } catch {
              /* ignore */
            }
          }
        }}
      />
    );
  }

  if (screen === 'leaderboard') {
    return (
      <LeaderboardPage
        onBack={() => setScreen('home')}
        me={nick.trim() || loadState().nickname}
        refreshKey={lbKey}
      />
    );
  }

  return (
    <HomePage
      cityCount={cities.length}
      onStart={onStart}
      onLeaderboard={openLeaderboard}
      pendingWip={pendingWip}
      onResumeWip={onResumeWip}
      onAbandonWip={onAbandonWip}
    />
  );
}
