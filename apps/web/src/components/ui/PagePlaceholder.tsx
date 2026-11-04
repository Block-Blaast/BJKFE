import type { ReactNode } from 'react';

type PagePlaceholderProps = {
  specId: string;
  title: string;
  description: string;
  // 명세서 15장의 "주요 요소". 구현하면서 하나씩 실제 UI 로 바꾼다.
  elements: string[];
  children?: ReactNode;
};

// 화면 골격 단계의 자리 표시. 실제 화면을 만들면 이 컴포넌트를 지운다.
const PagePlaceholder = ({
  specId,
  title,
  description,
  elements,
  children,
}: PagePlaceholderProps) => {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-label-sm text-text-secondary">{specId}</span>
        <h1 className="text-h2 text-text-heading">{title}</h1>
        <p className="text-body-md text-text-secondary">{description}</p>
      </div>
      {children}
      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border-strong bg-bg-surface p-6">
        <span className="text-label-md text-text-heading">구현할 요소</span>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-text-body">
          {elements.map((element) => (
            <li key={element}>{element}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default PagePlaceholder;
