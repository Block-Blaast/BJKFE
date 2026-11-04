import type { ReactNode } from 'react';

type CardVariant = 'default' | 'highlight';

type CardProps = {
  title?: ReactNode;
  children?: ReactNode;
  variant?: CardVariant;
  className?: string;
};

const VARIANT_CLASS: Record<CardVariant, string> = {
  default: 'bg-bg-surface shadow-card',
  highlight: 'bg-bg-brand-subtle',
};

const Card = ({ title, children, variant = 'default', className }: CardProps) => {
  return (
    <section
      className={`flex flex-col gap-2 rounded-xl p-6 ${VARIANT_CLASS[variant]} ${className ?? ''}`}
    >
      {title ? <h3 className="text-h3 text-text-heading">{title}</h3> : null}
      {children ? <div className="text-body-md text-text-body">{children}</div> : null}
    </section>
  );
};

export default Card;
