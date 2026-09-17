<script setup lang="ts">
import { GitBranch } from '@lucide/vue';
import { computed, watch } from 'vue';
import PaletteShell from '@/features/command-palette/components/PaletteShell.vue';
import { usePaletteRequestState } from '@/features/command-palette/composables/usePaletteRequestState';
import { useWorktreeNavigation } from '@/features/command-palette/composables/useWorktreeNavigation';
import type { PaletteNotice, PaletteResult } from '@/features/command-palette/types';
import { useFuzzyItems } from '@/composables/useFuzzyItems';
import {
  useRepositoryWorktreeCache,
  type CachedWorktree
} from '@/features/workspaces/composables/useRepositoryWorktreeCache';

const props = defineProps<{
  repositoryId: string;
  currentWorkspaceId: string;
}>();

const emit = defineEmits<{
  close: [restoreFocus?: boolean];
}>();

const { openExistingWorktree: navigateToWorktree, reserveWorktreeTab } = useWorktreeNavigation();
const worktreeCache = useRepositoryWorktreeCache();
const { query, updateQuery } = usePaletteRequestState({ errorTitle: 'Worktree switch failed' });
const repositoryState = computed(() => worktreeCache.observe(props.repositoryId));
const worktrees = computed<readonly CachedWorktree[]>(() =>
  repositoryState.value.kind === 'cached' ? repositoryState.value.worktrees : []
);
const refreshError = computed(() => {
  const refresh = repositoryState.value.refresh;
  return refresh.kind === 'failed' ? refresh.message : '';
});
const notice = computed<PaletteNotice | undefined>(() =>
  refreshError.value === ''
    ? undefined
    : {
        tone: 'error',
        title: 'Worktrees refresh failed',
        messages: [refreshError.value]
      }
);
const isInitialLoad = computed(
  () => repositoryState.value.kind === 'uncached' && repositoryState.value.refresh.kind !== 'failed'
);

const paletteSummary = computed(() => {
  if (isInitialLoad.value) {
    return `Loading worktrees for ${props.repositoryId}`;
  }

  if (repositoryState.value.kind === 'uncached') {
    return `Worktrees unavailable for ${props.repositoryId}`;
  }

  const worktreeLabel = worktrees.value.length === 1 ? 'worktree' : 'worktrees';
  return `${worktrees.value.length} ${worktreeLabel} for ${props.repositoryId}`;
});

const statusMessage = computed(() => {
  if (isInitialLoad.value) {
    return 'Loading worktrees';
  }

  if (repositoryState.value.kind === 'uncached') {
    return 'Worktrees unavailable';
  }

  if (worktrees.value.length === 0) {
    return 'No worktrees found';
  }

  return 'No matching worktrees';
});

const isCurrentWorktree = (worktree: CachedWorktree) => worktree.workspaceId === props.currentWorkspaceId;
const worktreeBranchLabel = (worktree: CachedWorktree) => worktree.branch?.name ?? 'detached HEAD';

const selectWorktree = (worktree: CachedWorktree) => {
  if (isCurrentWorktree(worktree)) {
    emit('close');
    return;
  }

  const reservedTab = reserveWorktreeTab();
  emit('close', false);
  void navigateToWorktree({ workspaceId: worktree.workspaceId }, reservedTab);
};

const { matchingItems: matchingWorktrees } = useFuzzyItems(worktrees, query, worktreeBranchLabel, (worktree) => [
  worktree.repositoryId,
  worktree.workspaceId,
  worktree.name,
  worktreeBranchLabel(worktree)
]);

const paletteResults = computed<PaletteResult[]>(() =>
  matchingWorktrees.value.map((match) => ({
    id: `worktree:${match.item.id}`,
    label: worktreeBranchLabel(match.item),
    leadingIcon: GitBranch,
    title: worktreeBranchLabel(match.item),
    isDisabled: false,
    run: () => selectWorktree(match.item)
  }))
);

watch(
  () => props.repositoryId,
  (repositoryId, previousRepositoryId) => {
    if (repositoryId === '' || repositoryId === previousRepositoryId) {
      return;
    }

    void worktreeCache.refresh(repositoryId);
  },
  { immediate: true }
);
</script>

<template>
  <PaletteShell
    title="Worktrees"
    :summary="paletteSummary"
    :query="query"
    search-placeholder="Search worktrees"
    results-aria-label="Repository worktrees"
    :status-message="statusMessage"
    :results="paletteResults"
    :notice="notice"
    @update:query="updateQuery"
    @close="emit('close', $event)"
  />
</template>
