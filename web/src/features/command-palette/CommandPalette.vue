<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import ActiveWorkspacePalette from '@/features/command-palette/components/ActiveWorkspacePalette.vue';
import GeneralCommandPalette from '@/features/command-palette/components/GeneralCommandPalette.vue';
import RemoteRepositoryPalette from '@/features/command-palette/components/RemoteRepositoryPalette.vue';
import WorkspacePalette from '@/features/command-palette/components/WorkspacePalette.vue';
import CreateWorktreePalette from '@/features/command-palette/components/worktrees/CreateWorktreePalette.vue';
import RemoteWorktreePalette from '@/features/command-palette/components/worktrees/RemoteWorktreePalette.vue';
import RemoveWorktreePalette from '@/features/command-palette/components/worktrees/RemoveWorktreePalette.vue';
import WorktreePalette from '@/features/command-palette/components/worktrees/WorktreePalette.vue';
import { useCommandPaletteKeyboardShortcuts } from '@/features/command-palette/composables/useCommandPaletteKeyboardShortcuts';
import { useCurrentRepositoryContext } from '@/features/command-palette/composables/useCurrentRepositoryContext';
import { useRepositoryWorktreeCache } from '@/features/workspaces/composables/useRepositoryWorktreeCache';

const PaletteModes = {
  Workspaces: 'workspaces',
  ActiveWorkspaces: 'active-workspaces',
  Commands: 'commands',
  RemoteRepository: 'remote-repository',
  CreateWorktree: 'create-worktree',
  RemoteWorktree: 'remote-worktree',
  RemoveWorktree: 'remove-worktree',
  Worktrees: 'worktrees'
} as const;

type PaletteMode = (typeof PaletteModes)[keyof typeof PaletteModes];

const activePalette = ref<PaletteMode | undefined>();
const { context: currentRepositoryContext, currentWorkspaceId } = useCurrentRepositoryContext();
const worktreeCache = useRepositoryWorktreeCache();
const currentRepositoryId = computed(() =>
  currentRepositoryContext.value.kind === 'available' ? currentRepositoryContext.value.repositoryId : ''
);
let previouslyFocusedElement: HTMLElement | null = null;

const restorePreviousFocus = () => {
  const element = previouslyFocusedElement;
  previouslyFocusedElement = null;

  if (!element || !document.contains(element)) {
    return;
  }

  element.focus();
};

const openPalette = (mode: PaletteMode) => {
  if (!activePalette.value) {
    previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  activePalette.value = mode;
};

const closePalette = (restoreFocus = true) => {
  if (!activePalette.value) {
    return;
  }

  activePalette.value = undefined;

  if (restoreFocus) {
    void nextTick(restorePreviousFocus);
    return;
  }

  previouslyFocusedElement = null;
};

const openRepositoryWorktreePalette = (mode: PaletteMode) => {
  if (currentRepositoryContext.value.kind === 'unavailable') {
    return;
  }

  openPalette(mode);
};

watch(
  currentRepositoryId,
  (repositoryId, previousRepositoryId) => {
    if (repositoryId === '' || repositoryId === previousRepositoryId) {
      return;
    }

    void worktreeCache.refresh(repositoryId);
  },
  { immediate: true }
);

useCommandPaletteKeyboardShortcuts({
  openWorktreePicker: () => openRepositoryWorktreePalette(PaletteModes.Worktrees),
  openActiveWorkspacePicker: () => openPalette(PaletteModes.ActiveWorkspaces),
  openCommandPalette: () => openPalette(PaletteModes.Commands),
  openWorkspacePicker: () => openPalette(PaletteModes.Workspaces)
});
</script>

<template>
  <WorkspacePalette v-if="activePalette === PaletteModes.Workspaces" @close="closePalette" />
  <ActiveWorkspacePalette v-if="activePalette === PaletteModes.ActiveWorkspaces" @close="closePalette" />
  <GeneralCommandPalette
    v-if="activePalette === PaletteModes.Commands"
    @close="closePalette"
    @open-workspace-picker="openPalette(PaletteModes.Workspaces)"
    @open-active-workspace-picker="openPalette(PaletteModes.ActiveWorkspaces)"
    @open-remote-repository-picker="openPalette(PaletteModes.RemoteRepository)"
    @open-create-worktree="openRepositoryWorktreePalette(PaletteModes.CreateWorktree)"
    @open-remote-worktree-picker="openRepositoryWorktreePalette(PaletteModes.RemoteWorktree)"
    @open-remove-worktree="openRepositoryWorktreePalette(PaletteModes.RemoveWorktree)"
    @open-worktree-picker="openRepositoryWorktreePalette(PaletteModes.Worktrees)"
    :current-repository-context="currentRepositoryContext"
  />
  <RemoteRepositoryPalette v-if="activePalette === PaletteModes.RemoteRepository" @close="closePalette" />
  <CreateWorktreePalette
    v-if="activePalette === PaletteModes.CreateWorktree"
    :repository-id="currentRepositoryId"
    @close="closePalette"
  />
  <RemoteWorktreePalette
    v-if="activePalette === PaletteModes.RemoteWorktree"
    :repository-id="currentRepositoryId"
    @close="closePalette"
  />
  <RemoveWorktreePalette
    v-if="activePalette === PaletteModes.RemoveWorktree"
    :repository-id="currentRepositoryId"
    :workspace-id="currentWorkspaceId"
    @close="closePalette"
  />
  <WorktreePalette
    v-if="activePalette === PaletteModes.Worktrees"
    :repository-id="currentRepositoryId"
    :current-workspace-id="currentWorkspaceId"
    @close="closePalette"
  />
</template>
