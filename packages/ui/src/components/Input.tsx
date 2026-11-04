import { TriangleAlert } from 'lucide-react';
import { useId, type InputHTMLAttributes } from 'react';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  helperText?: string;
  // 문자열이면 helperText 대신 에러 문구로 보여준다.
  error?: boolean | string;
  id?: string;
};

const Input = ({ label, helperText, error, id, className, disabled, ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = `${inputId}-helper`;
  const hasError = Boolean(error);
  const message = typeof error === 'string' ? error : helperText;

  // 테두리를 2px로 키울 때 레이아웃이 밀리지 않도록 border(1px) + ring-1 ring-inset 으로 겹친다.
  const stateClass = hasError
    ? 'border-border-danger ring-1 ring-inset ring-border-danger'
    : 'border-border-strong focus:border-border-brand focus:ring-1 focus:ring-inset focus:ring-border-brand';

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <label htmlFor={inputId} className="text-label-md text-text-heading">
        {label}
      </label>
      <input
        id={inputId}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={message ? helperId : undefined}
        className={`rounded-md border bg-bg-surface px-4 py-3 text-body-md text-text-body outline-none placeholder:text-text-placeholder disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:text-text-disabled ${stateClass}`}
        {...props}
      />
      {message ? (
        <p
          id={helperId}
          className={`flex items-center gap-1 text-body-sm ${hasError ? 'text-text-danger' : 'text-text-secondary'}`}
        >
          {hasError ? (
            <TriangleAlert size={14} aria-hidden className="shrink-0 text-icon-danger" />
          ) : null}
          {message}
        </p>
      ) : null}
    </div>
  );
};

export default Input;
