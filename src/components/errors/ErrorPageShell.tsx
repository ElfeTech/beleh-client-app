import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './ErrorPageShell.css';

export interface ErrorPageAction {
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

interface ErrorPageShellProps {
  code: string;
  title: string;
  description: string;
  detail?: string | null;
  actions: ErrorPageAction[];
  children?: ReactNode;
}

export function ErrorPageShell({
  code,
  title,
  description,
  detail,
  actions,
  children,
}: ErrorPageShellProps) {
  return (
    <div className="error-page" role="main">
      <div className="error-page__card">
        <p className="error-page__code">{code}</p>
        <h1 className="error-page__title">{title}</h1>
        <p className="error-page__desc">{description}</p>
        {detail ? <p className="error-page__detail">{detail}</p> : null}
        {children}
        <div className="error-page__actions">
          {actions.map((action) => {
            const className =
              action.variant === 'secondary'
                ? 'error-page__btn error-page__btn--secondary'
                : 'error-page__btn error-page__btn--primary';
            if (action.to) {
              return (
                <Link key={action.label} to={action.to} className={className}>
                  {action.label}
                </Link>
              );
            }
            return (
              <button
                key={action.label}
                type="button"
                className={className}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
