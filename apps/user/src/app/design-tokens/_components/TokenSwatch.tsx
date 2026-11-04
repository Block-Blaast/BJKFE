'use client';

import { useSyncExternalStore } from 'react';

type TokenSwatchProps = {
  cssVar: string;
  label: string;
  caption?: string;
};

const subscribe = () => () => {};

// 실제 브라우저에 적용된 값을 읽어 보여준다. Figma 스와치의 hex 와 눈으로 대조하는 용도다.
const TokenSwatch = ({ cssVar, label, caption }: TokenSwatchProps) => {
  const value = useSyncExternalStore(
    subscribe,
    () => getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim().toUpperCase(),
    () => '',
  );

  return (
    <div className="flex w-24 flex-col gap-1">
      <div
        className="h-14 rounded-md border border-border-default"
        // 토큰 이름을 데이터로 받아 그리는 문서 페이지라 클래스 대신 CSS 변수를 직접 참조한다.
        style={{ backgroundColor: `var(${cssVar})` }}
      />
      <span className="text-label-sm text-text-heading">{label}</span>
      {caption ? <span className="text-label-sm text-text-secondary">{caption}</span> : null}
      <span className="text-label-sm text-text-secondary tabular-nums">{value}</span>
    </div>
  );
};

export default TokenSwatch;
