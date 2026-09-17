import { createSharedComposable, useStorage } from '@vueuse/core';
import { reactive } from 'vue';
import { listRepositoryWorktrees, type Worktree } from '@/api/generated/wade';

export type CachedWorktree = Pick<
  Worktree,
  'id' | 'repositoryId' | 'workspaceId' | 'name' | 'branch' | 'isMain' | 'isRemovable'
>;

export type RefreshState = { kind: 'idle' } | { kind: 'refreshing' } | { kind: 'failed'; message: string };

export type RepositoryWorktreeState =
  | {
      kind: 'uncached';
      refresh: RefreshState;
    }
  | {
      kind: 'cached';
      worktrees: readonly CachedWorktree[];
      refresh: RefreshState;
    };

export type WorktreeRefreshResult =
  | { kind: 'refreshed'; worktrees: readonly CachedWorktree[] }
  | { kind: 'superseded'; worktrees: readonly CachedWorktree[] }
  | { kind: 'failed'; message: string };

export type RepositoryWorktreeCache = {
  observe: (repositoryId: string) => Readonly<RepositoryWorktreeState>;
  refresh: (repositoryId: string) => Promise<WorktreeRefreshResult>;
  upsert: (worktree: Worktree) => void;
  remove: (repositoryId: string, worktreeId: string) => void;
};

type RepositoryWorktreeEntry = {
  worktrees?: CachedWorktree[];
  refresh: RefreshState;
  generation: number;
};

const worktreesStorageKey = 'wade:worktrees';

export const useRepositoryWorktreeCache = createSharedComposable((): RepositoryWorktreeCache => {
  const storedWorktrees = useStorage<Record<string, unknown>>(worktreesStorageKey, {}, localStorage);
  const repositoryStates = reactive(new Map<string, RepositoryWorktreeEntry>());
  const refreshRequests = new Map<string, Promise<WorktreeRefreshResult>>();

  const ensureRepositoryState = (repositoryId: string) => {
    const existingState = repositoryStates.get(repositoryId);
    if (existingState) {
      return existingState;
    }

    const storedValue = storedWorktrees.value;
    const state: RepositoryWorktreeEntry = {
      worktrees: normaliseStoredWorktrees(repositoryId, isRecord(storedValue) ? storedValue[repositoryId] : undefined),
      refresh: { kind: 'idle' },
      generation: 0
    };
    repositoryStates.set(repositoryId, state);
    return repositoryStates.get(repositoryId)!;
  };

  const persistWorktrees = (repositoryId: string, worktrees: readonly CachedWorktree[]) => {
    storedWorktrees.value = {
      ...(isRecord(storedWorktrees.value) ? storedWorktrees.value : {}),
      [repositoryId]: worktrees.map(toCachedWorktree)
    };
  };

  const currentWorktrees = (state: RepositoryWorktreeEntry): readonly CachedWorktree[] => state.worktrees ?? [];

  const observe = (repositoryId: string): Readonly<RepositoryWorktreeState> => {
    if (repositoryId === '') {
      return { kind: 'uncached', refresh: { kind: 'idle' } };
    }

    const state = ensureRepositoryState(repositoryId);
    if (state.worktrees === undefined) {
      return { kind: 'uncached', refresh: state.refresh };
    }

    return { kind: 'cached', worktrees: state.worktrees, refresh: state.refresh };
  };

  const refresh = (repositoryId: string): Promise<WorktreeRefreshResult> => {
    if (repositoryId === '') {
      return Promise.resolve({ kind: 'failed', message: 'Repository unavailable' });
    }

    const activeRequest = refreshRequests.get(repositoryId);
    if (activeRequest) {
      return activeRequest;
    }

    const state = ensureRepositoryState(repositoryId);
    const requestGeneration = state.generation;
    state.refresh = { kind: 'refreshing' };

    const refreshRequest: Promise<WorktreeRefreshResult> = (async () => {
      try {
        const { items } = await listRepositoryWorktrees(repositoryId);
        const nextWorktrees = sortWorktrees(
          items.filter((worktree) => worktree.repositoryId === repositoryId).map(toCachedWorktree)
        );

        if (requestGeneration !== state.generation) {
          state.refresh = { kind: 'idle' };
          return { kind: 'superseded', worktrees: currentWorktrees(state) };
        }

        state.worktrees = nextWorktrees;
        state.refresh = { kind: 'idle' };
        persistWorktrees(repositoryId, nextWorktrees);
        return { kind: 'refreshed', worktrees: nextWorktrees };
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Worktrees request failed';
        state.refresh = { kind: 'failed', message };
        return { kind: 'failed', message };
      } finally {
        refreshRequests.delete(repositoryId);
      }
    })();

    refreshRequests.set(repositoryId, refreshRequest);
    return refreshRequest;
  };

  const upsert = (worktree: Worktree) => {
    if (worktree.repositoryId === '') {
      return;
    }

    const state = ensureRepositoryState(worktree.repositoryId);
    const nextWorktree = toCachedWorktree(worktree);
    const existingWorktreeIndex = state.worktrees?.findIndex(({ id }) => id === worktree.id) ?? -1;
    const nextWorktrees = state.worktrees ? [...state.worktrees] : [];

    if (existingWorktreeIndex === -1) {
      nextWorktrees.push(nextWorktree);
    } else {
      nextWorktrees[existingWorktreeIndex] = nextWorktree;
    }

    state.generation += 1;
    state.worktrees = sortWorktrees(nextWorktrees);
    persistWorktrees(worktree.repositoryId, state.worktrees);
  };

  const remove = (repositoryId: string, worktreeId: string) => {
    if (repositoryId === '') {
      return;
    }

    const state = ensureRepositoryState(repositoryId);
    state.generation += 1;

    if (state.worktrees === undefined) {
      return;
    }

    const nextWorktrees = state.worktrees.filter(({ id }) => id !== worktreeId);
    state.worktrees = nextWorktrees;
    persistWorktrees(repositoryId, nextWorktrees);
  };

  return {
    observe,
    refresh,
    upsert,
    remove
  };
});

