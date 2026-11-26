import { computed, onMounted, ref, shallowRef } from 'vue';
import { useAccessStore } from '@vben/stores';
import { requestClient } from '#/api/request';
export interface CanvasPreset {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  enabled: boolean;
}
export function useCanvasPresets() {
  const store = useAccessStore();
  const canWrite = computed(() => store.accessCodes.includes('canvas:write'));
  const items = ref<CanvasPreset[]>([]),
    version = shallowRef(0),
    busy = shallowRef(false),
    error = shallowRef(''),
    dirty = shallowRef(false);
  async function load() {
    busy.value = true;
    error.value = '';
    try {
      const data = await requestClient.get<{ items: CanvasPreset[]; version: number }>(
        '/canvas-presets',
      );
      items.value = data.items;
      version.value = data.version;
      dirty.value = false;
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      busy.value = false;
    }
  }
  async function save() {
    if (busy.value) return;
    busy.value = true;
    error.value = '';
    try {
      const data = await requestClient.put<{ version: number; items: CanvasPreset[] }>(
        '/canvas-presets',
        { version: version.value, items: items.value },
      );
      version.value = data.version;
      items.value = data.items;
      dirty.value = false;
      return true;
    } catch (e) {
      error.value = (e as Error).message;
      return false;
    } finally {
      busy.value = false;
    }
  }
  function add() {
    items.value.push({
      id: crypto.randomUUID(),
      name: '新尺寸',
      category: '海报',
      width: 1080,
      height: 1440,
      enabled: true,
    });
    dirty.value = true;
  }
  function move(index: number, delta: number) {
    const next = index + delta;
    if (next < 0 || next >= items.value.length) return;
    const [item] = items.value.splice(index, 1);
    if (item) items.value.splice(next, 0, item);
    dirty.value = true;
  }
  function remove(index: number) {
    items.value.splice(index, 1);
    dirty.value = true;
  }
  onMounted(load);
  return { items, version, busy, error, dirty, canWrite, load, save, add, move, remove };
}
