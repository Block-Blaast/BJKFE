import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-bg-brand text-text-on-brand hover:bg-bg-brand-hover active:bg-bg-brand-pressed disabled:bg-bg-disabled disabled:text-text-disabled',
  secondary:
    'bg-bg-brand-subtle text-text-brand hover:bg-bg-brand-subtle-hover active:bg-bg-brand-subtle-pressed disabled:bg-bg-disabled disabled:text-text-disabled',
  ghost:
    'bg-transparent text-text-brand hover:bg-bg-brand-subtle active:bg-bg-brand-subtle-hover disabled:bg-transparent disabled:text-text-disabled',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: 'px-5 py-3 text-label-md',
  lg: 'px-6 py-4 text-label-lg',
};

const Button = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) => {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-md transition-colors disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className ?? ''}`}
      {...props}
    />
  );
};

export default Button;
