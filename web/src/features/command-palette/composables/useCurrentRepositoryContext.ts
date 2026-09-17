import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useWorkspaceDetailsStore } from '@/stores/useWorkspaceDetailsStore';

export type CurrentRepositoryContext =
  | {
      kind: 'available';
      workspaceId: string;
      repositoryId: string;
    }
  | {
      kind: 'unavailable';
    };

type CurrentRepositoryContextInput = {
  routeName: unknown;
  workspaceId: string;
  repositoryId: string | null | undefined;
};

export const resolveCurrentRepositoryContext = ({
  routeName,
  workspaceId,
  repositoryId
}: CurrentRepositoryContextInput): CurrentRepositoryContext => {
  if (routeName !== 'workspace' || workspaceId === '' || !repositoryId) {
    return { kind: 'unavailable' };
  }

  return {
    kind: 'available',
    workspaceId,
    repositoryId
  };
};

export const useCurrentRepositoryContext = () => {
  const route = useRoute();
  const workspaceDetailsStore = useWorkspaceDetailsStore();
  const currentWorkspaceId = computed(() => (route.name === 'workspace' ? String(route.params.workspaceId ?? '') : ''));
  const currentWorkspace = computed(() => workspaceDetailsStore.getWorkspaceDetails(currentWorkspaceId.value));
  const context = computed(() =>
    resolveCurrentRepositoryContext({
      routeName: route.name,
      workspaceId: currentWorkspaceId.value,
      repositoryId: currentWorkspace.value?.repositoryId
    })
  );

  return {
    context,
    currentWorkspaceId
  };
};
