import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { loadState } from '../lib/storage';
import {
  aggregatePosterStats,
  accuracyPercent,
  buildCityImagePool,
  collectCorrectCityIdsFromRecords,
  formatDateCn,
  formatMmSs,
  shufflePosterAssets,
  titleTier,
} from '../lib/easterPoster';
import type { City } from '../lib/types';

const W = 750;
const H = 1334;
const PREVIEW_SCALE = 0.42;

export function EasterCompletionPoster({
  cities,
  completedAt,
}: {
  cities: City[];
  completedAt: Date;
}) {
  const cityById = useMemo(() => new Map(cities.map((c) => [c.id, c] as const)), [cities]);

  const [hideCorrect, setHideCorrect] = useState(false);
  const [hideTime, setHideTime] = useState(false);
  const [useGradientBg, setUseGradientBg] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState('');
  const [thumbUrls, setThumbUrls] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const stats = useMemo(() => aggregatePosterStats(loadState().records || []), []);

  const pool = useMemo(() => {
    const st = loadState();
    let ids = collectCorrectCityIdsFromRecords(st.records || []);
    if (!ids.length) ids = Object.keys(st.seenImages || {});
    if (!ids.length) ids = cities.map((c) => c.id);
    return buildCityImagePool(ids, cityById);
  }, [cities, cityById]);

  const reshuffle = useCallback(() => {
    setUseGradientBg(false);
    const rng = Math.random;
    if (!pool.length) {
      setBackgroundUrl('');
      setThumbUrls([]);
      setUseGradientBg(true);
      return;
    }
    const { backgroundUrl: bg, thumbUrls: th } = shufflePosterAssets(pool, rng);
    setBackgroundUrl(bg);
    setThumbUrls(th);
  }, [pool]);

  useEffect(() => {
    reshuffle();
  }, [reshuffle]);

  useEffect(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? `${window.location.origin}/`
        : 'CityGuesser（本地预览）';
    QRCode.toDataURL(origin, {
      width: 120,
      margin: 2,
      color: { dark: '#0F1923FF', light: '#FFFFFFFF' },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, []);

  const rate = accuracyPercent(stats.totalCorrect, stats.totalQuestions);
  const tier = titleTier(rate);
  const exploreCount = cities.length || 95;

  const shareUrl =
    typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
      ? `${window.location.origin}/`
      : '部署后可扫码访问线上版本';

  const downloadBlob = (blob: Blob | null) => {
    if (!blob) return;
    const name = `CityGuesser_通关海报_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.png`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const savePoster = async () => {
    const el = posterRef.current;
    if (!el) return;
    setSaving(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0f1923',
      });
      canvas.toBlob((b) => downloadBlob(b), 'image/png');
    } catch {
      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: false,
          backgroundColor: '#0f1923',
        });
        canvas.toBlob((b) => downloadBlob(b), 'image/png');
      } catch {
        alert('导出失败：若图片跨域受限，可长按上方海报预览区域尝试保存');
      }
    } finally {
      setSaving(false);
    }
  };

  const dataCols = (
    <>
      <div className="flex min-w-[120px] flex-col items-center">
        <span className="text-[36px] font-medium leading-none text-[#F0F4F8]">{exploreCount}</span>
        <span className="mt-1 text-[12px] text-[#7A9AB8]">城市探索</span>
      </div>
      {!hideCorrect && (
        <div className="flex min-w-[120px] flex-col items-center">
          <span className="text-[36px] font-medium leading-none text-[#F0F4F8]">{stats.totalCorrect}</span>
          <span className="mt-1 text-[12px] text-[#7A9AB8]">答对题数</span>
        </div>
      )}
      {!hideTime && (
        <div className="flex min-w-[120px] flex-col items-center">
          <span className="text-[36px] font-medium leading-none text-[#F0F4F8]">
            {formatMmSs(stats.totalTimeSec)}
          </span>
          <span className="mt-1 text-[12px] text-[#7A9AB8]">总耗时</span>
        </div>
      )}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <p className="text-center text-[12px] text-[#5A7A9A]">生成海报前可选择隐藏隐私数据</p>
      <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#8AA0B8]">
          <input
            type="checkbox"
            checked={hideCorrect}
            onChange={(e) => setHideCorrect(e.target.checked)}
            className="rounded border-white/20"
          />
          隐藏答对题数
        </label>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[13px] text-[#8AA0B8]">
          <input
            type="checkbox"
            checked={hideTime}
            onChange={(e) => setHideTime(e.target.checked)}
            className="rounded border-white/20"
          />
          隐藏总耗时
        </label>
      </div>

      <div
        className="mx-auto overflow-hidden rounded-xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        style={{ width: W * PREVIEW_SCALE, height: H * PREVIEW_SCALE }}
      >
        <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', width: W, height: H }}>
          <div
            ref={posterRef}
            className="relative overflow-hidden bg-[#0f1923]"
            style={{ width: W, height: H }}
          >
            {useGradientBg || !backgroundUrl ? (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1e3045] via-[#0f1923] to-[#2d2038]" />
            ) : (
              <img
                src={backgroundUrl}
                alt=""
                crossOrigin="anonymous"
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setUseGradientBg(true)}
              />
            )}
            <div className="absolute inset-0 bg-[rgba(15,25,35,0.75)]" />

            <div className="relative h-full">
              <div className="flex flex-col items-center px-10 pb-[240px] pt-[72px] text-center">
                <div className="text-[32px] font-medium leading-tight text-[#F0F4F8]">CityGuesser</div>
                <div className="mt-1 text-[14px] text-[#7A9AB8]">用眼睛环游世界</div>

                <div className="mt-[52px] text-[28px] font-medium leading-snug text-[#FFD700]">{tier.zh}</div>
                <div className="mt-2 text-[13px] tracking-wide text-[#7A9AB8]">{tier.en}</div>

                <div className="mt-10 flex flex-wrap justify-center gap-x-12 gap-y-6">{dataCols}</div>

                <div className="mt-[28px] text-[13px] text-[#5A7A9A]">通关于 {formatDateCn(completedAt)}</div>

                <div className="mt-10 flex flex-wrap justify-center gap-2.5">
                  {thumbUrls.map((u, i) => (
                    <img
                      key={`${u}-${i}`}
                      src={u}
                      alt=""
                      crossOrigin="anonymous"
                      width={160}
                      height={100}
                      className="h-[100px] w-[160px] rounded-[8px] object-cover"
                    />
                  ))}
                </div>
              </div>

              <div className="absolute bottom-[52px] left-0 right-0 flex flex-col items-center px-8">
                <span className="text-[13px] text-[#7A9AB8]">扫码挑战 →</span>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="" width={120} height={120} className="mt-2 rounded-lg bg-white p-2" />
                )}
                <span className="mt-2 max-w-[320px] break-all px-2 text-center text-[12px] leading-snug text-[#5A7A9A]">
                  {shareUrl}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={savePoster}
          disabled={saving}
          className="flex-1 rounded-[14px] bg-[#E94560] py-3 text-[15px] font-medium text-white disabled:opacity-60"
        >
          {saving ? '生成中…' : '保存海报'}
        </button>
        <button
          type="button"
          onClick={reshuffle}
          className="flex-1 rounded-[14px] border border-white/15 bg-transparent py-3 text-[15px] text-[#7A9AB8]"
        >
          换一张背景
        </button>
      </div>
      <p className="text-center text-[11px] text-[#5A7A9A]">移动端也可长按海报预览区域保存图片</p>
    </div>
  );
}
