import type { WorkspaceRole } from '../../types/api';
import { canAccessBillingSettings, canAccessMembersSettings } from '../../utils/workspaceAccess';
import type { SettingsSection } from './SettingsSidebar';

/** Hidden from settings nav (not removed , restore by clearing these lists). */
export const HIDDEN_SETTINGS_SECTIONS: SettingsSection[] = ['notifications', 'help'];

export const HIDDEN_SETTINGS_CATEGORIES = ['Preferences'];

/** Sections that require owning the current workspace (role owner). */
const OWNER_ONLY_SETTINGS_SECTIONS = new Set<SettingsSection>(['members', 'billing']);

export function isSettingsNavSectionVisible(
  section: SettingsSection,
  role?: WorkspaceRole | null,
): boolean {
  if (HIDDEN_SETTINGS_SECTIONS.includes(section)) return false;
  if (OWNER_ONLY_SETTINGS_SECTIONS.has(section)) {
    if (section === 'members') return canAccessMembersSettings(role);
    if (section === 'billing') return canAccessBillingSettings(role);
  }
  return true;
}
