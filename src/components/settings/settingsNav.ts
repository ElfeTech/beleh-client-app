import type { SettingsSection } from './SettingsSidebar';

/** Hidden from settings nav (not removed — restore by clearing these lists). */
export const HIDDEN_SETTINGS_SECTIONS: SettingsSection[] = ['notifications', 'help'];

export const HIDDEN_SETTINGS_CATEGORIES = ['Preferences'];

export function isSettingsNavSectionVisible(section: SettingsSection): boolean {
  return !HIDDEN_SETTINGS_SECTIONS.includes(section);
}
