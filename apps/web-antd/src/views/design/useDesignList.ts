import { computed, onMounted, ref, shallowRef } from 'vue';
import { useAccessStore } from '@vben/stores';
import { requestClient } from '#/api/request';
export function useDesignList<T>(path: string, permission: string) {
  const access = useAccessStore();
  const allowed = computed(() => access.accessCodes.includes(permission));
  const rows = ref<T[]>([]),
    total = shallowRef(0),
    page = shallowRef(1),
    keyword = shallowRef(''),
    status = shallowRef(''),
    busy = shallowRef(false),
    error = shallowRef('');
  let sequence = 0;
  async function load() {
    if (!allowed.value) return;
    const current = ++sequence;
    busy.value = true;
    error.value = '';
    try {
      const data = await requestClient.get<T[] | { items: T[]; total: number }>(path, {
        params: { page: page.value, pageSize: 20, keyword: keyword.value, status: status.value },
      });
      if (current !== sequence) return;
      if (Array.isArray(data)) {
        rows.value = data as any;
        total.value = data.length;
      } else {
        rows.value = data.items as any;
        total.value = data.total;
      }
    } catch (e) {
      if (current === sequence) error.value = (e as Error).message;
    } finally {
      if (current === sequence) busy.value = false;
    }
  }
  async function run(action: () => Promise<unknown>) {
    if (busy.value) return false;
    busy.value = true;
    error.value = '';
    try {
      await action();
      busy.value = false;
      await load();
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    } finally {
      busy.value = false;
    }
  }
  function search() {
    page.value = 1;
    void load();
  }
  function paginate(next: number) {
    page.value = next;
    void load();
  }
  onMounted(load);
  return {
    allowed,
    rows,
    total,
    page,
    keyword,
    status,
    busy,
    error,
    load,
    run,
    search,
    paginate,
    access,
  };
}
