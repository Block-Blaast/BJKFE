import type { ReactNode } from 'react';

type SetupCardProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
};

const SetupCard = ({ title, description, action, children }: SetupCardProps) => (
  <section className="flex flex-col gap-4 rounded-xl bg-bg-surface p-6 shadow-card">
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-text-heading">{title}</h2>
        {description ? <p className="text-body-sm text-text-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default SetupCard;
