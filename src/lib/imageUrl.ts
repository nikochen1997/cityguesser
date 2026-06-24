/**
 * 将 Unsplash URL 转为本地缓存路径。
 * 生产环境（VITE_USE_LOCAL_IMAGES=true）→ /images/photo-xxx.jpg
 * 开发环境 → 原始 Unsplash URL 不变
 */
const USE_LOCAL = import.meta.env.VITE_USE_LOCAL_IMAGES === 'true';

export function localImageUrl(url: string): string {
  if (!USE_LOCAL) return url;
  const m = url.match(/unsplash\.com\/(photo-[^?]+)/);
  if (!m) return url; // 非 Unsplash 链接，原样返回
  return `/images/${m[1]}.jpg`;
}

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
