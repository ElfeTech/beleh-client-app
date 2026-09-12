import { AlertTriangle } from 'lucide-react';

/** Security notice shown on PostgreSQL connect forms. */
export function PostgresReadonlyAccessAlert() {
  return (
    <div className="enterprise-pg-readonly-alert" role="status">
      <AlertTriangle
        className="enterprise-pg-readonly-alert__icon"
        size={18}
        strokeWidth={2}
        aria-hidden
      />
      <div className="enterprise-pg-readonly-alert__copy">
        <p className="enterprise-pg-readonly-alert__title">Use a read-only database user</p>
        <p className="enterprise-pg-readonly-alert__text">
          Only share <strong>read-only</strong> access with Beleh. Create a dedicated PostgreSQL
          role with <code>SELECT</code> privileges (no insert, update, delete, or DDL). Do not use
          a superuser or write-capable account.
        </p>
      </div>
    </div>
  );
}
