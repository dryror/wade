import { onBeforeUnmount, onMounted } from 'vue';

export const useCommandPaletteKeyboardShortcuts = ({
  openActiveWorkspacePicker,
  openCommandPalette,
  openWorkspacePicker,
  openWorktreePicker
}: CommandPaletteKeyboardShortcutsOptions) => {
  let isPhysicalAltGraphPressed = false;

  const handleKeydown = (event: KeyboardEvent) => {
    if (isPhysicalAltGraphKeydown(event)) {
      isPhysicalAltGraphPressed = true;
    }

    if (isCtrlAltWorktreeShortcut(event, isPhysicalAltGraphPressed)) {
      stopEvent(event);
      openWorktreePicker();
      return;
    }

    if (isCtrlShortcut(event, 'p')) {
      stopEvent(event);
      openWorkspacePicker();
      return;
    }

    if (isCtrlShortcut(event, 's')) {
      stopEvent(event);
      openActiveWorkspacePicker();
      return;
    }

    if (isCtrlShortcut(event, 'k')) {
      stopEvent(event);
      openCommandPalette();
    }
  };

  const handleKeyup = (event: KeyboardEvent) => {
    if (isPhysicalAltGraphKeyup(event)) {
      isPhysicalAltGraphPressed = false;
    }
  };

  const resetPhysicalAltGraph = () => {
    isPhysicalAltGraphPressed = false;
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown, true);
    window.addEventListener('keyup', handleKeyup, true);
    window.addEventListener('blur', resetPhysicalAltGraph, true);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown, true);
    window.removeEventListener('keyup', handleKeyup, true);
    window.removeEventListener('blur', resetPhysicalAltGraph, true);
    resetPhysicalAltGraph();
  });
};

type CommandPaletteKeyboardShortcutsOptions = {
  openActiveWorkspacePicker: () => void;
  openCommandPalette: () => void;
  openWorkspacePicker: () => void;
  openWorktreePicker: () => void;
};

const isPhysicalAltGraphKeydown = (event: KeyboardEvent) => event.key === 'AltGraph';

const isPhysicalAltGraphKeyup = (event: KeyboardEvent) => event.key === 'AltGraph' || event.code === 'AltRight';

const isCtrlAltWorktreeShortcut = (event: KeyboardEvent, isPhysicalAltGraphPressed: boolean) =>
  event.ctrlKey &&
  event.altKey &&
  !event.metaKey &&
  !event.shiftKey &&
  event.code === 'KeyS' &&
  !isPhysicalAltGraphPressed;

const isCtrlShortcut = (event: KeyboardEvent, key: string) =>
  event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey && event.key.toLowerCase() === key;

const stopEvent = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopImmediatePropagation();
};
