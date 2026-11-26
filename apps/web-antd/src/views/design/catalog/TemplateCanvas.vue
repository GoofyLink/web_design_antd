<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { Alert, Button, Input, InputNumber, Modal, Select, Space } from 'ant-design-vue';
import { Canvas, FabricImage, FabricObject, Textbox, Rect } from 'fabric';
import { requestClient } from '#/api/request';
import type { TemplateContent } from './types';
const props = defineProps<{ content: TemplateContent }>();
const emit = defineEmits<{ close: []; apply: [document: Record<string, any>] }>();
FabricObject.customProperties = [
  ...new Set([
    ...FabricObject.customProperties,
    'assetId',
    'fontAssetId',
    'editorId',
    'editorLocked',
  ]),
];
type ObjectWithAssets = FabricObject & { assetId?: string; fontAssetId?: string };
const element = ref<HTMLCanvasElement>();
const busy = shallowRef(true),
  error = shallowRef(''),
  ready = shallowRef(false);
const selection = shallowRef<ObjectWithAssets>();
const text = shallowRef(''),
  fontSize = shallowRef(32),
  fill = shallowRef('#203c65');
const x = shallowRef(0),
  y = shallowRef(0),
  angle = shallowRef(0),
  background = shallowRef('#ffffff');
const kind = shallowRef('image'),
  keyword = shallowRef(''),
  page = shallowRef(1),
  total = shallowRef(0),
  resourceId = shallowRef('');
const resources = shallowRef<{ id: string; name: string }[]>([]),
  resourceBusy = shallowRef(false);
const isText = computed(() => selection.value instanceof Textbox);
const layers = shallowRef<{ index: number; label: string }[]>([]);
let canvas: Canvas | undefined,
  disposed = false;
const urls: string[] = [],
  assetCache = new Map<string, string>(),
  loadedFonts = new Map<string, string>();
