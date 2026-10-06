export const shortcutModifiers = ['ctrl', 'meta'] as const;

export type ShortcutModifier = (typeof shortcutModifiers)[number];

export const defaultShortcutModifier: ShortcutModifier = 'ctrl';

const shortcutModifierLabels: Record<ShortcutModifier, string> = {
  ctrl: 'Ctrl',
  meta: 'Cmd'
};

export const shortcutModifierOptions = shortcutModifiers.map((value) => ({
  value,
  label: shortcutModifierLabels[value]
}));

export const shortcutModifierLabel = (modifier: ShortcutModifier) => shortcutModifierLabels[modifier];

export const isShortcutModifier = (value: unknown): value is ShortcutModifier =>
  typeof value === 'string' && shortcutModifiers.includes(value as ShortcutModifier);

export const normaliseShortcutModifier = (value: unknown): ShortcutModifier =>
  isShortcutModifier(value) ? value : defaultShortcutModifier;

export const hasShortcutModifier = (event: KeyboardEvent, modifier: ShortcutModifier) =>
  modifier === 'meta' ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;

export const isShortcut = (event: KeyboardEvent, modifier: ShortcutModifier, key: string) =>
  hasShortcutModifier(event, modifier) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === key;
