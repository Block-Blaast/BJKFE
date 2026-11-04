import localFont from 'next/font/local';

// Pretendard (OFL-1.1). 가변 폰트 하나로 400·500·700을 모두 쓴다.
// next/font 가 self-host 하므로 외부 CDN 요청이 없다.
export const pretendard = localFont({
  src: '../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '45 920',
  display: 'swap',
  // 기본값이면 크기 보정된 Arial 이 Noto Sans KR 보다 앞에 끼어든다. Figma 폴백 순서를 지키기 위해 끈다.
  adjustFontFallback: false,
  fallback: ['Noto Sans KR', 'system-ui', 'sans-serif'],
});
