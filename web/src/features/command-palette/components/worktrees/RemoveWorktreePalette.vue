<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { deleteRepositoryWorktree } from '@/api/generated/wade';
import { useFuzzyItems } from '@/composables/useFuzzyItems';
import PaletteShell from '@/features/command-palette/components/PaletteShell.vue';
import { usePaletteRequestState } from '@/features/command-palette/composables/usePaletteRequestState';
import type { PaletteNotice, PaletteResult } from '@/features/command-palette/types';
import { useWorkspaces } from '@/features/workspaces/composables/useWorkspaces';
import {
  listRemovableWorktrees,
  useRepositoryWorktreeCache,
  type CachedWorktree
} from '@/features/workspaces/composables/useRepositoryWorktreeCache';
import { useWorkspaceSessionStore } from '@/stores/useWorkspaceSessionStore';

const props = defineProps<{
  repositoryId: string;
  workspaceId: string;
}>();

const emit = defineEmits<{
  close: [restoreFocus?: boolean];
}>();

const router = useRouter();
const { syncWorkspaces } = useWorkspaces();
const workspaceSessionStore = useWorkspaceSessionStore();
const worktreeCache = useRepositoryWorktreeCache();
const targetWorktreeId = ref<string | undefined>();
const operationTargetWorktree = ref<CachedWorktree | undefined>();
const {
  clearActionError,
  isActing: isRemoving,
  notice: actionNotice,
  query,
  setActionError,
  updateQuery
} = usePaletteRequestState({
  errorTitle: 'Worktree removal failed'
});
const repositoryState = computed(() => worktreeCache.observe(props.repositoryId));
const worktrees = computed<readonly CachedWorktree[]>(() =>
  repositoryState.value.kind === 'cached' ? repositoryState.value.worktrees : []
);
const removableWorktrees = computed(() => listRemovableWorktrees(repositoryState.value));
const targetWorktree = computed(() => {
  if (isRemoving.value) {
    return operationTargetWorktree.value;
  }

  if (targetWorktreeId.value === undefined) {
    return undefined;
  }

  return removableWorktrees.value.find((worktree) => worktree.id === targetWorktreeId.value);
});
const isInitialLoad = computed(
  () => repositoryState.value.kind === 'uncached' && repositoryState.value.refresh.kind !== 'failed'
);
const refreshError = computed(() => {
  const refresh = repositoryState.value.refresh;
  return refresh.kind === 'failed' ? refresh.message : '';
});
const notice = computed<PaletteNotice | undefined>(() => {
  if (actionNotice.value) {
    return actionNotice.value;
  }

  if (refreshError.value === '') {
    return undefined;
  }

  return {
    tone: 'error',
    title: 'Worktrees refresh failed',
    messages: [refreshError.value]
  };
});

const paletteSummary = computed(() => {
  if (isInitialLoad.value) {
    return `Loading worktrees for ${props.repositoryId}`;
  }

  if (isRemoving.value) {
    return 'Removing worktree';
  }

  if (targetWorktree.value) {
    return targetWorktree.value.workspaceId;
  }

  if (repositoryState.value.kind === 'uncached') {
    return `Worktrees unavailable for ${props.repositoryId}`;
  }

  const worktreeLabel = removableWorktrees.value.length === 1 ? 'worktree' : 'worktrees';
  return `${removableWorktrees.value.length} removable ${worktreeLabel}`;
});

const statusMessage = computed(() => {
  if (isInitialLoad.value) {
    return 'Loading worktrees';
  }

  if (repositoryState.value.kind === 'uncached') {
    return 'Worktrees unavailable';
  }

  if (removableWorktrees.value.length === 0) {
    return 'No removable worktrees';
  }

  return 'No matching worktrees';
});

const navigateAfterRemovingCurrentWorktree = async (mainWorkspaceId: string | undefined) => {
  emit('close', false);

  if (mainWorkspaceId) {
    await router.push({ name: 'workspace', params: { workspaceId: mainWorkspaceId } });
    return;
  }

  await router.push({ name: 'home' });
};

