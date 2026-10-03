import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  BILLING_UPGRADE_HREF,
  UPGRADE_TO_ADD_DATASOURCES_LABEL,
  canShowWorkspaceUpgradeCta,
  isDatasourcesAtLimit,
  workspaceLimitUpgradeMessage,
} from '../utils/workspaceAccess';

export interface ConnectOrUpgrade {
  /** True when the plan blocks adding another datasource. */
  blocked: boolean;
  /** True when the current role may open billing (workspace owner). */
  canUpgrade: boolean;
  /** CTA label when blocked, otherwise `null` (callers keep their own "Connect" label). */
  upgradeLabel: string | null;
  /** Open the connection panel, or route to billing / explain the limit when blocked. */
  onConnect: () => void;
}

/**
 * Single source of truth for "add a datasource" entry points (datasources page, chat
 * prompt box, welcome screen) so they all flip to "Upgrade" under the same plan limit.
 */
export function useConnectOrUpgrade(openConnectionPanel: () => void): ConnectOrUpgrade {
  const navigate = useNavigate();
  const { workspaceUsage, currentRole } = useWorkspace();
  const blocked = isDatasourcesAtLimit(workspaceUsage ?? null);
  const canUpgrade = canShowWorkspaceUpgradeCta(currentRole);

  const onConnect = useCallback(() => {
    if (blocked) {
      if (canUpgrade) {
        navigate(BILLING_UPGRADE_HREF);
      } else {
        toast.error(workspaceLimitUpgradeMessage(currentRole, 'datasources'));
      }
      return;
    }
    openConnectionPanel();
  }, [blocked, canUpgrade, currentRole, navigate, openConnectionPanel]);

  return {
    blocked,
    canUpgrade,
    upgradeLabel: blocked ? UPGRADE_TO_ADD_DATASOURCES_LABEL : null,
    onConnect,
  };
}
