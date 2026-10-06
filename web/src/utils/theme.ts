export const themeModes = ['dark', 'light', 'system'] as const;

export type ThemeMode = (typeof themeModes)[number];

export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

export const defaultThemeMode: ThemeMode = 'dark';

const storedThemeModeKey = 'wade-theme-mode';
export const themeModeChangedEvent = 'theme-mode-changed';
const lightColorSchemeQuery = '(prefers-color-scheme: light)';

const themeModeLabels: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System'
};

export const themeModeOptions = themeModes.map((value) => ({
  value,
  label: themeModeLabels[value]
}));

export const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === 'string' && themeModes.includes(value as ThemeMode);

export const normaliseThemeMode = (value: unknown): ThemeMode => (isThemeMode(value) ? value : defaultThemeMode);

export const storedThemeMode = () => normaliseThemeMode(window.localStorage.getItem(storedThemeModeKey));

export const resolvedThemeMode = (): ResolvedThemeMode =>
  document.documentElement.dataset.themeMode === 'light' ? 'light' : 'dark';

let selectedThemeMode: ThemeMode = defaultThemeMode;
let colorSchemeQuery: MediaQueryList | undefined;

const resolveThemeMode = (mode: ThemeMode): ResolvedThemeMode => {
  if (mode !== 'system') {
    return mode;
  }

  return colorSchemeQuery?.matches ? 'light' : 'dark';
};

const updateResolvedThemeMode = () => {
  const themeMode = resolveThemeMode(selectedThemeMode);
  if (document.documentElement.dataset.themeMode === themeMode) {
    return;
  }

  document.documentElement.dataset.themeMode = themeMode;
  const windowColour = getComputedStyle(document.documentElement).getPropertyValue('--window').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', windowColour);
  window.dispatchEvent(new CustomEvent(themeModeChangedEvent, { detail: themeMode }));
};

export const applyThemeMode = (mode: unknown) => {
  selectedThemeMode = normaliseThemeMode(mode);
  window.localStorage.setItem(storedThemeModeKey, selectedThemeMode);

  if (!colorSchemeQuery) {
    colorSchemeQuery = window.matchMedia(lightColorSchemeQuery);
    colorSchemeQuery.addEventListener('change', updateResolvedThemeMode);
  }

  updateResolvedThemeMode();
};
