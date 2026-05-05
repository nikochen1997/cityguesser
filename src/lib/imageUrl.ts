/** 在 Unsplash 参数上提高宽度，作「原图」预览（非真正 raw，避免过大） */
export function getRawLikeUrl(url: string): string {
  if (url.includes('w=')) return url.replace(/w=\d+/, 'w=4096');
  return url;
}

export function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
