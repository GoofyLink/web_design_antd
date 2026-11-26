import { computed, onMounted, ref, shallowRef } from 'vue';
import { useAccessStore } from '@vben/stores';
import { requestClient } from '#/api/request';
export interface ImageProvider {
  id: string;
  name: string;
  kind: 'image' | 'renderer';
  endpoint: string;
  model: string;
  hasKey: boolean;
  status: 'active' | 'disabled';
  version: number;
}
export interface ProviderForm {
  name: string;
  endpoint: string;
  model: string;
  apiKey: string;
  clearKey: boolean;
  status: 'active' | 'disabled';
}
export function useProviders(kind: 'image' | 'renderer' = 'image') {
  const access = useAccessStore();
  const canWrite = computed(() => access.accessCodes.includes('provider:write'));
  const rows = ref<ImageProvider[]>([]),
    loading = shallowRef(false),
    saving = shallowRef(false),
    error = shallowRef('');
  const open = shallowRef(false),
    editing = shallowRef<ImageProvider>();
  async function load() {
    if (!canWrite.value) return;
    loading.value = true;
    error.value = '';
    try {
      rows.value = (await requestClient.get<ImageProvider[]>('/providers')).filter(
        (p) => p.kind === kind,
      );
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }
  function edit(provider?: ImageProvider) {
    error.value = '';
    editing.value = provider;
    open.value = true;
  }
  async function save(form: ProviderForm) {
    if (saving.value || !canWrite.value) return;
    saving.value = true;
    error.value = '';
    try {
      const body = {
        ...form,
        name: form.name.trim(),
        endpoint: form.endpoint.trim(),
        model: form.model.trim(),
        kind,
        version: editing.value?.version || 0,
      };
      if (editing.value) await requestClient.put('/providers/' + editing.value.id, body);
      else await requestClient.post('/providers', body);
      open.value = false;
      editing.value = undefined;
      await load();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      saving.value = false;
    }
  }
  onMounted(load);
  return { canWrite, rows, loading, saving, error, open, editing, load, edit, save };
}
