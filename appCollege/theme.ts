// theme.ts
// Theme adaptatif (mode clair / mode sombre du systeme Android)

import { useColorScheme } from 'react-native';

export interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  inputBackground: string;
  placeholder: string;
  primary: string;
  primaryDark: string;
  primaryDisabled: string;
  successText: string;
  successBg: string;
  successBorder: string;
  errorText: string;
  errorBg: string;
  errorBorder: string;
  warning: string;
  modalOverlay: string;
  modalCard: string;
  radioActive: string;
  radioInactiveBorder: string;
  radioInactiveBg: string;
  historyItem: string;
  historyItemBorder: string;
  badge: string;
  badgeText: string;
  statusBar: 'light-content' | 'dark-content';
}

export const lightTheme: Theme = {
  background: '#f0f4f8',
  card: '#ffffff',
  text: '#1a3a5c',
  textSecondary: '#5a7a9a',
  textMuted: '#8aa0b8',
  border: '#c0d4e8',
  inputBackground: '#ffffff',
  placeholder: '#8aa0b8',
  primary: '#2e7bc4',
  primaryDark: '#1a3a5c',
  primaryDisabled: '#7aabd4',
  successText: '#276728',
  successBg: '#e6f4ea',
  successBorder: '#5cb85c',
  errorText: '#a01010',
  errorBg: '#fdecea',
  errorBorder: '#e55353',
  warning: '#f0a500',
  modalOverlay: 'rgba(0,0,0,0.6)',
  modalCard: '#ffffff',
  radioActive: '#2e7bc4',
  radioInactiveBorder: '#c0d4e8',
  radioInactiveBg: '#ffffff',
  historyItem: '#ffffff',
  historyItemBorder: '#c0d4e8',
  badge: '#f0a500',
  badgeText: '#ffffff',
  statusBar: 'dark-content',
};

export const darkTheme: Theme = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  border: '#334155',
  inputBackground: '#0f172a',
  placeholder: '#64748b',
  primary: '#3b82f6',
  primaryDark: '#1e293b',
  primaryDisabled: '#1e40af',
  successText: '#86efac',
  successBg: '#064e3b',
  successBorder: '#16a34a',
  errorText: '#fca5a5',
  errorBg: '#7f1d1d',
  errorBorder: '#dc2626',
  warning: '#fbbf24',
  modalOverlay: 'rgba(0,0,0,0.85)',
  modalCard: '#1e293b',
  radioActive: '#3b82f6',
  radioInactiveBorder: '#475569',
  radioInactiveBg: '#0f172a',
  historyItem: '#0f172a',
  historyItemBorder: '#334155',
  badge: '#fbbf24',
  badgeText: '#0f172a',
  statusBar: 'light-content',
};

export const useTheme = (): Theme => {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
};
