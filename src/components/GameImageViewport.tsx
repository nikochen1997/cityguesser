import { useCallback, useRef, useState } from 'react';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

type FitMode = 'cover' | 'contain';

/**
 * v1.4 修改 16：滚轮/双指缩放、拖拽平移；双击 / 双触切换 cover ↔ contain。
 * 父级请使用 key={局内唯一}，进入下一题时 remount 以恢复默认 cover。
 */
export function GameImageViewport({ src }: { src: string }) {
  const [fitMode, setFitMode] = useState<FitMode>('cover');
  const [minScaleCover, setMinScaleCover] = useState(0.35);
  const lastTapRef = useRef(0);

  const wrapperKey = `${src}-${fitMode}`;

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const outer = img.closest('[data-rzp="viewport"]') as HTMLElement | null;
    if (!outer) return;
    const w = outer.clientWidth || 1;
    const h = outer.clientHeight || 1;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const coverScale = Math.max(w / nw, h / nh);
    const containScale = Math.min(w / nw, h / nh);
    if (coverScale > 0) {
      setMinScaleCover(Math.max(0.05, containScale / coverScale));
    }
  }, []);

  const toggleFit = useCallback(() => {
    setFitMode((m) => (m === 'cover' ? 'contain' : 'cover'));
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        e.preventDefault();
        toggleFit();
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    },
    [toggleFit]
  );

  return (
    <div data-rzp="viewport" className="relative h-full w-full min-h-0 touch-none bg-black">
      <TransformWrapper
        key={wrapperKey}
        minScale={fitMode === 'contain' ? 1 : minScaleCover}
        maxScale={3}
        initialScale={1}
        centerOnInit
        limitToBounds
        centerZoomedOut
        wheel={{ step: 0.12, wheelDisabled: false }}
        pinch={{ step: 8, disabled: false }}
        panning={{ disabled: false, velocityDisabled: true }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperClass="!h-full !w-full !max-h-full !max-w-full"
          contentClass="!flex !h-full !w-full !max-h-full !max-w-full items-center justify-center"
        >
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={onImageLoad}
            onDoubleClick={(e) => {
              e.preventDefault();
              toggleFit();
            }}
            onTouchEnd={onTouchEnd}
            className={`select-none ${
              fitMode === 'cover'
                ? 'h-full w-full object-cover'
                : 'max-h-full max-w-full object-contain'
            }`}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
