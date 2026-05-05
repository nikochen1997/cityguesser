import { useState } from 'react';
import { EasterCompletionPoster } from '../components/EasterCompletionPoster';
import { setEasterDone } from '../lib/storage';
import type { City } from '../lib/types';

const OPTIONS: { id: string; name: string; correct: boolean }[] = [
  { id: 'shanghai', name: '上海', correct: true },
  { id: 'beijing', name: '北京', correct: true },
  { id: 'lhasa', name: '拉萨', correct: true },
  { id: 'leshan', name: '乐山', correct: true },
  { id: 'agra', name: '阿格拉', correct: true },
  { id: 'dubai', name: '迪拜', correct: true },
  { id: 'cairo', name: '开罗', correct: true },
  { id: 'nyc', name: '纽约', correct: true },
  { id: 'paris', name: '巴黎', correct: false },
  { id: 'london', name: '伦敦', correct: false },
];

const CORRECT_ANSWER_LINE =
  '上海、北京、拉萨、乐山、阿格拉、迪拜、开罗、纽约';

export function EasterEggPage({
  cities,
  onCompleteToHome,
  onPlayAgain,
}: {
  cities: City[];
  onCompleteToHome: () => void;
  onPlayAgain: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#0F1923] p-4 pb-28 text-[#F0F4F8]">
      <h1 className="mt-4 text-center text-lg font-medium">环球彩蛋题</h1>
      <p className="mt-2 mb-4 px-2 text-center text-[13px] text-[#7A9AB8]">
        多选题：这张图里藏了哪些城市？
      </p>
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10">
        <img
          src="/easter-egg.jpg"
          alt="全球地标合成长图"
          className="h-[min(48vh,420px)] w-full max-h-[50vh] object-cover object-top sm:max-h-[50vh]"
        />
      </div>
      <EasterForm cities={cities} onCompleteToHome={onCompleteToHome} onPlayAgain={onPlayAgain} />
    </div>
  );
}

function EasterForm({
  cities,
  onCompleteToHome,
  onPlayAgain,
}: {
  cities: City[];
  onCompleteToHome: () => void;
  onPlayAgain: () => void;
}) {
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [completedAt] = useState(() => new Date());
  const correctIds = new Set(OPTIONS.filter((o) => o.correct).map((o) => o.id));
  const wrongIds = new Set(OPTIONS.filter((o) => !o.correct).map((o) => o.id));

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function submit() {
    const pickedCorrect = [...sel].filter((id) => correctIds.has(id)).length;
    const pickedWrong = [...sel].filter((id) => wrongIds.has(id)).length;
    const ok =
      pickedCorrect === 8 && pickedWrong === 0 && sel.size === 8;
    if (!ok) {
      setMsg('答案还不完全对，再想想看？');
      return;
    }
    setMsg(null);
    setEasterDone();
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto mt-6 w-full max-w-md space-y-6 text-center">
        <div className="rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-3 text-left">
          <p className="mb-1.5 text-[12px] text-[#5A7A9A]">正确答案</p>
          <p className="text-[14px] leading-relaxed text-[#B8C8D8]">{CORRECT_ANSWER_LINE}</p>
        </div>
        <p className="px-1 text-[14px] leading-relaxed text-[#8AA0B8]">
          恭喜你完成了环球之旅！从上海到纽约，你已经用眼睛走遍了世界。下一站，出发去真正的旅途吧。
        </p>

        <EasterCompletionPoster cities={cities} completedAt={completedAt} />

        <button
          type="button"
          onClick={onCompleteToHome}
          className="w-full rounded-[14px] bg-[#E94560] py-3.5 text-[15px] font-medium text-white"
        >
          完成
        </button>
        <div className="pt-1">
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full rounded-[14px] border border-white/15 bg-transparent py-3 text-[15px] text-[#7A9AB8]"
          >
            再玩一轮
          </button>
          <p className="mt-2 px-1 text-center text-[12px] leading-relaxed text-[#5A7A9A]">
            重新开始后，每个城市将展示不同的图片
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto mt-4 grid w-full max-w-md grid-cols-2 gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.id}
            className={`flex cursor-pointer items-center gap-2 rounded-[12px] border px-3 py-2.5 text-[15px] ${
              sel.has(o.id)
                ? 'border-[#E94560] bg-[rgba(233,69,96,0.15)] text-[#F0F4F8]'
                : 'border-white/10 bg-white/5 text-[#C0D0E0]'
            }`}
          >
            <input
              type="checkbox"
              checked={sel.has(o.id)}
              onChange={() => toggle(o.id)}
              className="rounded border-white/20"
            />
            {o.name}
          </label>
        ))}
      </div>
      {msg && (
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-[#E94560]">{msg}</p>
      )}
      <p className="mt-3 text-center text-xs text-[#5A7A9A]">此题不计分，纯粹好玩</p>
      <button
        type="button"
        onClick={submit}
        className="mx-auto mt-4 w-full max-w-md rounded-[14px] bg-[#E94560] py-3.5 font-medium text-white"
      >
        提交
      </button>
    </>
  );
}
