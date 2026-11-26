import { computed, onMounted, ref } from 'vue';
import { useAccessStore } from '@vben/stores';
import { requestClient } from '#/api/request';

export interface DesignUser {
  id: string;
  username: string;
  nickname: string;
  status: 'active' | 'disabled';
}
export function useDesignUsers() {
  const access = useAccessStore();
  const canCreate = computed(() => access.accessCodes.includes('user:create'));
  const canEdit = computed(() => access.accessCodes.includes('user:update'));
  const canPassword = computed(() => access.accessCodes.includes('user:password'));
  const canStatus = computed(() => access.accessCodes.includes('user:status'));
  const items = ref<DesignUser[]>([]),
    total = ref(0),
    page = ref(1),
    keyword = ref(''),
    status = ref('');
  const loading = ref(false),
    error = ref('');
  let generation = 0;
  async function load() {
    const current = ++generation;
    loading.value = true;
    error.value = '';
    try {
      const result = await requestClient.get<{ items: DesignUser[]; total: number }>('/users', {
        params: { page: page.value, pageSize: 20, keyword: keyword.value, status: status.value },
      });
      if (current === generation) {
        items.value = result.items;
        total.value = result.total;
      }
    } catch (e) {
      if (current === generation) error.value = (e as Error).message || '用户列表加载失败';
    } finally {
      if (current === generation) loading.value = false;
    }
  }
  async function create(data: { username: string; password: string; nickname: string }) {
    await requestClient.post('/users', data);
    page.value = 1;
    await load();
  }
  async function setStatus(item: DesignUser) {
    await requestClient.request(`/users/${item.id}/status`, {
      method: 'PATCH',
      data: { status: item.status === 'active' ? 'disabled' : 'active' },
    });
    await load();
  }
  async function updateUser(id: string, data: { username: string; nickname: string }) {
    await requestClient.request(`/users/${id}`, { method: 'PATCH', data });
    await load();
  }
  async function resetPassword(id: string, newPassword: string) {
    await requestClient.put(`/users/${id}/password`, { newPassword });
  }
  onMounted(load);
  return {
    canEdit,
    canPassword,
    updateUser,
    resetPassword,
    canCreate,
    canStatus,
    items,
    total,
    page,
    keyword,
    status,
    loading,
    error,
    load,
    create,
    setStatus,
  };
}
