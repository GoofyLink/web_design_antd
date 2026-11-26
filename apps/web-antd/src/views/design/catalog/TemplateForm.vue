<script setup lang="ts">
import { ref } from 'vue';
import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
import TemplateCanvas from './TemplateCanvas.vue';
import type { Category, Template, TemplateContent } from './types';
const props = defineProps<{
  template?: Template;
  categories: Category[];
  saving: boolean;
  error: string;
}>();
const emit = defineEmits<{ save: [content: TemplateContent]; close: [] }>();
const canvasOpen = ref(false);
function applyDocument(document: Record<string, any>) {
  content.value.document = document;
  canvasOpen.value = false;
}
const content = ref<TemplateContent>(
  props.template?.draft
    ? JSON.parse(JSON.stringify(props.template.draft))
    : {
        title: '新模板',
        categoryId: props.categories[0]?.id || '',
        tags: [],
        width: 1080,
        height: 1440,
        cover: '',
        engine: 'fabric',
        engineVersion: '6.9.1',
        schemaVersion: 1,
        document: { version: '6.9.1', background: '#ffffff', objects: [] },
      },
);
const tags = ref(content.value.tags.join(',')),
  text = ref('在这里写下标题'),
  color = ref('#f0f5ff'),
  textColor = ref('#203c65'),
  license = ref(''),
  uploading = ref(false),
  localError = ref('');
function rebuild() {
  content.value.document = {
    version: '6.9.1',
    background: color.value,
    objects: [
      {
        type: 'Textbox',
        text: text.value,
        left: content.value.width * 0.1,
        top: content.value.height * 0.25,
        width: content.value.width * 0.8,
        fontSize: Math.round(content.value.width * 0.065),
        fontFamily: 'Arial',
        fill: textColor.value,
        textAlign: 'center',
        originX: 'left',
        originY: 'top',
      },
    ],
  };
}
function simple() {
  Modal.confirm({
    title: '重建为简单文字模板？',
    content: '会替换当前文档中的图层，模板标题、分类及封面保留。',
    onOk: rebuild,
  });
}
async function upload(e: Event) {
  const input = e.target as HTMLInputElement,
    file = input.files?.[0];
  input.value = '';
  if (!file) return;
  uploading.value = true;
  localError.value = '';
  try {
    if (!license.value.trim()) throw new Error('请先填写封面授权说明');
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 20 * 1024 * 1024
    )
      throw new Error('请选择20MB以内 PNG/JPG/WebP');
    const body = new FormData();
    body.append('file', file);
    body.append('kind', 'image');
    body.append('license', license.value.trim());
    const asset = await requestClient.post<{ id: string }>('/assets', body, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    content.value.coverAssetId = asset.id;
    content.value.cover = '/api/v1/assets/' + asset.id + '/content';
  } catch (e) {
    localError.value = (e as Error).message;
  } finally {
    uploading.value = false;
  }
}
async function importFile(e: Event) {
  const input = e.target as HTMLInputElement,
    file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('设计文件不超过5MB');
    const data = JSON.parse(await file.text());
    const doc = data.content || data;
    if (doc.engine !== 'fabric' || !Array.isArray(doc.document?.objects))
      throw new Error('请选择本站导出的 Fabric 设计 JSON');
    content.value = {
      ...content.value,
      width: doc.width,
      height: doc.height,
      engine: 'fabric',
      engineVersion: doc.engineVersion,
      schemaVersion: doc.schemaVersion,
      document: doc.document,
    };
    localError.value = '';
  } catch (e) {
    localError.value = (e as Error).message;
  }
}
function submit() {
  localError.value = '';
  const c = content.value;
  if (!c.title.trim() || !c.categoryId) {
    localError.value = '请填写标题并选择分类';
    return;
  }
  if (
    !Number.isInteger(c.width) ||
    !Number.isInteger(c.height) ||
    c.width < 1 ||
    c.height < 1 ||
    c.width > 8192 ||
    c.height > 8192 ||
    c.width * c.height > 40000000
  ) {
    localError.value = '画布尺寸无效，单边1–8192，总像素不超过4000万';
    return;
  }
  c.tags = tags.value
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
  emit('save', JSON.parse(JSON.stringify(c)));
}
</script>
<template>
  <Modal
    :open="true"
    :title="template ? '编辑模板草稿' : '新增模板草稿'"
    :width="760"
    :mask-closable="false"
    :closable="!saving && !uploading"
    :cancel-button-props="{ disabled: saving || uploading }"
    :confirm-loading="saving || uploading"
    ok-text="保存草稿"
    @ok="submit"
    @cancel="emit('close')"
    ><Alert v-if="error || localError" :message="error || localError" type="error" show-icon /><Form
      layout="vertical"
      :disabled="saving || uploading"
      ><FormItem label="标题" required
        ><Input v-model:value="content.title" :maxlength="100" /></FormItem
      ><FormItem label="分类" required
        ><Select
          v-model:value="content.categoryId"
          :options="categories.map((c) => ({ label: c.name, value: c.id }))" /></FormItem
      ><FormItem label="标签（逗号分隔）"><Input v-model:value="tags" /></FormItem
      ><Space
        ><FormItem label="宽 / px"
          ><InputNumber
            v-model:value="content.width"
            :min="1"
            :max="8192"
            :precision="0" /></FormItem
        ><FormItem label="高 / px"
          ><InputNumber
            v-model:value="content.height"
            :min="1"
            :max="8192"
            :precision="0" /></FormItem></Space
      ><FormItem label="封面授权说明" required
        ><Input
          v-model:value="license"
          :maxlength="1000"
          placeholder="例如：公司原创 / 已获授权，填写来源" /></FormItem
      ><FormItem label="模板封面"
        ><img
          v-if="content.cover"
          :src="content.cover"
          alt="模板封面"
          style="max-height: 160px; max-width: 100%; object-fit: contain; margin-bottom: 12px"
        /><input
          :disabled="saving || uploading"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          @change="upload"
        /><small>上传公共封面后可发布；图片不自动插入画布。</small></FormItem
      ><FormItem label="导入设计文档"
        ><input
          :disabled="saving || uploading"
          type="file"
          accept=".json"
          @change="importFile"
        /><small
          >支持本站导出的设计。素材必须已转为后台公共素材，私有素材引用会被后端拒绝。</small
        ></FormItem
      ><Alert
        :message="`当前文档包含 ${content.document.objects?.length || 0} 个图层。修改标题、分类与封面不会重置文档。`"
        type="info"
      /><FormItem label="快速创建文字模板"
        ><Input v-model:value="text" :maxlength="300" /><Space style="margin-top: 12px"
          ><label>背景 <input v-model="color" type="color" /></label
          ><label>文字 <input v-model="textColor" type="color" /></label
          ><Button @click="simple">重建文字模板</Button></Space
        ></FormItem
      ></Form
    ><Button :disabled="saving || uploading" @click="canvasOpen = true"
      >可视化编辑画布</Button
    ></Modal
  >
  <TemplateCanvas
    v-if="canvasOpen"
    :content="content"
    @close="canvasOpen = false"
    @apply="applyDocument"
  />
</template>
