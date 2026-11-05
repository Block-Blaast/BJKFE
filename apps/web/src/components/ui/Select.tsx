import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

import { FIELD, PILL_SELECT } from './controls';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  // pill: 필터 줄의 알약 / field: 폼 입력칸과 같은 모양
  variant: 'pill' | 'field';
};

// 기본 화살표는 브라우저가 오른쪽 끝에 붙여 그려서, 없애고 여백을 둔 아이콘을 직접 올린다.
// 오른쪽 여백 pr-12 = 아이콘 위치(right-4) + 아이콘(16px) + 글씨와의 틈. className 은 바깥 틀(너비·flex)에 붙는다.
const Select = ({ variant, className, children, ...props }: SelectProps) => (
  <span className={`relative inline-flex ${className ?? ''}`}>
    <select
      {...props}
      className={`${variant === 'pill' ? PILL_SELECT : FIELD} w-full appearance-none pr-12`}
    >
      {children}
    </select>
    <ChevronDown
      size={16}
      aria-hidden
      className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-text-secondary"
    />
  </span>
);

export default Select;
