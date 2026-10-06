import { onBeforeUnmount, onMounted } from 'vue';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { isShortcut } from '@/utils/shortcutModifier';

export const useCommandPaletteKeyboardShortcuts = ({
  openActiveWorkspacePicker,
  openCommandPalette,
  openWorkspacePicker
}: CommandPaletteKeyboardShortcutsOptions) => {
  const settingsStore = useSettingsStore();

  const isModifierShortcut = (event: KeyboardEvent, key: string) =>
    isShortcut(event, settingsStore.settings.shortcutModifier, key);

  const handleKeydown = (event: KeyboardEvent) => {
    if (isModifierShortcut(event, 'p')) {
      stopEvent(event);
      openWorkspacePicker();
      return;
    }

    if (isModifierShortcut(event, 's')) {
      stopEvent(event);
      openActiveWorkspacePicker();
      return;
    }

    if (isModifierShortcut(event, 'k')) {
      stopEvent(event);
      openCommandPalette();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown, true);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown, true);
  });
};

type CommandPaletteKeyboardShortcutsOptions = {
  openActiveWorkspacePicker: () => void;
  openCommandPalette: () => void;
  openWorkspacePicker: () => void;
};

const stopEvent = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopImmediatePropagation();
};