async function assetURL(id: string) {
  if (assetCache.has(id)) return assetCache.get(id)!;
  const { url } = await requestClient.post<{ url: string }>('/assets/' + id + '/access-url');
  if (!url.startsWith('/api/v1/')) throw new Error('素材地址无效');
  const response = await fetch(url);
  if (!response.ok) throw new Error('无法读取素材');
  const blob = await response.blob();
  if (disposed) throw new Error('编辑器已关闭');
  const local = URL.createObjectURL(blob);
  urls.push(local);
  assetCache.set(id, local);
  return local;
}
async function font(id: string) {
  if (loadedFonts.has(id)) return loadedFonts.get(id)!;
  if (!/^\d+$/.test(id)) throw new Error('字体编号无效');
  const family = 'asset-font-' + id;
  const face = await new FontFace(family, `url(${await assetURL(id)})`).load();
  if (disposed) throw new Error('编辑器已关闭');
  document.fonts.add(face);
  loadedFonts.set(id, family);
  return family;
}
async function hydrate(node: any): Promise<void> {
  if (!node || typeof node !== 'object') return;
  if (String(node.type).toLowerCase() === 'image') node.src = await assetURL(node.assetId);
  if (node.fontAssetId) node.fontFamily = await font(node.fontAssetId);
  await Promise.all(
    Object.values(node)
      .filter((v) => v && typeof v === 'object')
      .map(hydrate),
  );
}
function sync() {
  const obj = canvas?.getActiveObject() as ObjectWithAssets | undefined;
  selection.value = obj && !obj.isType('ActiveSelection') ? obj : undefined;
  if (selection.value) {
    x.value = Math.round(selection.value.left);
    y.value = Math.round(selection.value.top);
    angle.value = Math.round(selection.value.angle);
    fill.value = typeof selection.value.fill === 'string' ? selection.value.fill : '#203c65';
    if (selection.value instanceof Textbox) {
      text.value = selection.value.text;
      fontSize.value = selection.value.fontSize;
    }
  }
  layers.value = (canvas?.getObjects() || [])
    .map((obj, index) => ({
      index,
      label:
        obj instanceof Textbox
          ? obj.text.slice(0, 24) || '文字'
          : obj instanceof FabricImage
            ? '图片'
            : obj.type,
    }))
    .reverse();
}
function change() {
  if (!selection.value || busy.value) return;
  selection.value.set({ left: x.value, top: y.value, angle: angle.value });
  if (!(selection.value instanceof FabricImage)) selection.value.set('fill', fill.value);
  if (selection.value instanceof Textbox) {
    selection.value.set({ text: text.value, fontSize: fontSize.value });
    selection.value.initDimensions();
  }
  selection.value.setCoords();
  canvas?.requestRenderAll();
  sync();
}
function add(type: 'text' | 'rect') {
  if (!canvas || busy.value) return;
  const obj =
    type === 'text'
      ? new Textbox('双击编辑文字', {
          left: 30,
          top: 30,
          width: Math.min(400, props.content.width),
          fontSize: 32,
          fontFamily: 'Arial',
          fill: '#203c65',
        })
      : new Rect({ left: 30, top: 30, width: 150, height: 100, fill: '#dbeafe' });
  canvas.add(obj);
  canvas.setActiveObject(obj);
  canvas.requestRenderAll();
  sync();
}
function select(index: number) {
  const obj = canvas?.getObjects()[index];
  if (obj) {
    canvas?.setActiveObject(obj);
    canvas?.requestRenderAll();
    sync();
  }
}
function remove() {
  if (!canvas || busy.value) return;
  canvas.remove(...canvas.getActiveObjects());
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  sync();
}
function order(up: boolean) {
  if (!canvas || !selection.value || busy.value) return;
  if (up) canvas.bringObjectForward(selection.value);
  else canvas.sendObjectBackwards(selection.value);
  canvas.requestRenderAll();
  sync();
}
async function loadResources(reset = false) {
  if (resourceBusy.value) return;
  if (reset) page.value = 1;
  resourceBusy.value = true;
  error.value = '';
  resourceId.value = '';
  try {
    const data = await requestClient.get<{ items: typeof resources.value; total: number }>(
      '/assets',
      {
        params: {
          scope: 'public',
          kind: kind.value,
          keyword: keyword.value,
          page: page.value,
          pageSize: 20,
        },
      },
    );
    resources.value = data.items;
    total.value = data.total;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    resourceBusy.value = false;
  }
}
async function insertResource() {
  if (!canvas || !resourceId.value || busy.value) return;
  if (kind.value === 'font' && !(selection.value instanceof Textbox)) {
    error.value = '请先选中文字图层';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    if (kind.value === 'font') {
      const target = selection.value as Textbox & { fontAssetId?: string };
      const family = await font(resourceId.value);
      target.fontAssetId = resourceId.value;
      target.set('fontFamily', family);
      target.initDimensions();
      target.setCoords();
    } else {
      const image = await FabricImage.fromURL(await assetURL(resourceId.value));
      if (disposed) return;
      Object.assign(image, { assetId: resourceId.value });
      image.scale(
        Math.min(1, props.content.width / image.width, props.content.height / image.height),
      );
      canvas.add(image);
      canvas.setActiveObject(image);
    }
    canvas.requestRenderAll();
    sync();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function systemFont() {
  if (!(selection.value instanceof Textbox) || busy.value) return;
  delete (selection.value as ObjectWithAssets).fontAssetId;
  selection.value.set('fontFamily', 'Arial');
  selection.value.initDimensions();
  selection.value.setCoords();
  canvas?.requestRenderAll();
  sync();
}
function apply() {
  if (!canvas || busy.value || !ready.value) return;
  const document = canvas.toObject();
  function canonical(node: any) {
    if (!node || typeof node !== 'object') return;
    if (String(node.type).toLowerCase() === 'image') node.src = 'asset:' + node.assetId;
    Object.values(node)
      .filter((v) => v && typeof v === 'object')
      .forEach(canonical);
  }
  canonical(document);
  emit('apply', document);
}
onMounted(async () => {
  try {
    await nextTick();
    const document = JSON.parse(JSON.stringify(props.content.document));
    await hydrate(document);
    if (disposed || !element.value) return;
    const zoom = Math.min(1, 650 / props.content.width, 520 / props.content.height);
    canvas = new Canvas(element.value, {
      width: props.content.width * zoom,
      height: props.content.height * zoom,
      preserveObjectStacking: true,
    });
    await canvas.loadFromJSON(document);
    if (disposed) return;
    canvas.setZoom(zoom);
    background.value =
      typeof canvas.backgroundColor === 'string' ? canvas.backgroundColor || '#ffffff' : '#ffffff';
    for (const event of [
      'selection:created',
      'selection:updated',
      'selection:cleared',
      'object:modified',
      'text:changed',
    ] as const)
      canvas.on(event, sync);
    canvas.requestRenderAll();
    sync();
    ready.value = true;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
  void loadResources();
});
function setBackground() {
  if (canvas && !busy.value) {
    canvas.backgroundColor = background.value;
    canvas.requestRenderAll();
  }
}
onBeforeUnmount(() => {
  disposed = true;
  if (canvas) void canvas.dispose().finally(() => urls.forEach(URL.revokeObjectURL));
  else urls.forEach(URL.revokeObjectURL);
});
</script>
<template>
  <Modal
    :open="true"
    title="可视化编辑模板"
    :width="1120"
    :mask-closable="false"
    :closable="!busy"
    :keyboard="!busy"
    :cancel-button-props="{ disabled: busy }"
    :ok-button-props="{ disabled: !ready || busy }"
    ok-text="应用到草稿"
    cancel-text="放弃本次编辑"
    @ok="apply"
    @cancel="emit('close')"
  >
    <Alert v-if="error" :message="error" type="error" show-icon class="mb-4" />
    <p class="mb-4">拖动、缩放和旋转画布元素，双击编辑文字。应用后还需保存草稿。</p>
    <Space wrap class="mb-4"
      ><Button :disabled="busy || !ready" @click="add('text')">添加文字</Button
      ><Button :disabled="busy || !ready" @click="add('rect')">添加矩形</Button
      ><Button :disabled="busy || !selection" @click="remove">删除元素</Button
      ><Button :disabled="busy || !selection" @click="order(true)">上移一层</Button
      ><Button :disabled="busy || !selection" @click="order(false)">下移一层</Button
      ><label
        >背景
        <input v-model="background" type="color" :disabled="busy" @change="setBackground" /></label
    ></Space>
    <div class="template-workspace">
      <div class="template-stage"><canvas ref="element" /></div>
      <aside class="template-inspector">
        <h3>选中元素</h3>
        <p v-if="!selection">在画布或图层列表中选择元素</p>
        <Space v-if="selection" direction="vertical" style="width: 100%"
          ><label
            >X
            <InputNumber
              v-model:value="x"
              aria-label="元素X"
              :disabled="busy"
              @change="change" /></label
          ><label
            >Y
            <InputNumber
              v-model:value="y"
              aria-label="元素Y"
              :disabled="busy"
              @change="change" /></label
          ><label
            >角度 <InputNumber v-model:value="angle" :disabled="busy" @change="change" /></label
          ><template v-if="isText"
            ><Input
              v-model:value="text"
              aria-label="模板文字内容"
              :disabled="busy"
              @change="change"
            /><label
              >字号
              <InputNumber
                v-model:value="fontSize"
                :min="1"
                :max="1000"
                :disabled="busy"
                @change="change" /></label
            ><Button :disabled="busy" @click="systemFont">恢复系统字体</Button></template
          ><label v-if="!(selection instanceof FabricImage)"
            >填充 <input v-model="fill" type="color" :disabled="busy" @change="change" /></label
        ></Space>
        <h3>公共素材与字体</h3>
        <Space direction="vertical" style="width: 100%"
          ><Select
            v-model:value="kind"
            aria-label="模板素材类型"
            :disabled="resourceBusy || busy"
            :options="[
              { label: '图片', value: 'image' },
              { label: '字体', value: 'font' },
            ]"
            style="width: 100%"
            @change="loadResources(true)"
          /><Input
            v-model:value="keyword"
            aria-label="模板素材搜索"
            placeholder="素材名称"
            :disabled="resourceBusy"
            @press-enter="loadResources(true)"
          /><Button :disabled="resourceBusy" @click="loadResources(true)">搜索素材</Button
          ><Select
            v-model:value="resourceId"
            aria-label="选择模板素材"
            :loading="resourceBusy"
            :disabled="busy || resourceBusy"
            :options="resources.map((r) => ({ label: r.name, value: r.id }))"
            style="width: 100%"
          /><Space
            ><Button
              :disabled="resourceBusy || page <= 1"
              @click="
                page--;
                loadResources();
              "
              >上一页</Button
            ><span>{{ page }}</span
            ><Button
              :disabled="resourceBusy || page * 20 >= total"
              @click="
                page++;
                loadResources();
              "
              >下一页</Button
            ></Space
          ><Button
            :disabled="busy || !ready || !resourceId || (kind === 'font' && !isText)"
            @click="insertResource"
            >{{ kind === 'font' ? '应用字体' : '插入图片' }}</Button
          ></Space
        >
        <h3>图层（上方为顶层）</h3>
        <div class="template-layers">
          <button
            v-for="layer in layers"
            :key="layer.index"
            :disabled="busy"
            @click="select(layer.index)"
          >
            {{ layer.index + 1 }} · {{ layer.label }}
          </button>
        </div>
      </aside>
    </div>
  </Modal>
</template>
<style scoped>
.template-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
}
.template-stage {
  min-height: 300px;
  background: #edf0f5;
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px;
}
.template-inspector {
  max-height: 600px;
  overflow: auto;
  padding-right: 8px;
}
.template-inspector h3 {
  font-weight: 600;
  margin: 16px 0 10px;
}
.template-layers {
  display: grid;
  gap: 6px;
}
.template-layers button {
  text-align: left;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px;
  overflow-wrap: anywhere;
}
@media (max-width: 800px) {
  .template-workspace {
    grid-template-columns: 1fr;
  }
  .template-stage {
    justify-content: flex-start;
  }
  .template-inspector {
    max-height: none;
  }
}
</style>