const removeSelectedWorktree = async () => {
  if (!targetWorktree.value || isRemoving.value) {
    return;
  }

  const repositoryId = props.repositoryId;
  const currentWorkspaceId = props.workspaceId;
  const target = targetWorktree.value;
  if (repositoryId === '' || target.repositoryId !== repositoryId) {
    return;
  }

  const initialMainWorkspaceId = worktrees.value.find((worktree) => worktree.isMain)?.workspaceId;
  operationTargetWorktree.value = {
    ...target,
    branch: target.branch ? { ...target.branch } : null
  };
  isRemoving.value = true;
  clearActionError();
  let deletionSucceeded = false;

  try {
    await deleteRepositoryWorktree(repositoryId, target.id);
    deletionSucceeded = true;
    worktreeCache.remove(repositoryId, target.id);
    workspaceSessionStore.clearWorkspaceSession(target.workspaceId);
    const synchronisedWorkspaces = await syncWorkspaces();

    if (target.workspaceId === currentWorkspaceId) {
      const latestRepositoryState = worktreeCache.observe(repositoryId);
      const latestCachedMainWorkspaceId =
        latestRepositoryState.kind === 'cached'
          ? latestRepositoryState.worktrees.find((worktree) => worktree.isMain)?.workspaceId
          : undefined;
      const synchronisedMainWorkspaceId = synchronisedWorkspaces?.find(
        (workspace) => workspace.repositoryId === repositoryId && workspace.worktree?.isMain
      )?.id;
      await navigateAfterRemovingCurrentWorktree(
        latestCachedMainWorkspaceId ?? synchronisedMainWorkspaceId ?? initialMainWorkspaceId
      );
      return;
    }

    emit('close');
  } catch (requestError) {
    setActionError(requestError, 'Worktree removal failed');
  } finally {
    isRemoving.value = false;
    operationTargetWorktree.value = undefined;

    const shouldKeepSelection =
      !deletionSucceeded &&
      props.repositoryId === repositoryId &&
      removableWorktrees.value.some((worktree) => worktree.repositoryId === repositoryId && worktree.id === target.id);
    if (!shouldKeepSelection) {
      targetWorktreeId.value = undefined;
    }
  }
};

const selectWorktree = (worktree: CachedWorktree) => {
  if (isRemoving.value) {
    return;
  }

  targetWorktreeId.value = worktree.id;
  query.value = '';
  clearActionError();
};

const cancelRemoval = () => {
  if (isRemoving.value) {
    return;
  }

  targetWorktreeId.value = undefined;
  clearActionError();
};

const { matchingItems: matchingWorktrees } = useFuzzyItems(
  removableWorktrees,
  query,
  (worktree) => worktree.workspaceId,
  (worktree) => [worktree.workspaceId, worktree.name, worktree.branch?.name ?? '']
);

const paletteResults = computed<PaletteResult[]>(() => {
  if (targetWorktree.value) {
    const branchName = targetWorktree.value.branch?.name ?? '';
    return [
      {
        id: 'confirm-remove-worktree',
        label:
          branchName === ''
            ? `Remove ${targetWorktree.value.workspaceId}`
            : `Remove ${targetWorktree.value.workspaceId} and local branch ${branchName}`,
        actionLabel: isRemoving.value ? 'Removing' : 'Confirm remove',
        isDisabled: isRemoving.value,
        run: () => {
          void removeSelectedWorktree();
        }
      },
      {
        id: 'cancel-remove-worktree',
        label: 'Cancel',
        actionLabel: 'Back to worktrees',
        isDisabled: isRemoving.value,
        run: cancelRemoval
      }
    ];
  }

  return matchingWorktrees.value.map((match) => ({
    id: `worktree:${match.item.id}`,
    label: match.item.workspaceId,
    actionLabel: match.item.branch?.name ?? 'Remove worktree',
    isDisabled: isRemoving.value,
    run: () => selectWorktree(match.item)
  }));
});

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

watch(removableWorktrees, (nextWorktrees) => {
  if (isRemoving.value) {
    return;
  }

  if (targetWorktreeId.value !== undefined && !nextWorktrees.some(({ id }) => id === targetWorktreeId.value)) {
    targetWorktreeId.value = undefined;
  }
});
</script>

<template>
  <PaletteShell
    title="Remove Worktree"
    :summary="paletteSummary"
    :query="query"
    search-placeholder="Search worktrees"
    results-aria-label="Removable worktrees"
    :status-message="statusMessage"
    :results="paletteResults"
    :notice="notice"
    @update:query="updateQuery"
    @close="emit('close', $event)"
  />
</template>
