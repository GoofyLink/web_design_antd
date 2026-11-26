<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { Alert, Modal, Spin } from 'ant-design-vue';
import { StaticCanvas } from 'fabric';
import { requestClient } from '#/api/request';
import type { TemplateContent } from './types';
const props = defineProps<{ content: TemplateContent }>();
defineEmits<{ close: [] }>();
const element = ref<HTMLCanvasElement>(),
  error = ref(''),
  busy = ref(true);
let canvas: StaticCanvas | undefined,
  disposed = false;
const urls: string[] = [];
async function hydrate(node: any): Promise<void> {
  if (!node || typeof node !== 'object') return;
  if (String(node.type).toLowerCase() === 'image') {
    const { url } = await requestClient.post<{ url: string }>(
      '/assets/' + node.assetId + '/access-url',
    );
    if (!url.startsWith('/api/v1/')) throw new Error('素材访问地址无效');
    const response = await fetch(url);
    if (!response.ok) throw new Error('无法加载模板素材');
    const blob = await response.blob();
    if (disposed) return;
    const objectURL = URL.createObjectURL(blob);
    urls.push(objectURL);
    node.src = objectURL;
  }
  if (node.fontAssetId) {
    if (!/^\d+$/.test(node.fontAssetId)) throw new Error('字体编号无效');
    const { url } = await requestClient.post<{ url: string }>('/assets/' + node.fontAssetId + '/access-url');
    if (!url.startsWith('/api/v1/')) throw new Error('字体访问地址无效');
    const response = await fetch(url);
    if (!response.ok) throw new Error('无法加载模板字体');
    const family = 'asset-font-' + node.fontAssetId;
    const font = await new FontFace(family, await response.arrayBuffer()).load();
    if (disposed) return;
    document.fonts.add(font);
    node.fontFamily = family;
  }
  await Promise.all(
    Object.values(node)
      .filter((v) => v && typeof v === 'object')
      .map(hydrate),
  );
}
onMounted(async () => {
  try {
    await nextTick();
    const document = JSON.parse(JSON.stringify(props.content.document));
    await hydrate(document);
    if (disposed || !element.value) return;
    const scale = Math.min(1, 700 / props.content.width, 540 / props.content.height);
    canvas = new StaticCanvas(element.value, {
      width: props.content.width * scale,
      height: props.content.height * scale,
    });
    await canvas.loadFromJSON(document);
    if (disposed) return;
    canvas.setZoom(scale);
    canvas.requestRenderAll();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
});
onBeforeUnmount(() => {
  disposed = true;
  if (canvas) void canvas.dispose().finally(() => urls.forEach(URL.revokeObjectURL));
  else urls.forEach(URL.revokeObjectURL);
});
</script>
<template>
  <Modal :open="true" :title="content.title" :width="800" :footer="null" @cancel="$emit('close')"
    ><p>
      {{ content.width }} × {{ content.height }} px ·
      {{ content.document?.objects?.length || 0 }} 个图层
    </p>
    <Alert v-if="error" :message="error" type="error" show-icon /><Spin :spinning="busy"
      ><div
        style="
          display: flex;
          justify-content: center;
          padding: 20px;
          background: #edf0f5;
          overflow: auto;
        "
      >
        <canvas ref="element" /></div></Spin
  ></Modal>
</template>
