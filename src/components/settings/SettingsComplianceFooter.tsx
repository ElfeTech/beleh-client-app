import { formatComplianceVersionLabel } from '../../lib/appMeta';

export function SettingsComplianceFooter() {
  return (
    <footer className="settings-compliance-footer" aria-label="Environment metadata">
      <span>{formatComplianceVersionLabel()}</span>
      <span>Access Protocol: SSL TLS v1.3</span>
      <span>Last Catalog Sync Date: 2024-05-21 12:47:58 UTC</span>
    </footer>
  );
}