export const listRemovableWorktrees = (state: RepositoryWorktreeState): readonly CachedWorktree[] =>
  state.kind === 'cached' ? state.worktrees.filter((worktree) => worktree.isRemovable) : [];

export const recordCreatedWorktree = (cache: RepositoryWorktreeCache, worktree: Worktree) => {
  cache.upsert(worktree);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isBranch = (value: unknown): value is NonNullable<Worktree['branch']> =>
  isRecord(value) &&
  (typeof value.checkedOutWorkspaceId === 'string' || value.checkedOutWorkspaceId === null) &&
  typeof value.hasLocalBranch === 'boolean' &&
  typeof value.name === 'string' &&
  typeof value.ref === 'string' &&
  (typeof value.remote === 'string' || value.remote === null);

const isCachedWorktree = (value: unknown): value is CachedWorktree =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.repositoryId === 'string' &&
  typeof value.workspaceId === 'string' &&
  typeof value.name === 'string' &&
  (value.branch === null || isBranch(value.branch)) &&
  typeof value.isMain === 'boolean' &&
  typeof value.isRemovable === 'boolean';

const toCachedWorktree = (worktree: CachedWorktree): CachedWorktree => ({
  id: worktree.id,
  repositoryId: worktree.repositoryId,
  workspaceId: worktree.workspaceId,
  name: worktree.name,
  branch: worktree.branch ? { ...worktree.branch } : null,
  isMain: worktree.isMain,
  isRemovable: worktree.isRemovable
});

const normaliseStoredWorktrees = (repositoryId: string, value: unknown): CachedWorktree[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const validWorktrees = value
    .filter((worktree): worktree is CachedWorktree => isCachedWorktree(worktree))
    .filter((worktree) => worktree.repositoryId === repositoryId)
    .map(toCachedWorktree);
  if (value.length > 0 && validWorktrees.length === 0) {
    return undefined;
  }

  return sortWorktrees(validWorktrees);
};

const sortWorktrees = (worktrees: readonly CachedWorktree[]): CachedWorktree[] =>
  [...worktrees].sort(
    (firstWorktree, secondWorktree) =>
      Number(secondWorktree.isMain) - Number(firstWorktree.isMain) ||
      firstWorktree.workspaceId.localeCompare(secondWorktree.workspaceId) ||
      firstWorktree.id.localeCompare(secondWorktree.id)
  );
