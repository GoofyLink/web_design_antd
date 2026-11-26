<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  InputSearch,
  Modal,
  Select,
  Space,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
export interface Topic {
  id: string;
  title: string;
  description: string;
  status: string;
  slot: string;
  sort: number;
  startsAt: string;
  endsAt: string;
  version: number;
  templates?: { id: string; title: string; cover: string }[];
}
const props = defineProps<{ topic?: Topic; busy: boolean; error: string }>();
const emit = defineEmits<{ save: [data: Record<string, unknown>]; close: [] }>();
function localTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const form = ref({
  title: props.topic?.title || '',
  description: props.topic?.description || '',
  status: props.topic?.status || 'draft',
  slot: props.topic?.slot || 'home',
  sort: props.topic?.sort || 0,
  startsAt: localTime(props.topic?.startsAt || new Date(Date.now() - 60000).toISOString()),
  endsAt: localTime(props.topic?.endsAt || new Date(Date.now() + 30 * 86400000).toISOString()),
});
const selected = ref(props.topic?.templates?.map((t) => ({ id: t.id, title: t.title })) || []),
  options = ref<{ id: string; title: string }[]>([]),
  keyword = ref(''),
  page = ref(1),
  total = ref(0),
  loading = ref(false),
  localError = ref(''),
  pick = ref<string>();
async function search(reset = false) {
  if (reset) page.value = 1;
  loading.value = true;
  try {
    const data = await requestClient.get<{
      items: { id: string; draft: { title: string }; published?: { title: string } }[];
      total: number;
    }>('/templates', {
      params: { page: page.value, pageSize: 20, keyword: keyword.value, status: 'published' },
    });
    options.value = data.items.map((t) => ({
      id: t.id,
      title: t.published?.title || t.draft.title,
    }));
    total.value = data.total;
  } catch (e) {
    localError.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
function add() {
  const item = options.value.find((t) => t.id === pick.value);
  if (item && !selected.value.some((t) => t.id === item.id) && selected.value.length < 100)
    selected.value.push(item);
  pick.value = undefined;
}
function move(index: number, delta: number) {
  const next = index + delta;
  if (next < 0 || next >= selected.value.length) return;
  const [item] = selected.value.splice(index, 1);
  if (item) selected.value.splice(next, 0, item);
}
function save() {
  localError.value = '';
  if (!form.value.title.trim()) {
    localError.value = '请填写专题标题';
    return;
  }
  const start = new Date(form.value.startsAt),
    end = new Date(form.value.endsAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    localError.value = '请输入有效起止时间，结束需晚于开始';
    return;
  }
  emit('save', {
    ...form.value,
    title: form.value.title.trim(),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    templateIds: selected.value.map((t) => t.id),
    version: props.topic?.version || 0,
  });
}
onMounted(() => search());
</script>
<template>
  <Modal
    :open="true"
    :title="topic ? '编辑专题' : '新增专题'"
    :width="800"
    :confirm-loading="busy"
    :mask-closable="false"
    :closable="!busy"
    :cancel-button-props="{ disabled: busy }"
    @ok="save"
    @cancel="emit('close')"
    ><Alert v-if="error || localError" :message="error || localError" type="error" show-icon /><Form
      layout="vertical"
      :disabled="busy"
      ><FormItem label="专题标题"
        ><Input v-model:value="form.title" aria-label="专题标题" :maxlength="100" /></FormItem
      ><FormItem label="简介"
        ><Input.TextArea v-model:value="form.description" :maxlength="2000" /></FormItem
      ><Space wrap
        ><FormItem label="状态"
          ><Select
            v-model:value="form.status"
            style="width: 140px"
            :options="[
              { label: '草稿', value: 'draft' },
              { label: '上线', value: 'published' },
              { label: '下线', value: 'offline' },
            ]"
            aria-label="专题状态" /></FormItem
        ><FormItem label="展示位置"
          ><Select
            v-model:value="form.slot"
            style="width: 140px"
            :options="[
              { label: '首页', value: 'home' },
              { label: '精选专区', value: 'featured' },
              { label: '无固定位置', value: '' },
            ]" /></FormItem
        ><FormItem label="排序"
          ><InputNumber
            v-model:value="form.sort"
            :min="-100000"
            :max="100000"
            :precision="0" /></FormItem></Space
      ><Space wrap
        ><FormItem label="开始时间（本地时间）"
          ><input v-model="form.startsAt" type="datetime-local" :disabled="busy" /></FormItem
        ><FormItem label="结束时间（本地时间）"
          ><input v-model="form.endsAt" type="datetime-local" :disabled="busy" /></FormItem></Space
      ><FormItem label="选择已发布模板"
        ><InputSearch v-model:value="keyword" placeholder="搜索模板" @search="search(true)" /><Space
          style="margin-top: 10px"
          wrap
          ><Select
            v-model:value="pick"
            :loading="loading"
            :options="options.map((t) => ({ label: t.title, value: t.id }))"
            style="width: 340px; max-width: 100%"
            placeholder="选择要加入的模板"
          /><Button :disabled="!pick || busy" @click="add">加入专题</Button
          ><Button
            :disabled="page === 1 || loading"
            @click="
              page--;
              search();
            "
            >上一页</Button
          ><Button
            :disabled="page * 20 >= total || loading"
            @click="
              page++;
              search();
            "
            >下一页</Button
          ></Space
        ></FormItem
      >
      <div class="topic-selected">
        <div v-for="(item, index) in selected" :key="item.id">
          <span>{{ index + 1 }}. {{ item.title }}</span
          ><Space
            ><Button :disabled="busy || index === 0" @click="move(index, -1)">上移</Button
            ><Button :disabled="busy || index === selected.length - 1" @click="move(index, 1)"
              >下移</Button
            ><Button :disabled="busy" danger @click="selected.splice(index, 1)">移除</Button></Space
          >
        </div>
      </div>
      <Alert
        message="专题需已上线、处于起止时间内且包含可用模板，才会在前台显示。上线前至少选择一个模板。"
        type="info"
        show-icon /></Form
  ></Modal>
</template>
<style scoped>
.topic-selected {
  max-height: 260px;
  overflow: auto;
  margin: 15px 0;
}
.topic-selected > div {
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
}
.topic-selected span {
  flex: 1;
}
input[type='datetime-local'] {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: inherit;
  background: transparent;
}
</style>
