/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#2563eb';
const tintColorDark = '#60a5fa';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
  // Common colors used throughout the app
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Text colors
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  
  // Background colors
  background: '#ffffff',
  backgroundSecondary: '#f8fafc',
  backgroundMuted: '#f1f5f9',
  
  // Border colors
  border: '#e2e8f0',
  borderMuted: '#f1f5f9',
  
  // Status colors
  online: '#10b981',
  offline: '#6b7280',
  away: '#f59e0b',
  busy: '#ef4444',
  
  // Exercise difficulty colors
  beginner: '#10b981',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
  
  // Progress colors
  progressBackground: '#e2e8f0',
  progressFill: '#2563eb',
  
  // Card colors
  cardBackground: '#ffffff',
  cardBorder: '#e2e8f0',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  
  // Message colors
  messageUser: '#2563eb',
  messageAssistant: '#ffffff',
  messageSystem: '#f1f5f9',
  
  // Appointment status colors
  scheduled: '#f59e0b',
  confirmed: '#2563eb',
  completed: '#10b981',
  cancelled: '#ef4444',
};