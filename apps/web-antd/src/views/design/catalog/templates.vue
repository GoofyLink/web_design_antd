<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Alert, Button, Card, InputSearch, Modal, Select, Space, Table, Tag } from 'ant-design-vue';
import { requestClient } from '#/api/request';
import { useDesignList } from '../useDesignList';
import TemplateForm from './TemplateForm.vue';
import TemplatePreview from './TemplatePreview.vue';
import type { Category, Template, TemplateContent, Revision } from './types';
const {
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
} = useDesignList<Template>('/templates', 'template:read');
const categories = ref<Category[]>([]),
  editing = ref<Template>(),
  formOpen = ref(false),
  preview = ref<TemplateContent>(),
  revisions = ref<Revision[]>([]),
  historyTemplate = ref(''),
  historyTotal = ref(0),
  historyPage = ref(1);
const labels: Record<string, string> = { draft: '草稿', published: '已发布', offline: '已下架' };
const columns = [
  { title: '模板', key: 'template', width: 300 },
  { title: '状态', key: 'status', width: 120 },
  { title: '版本', dataIndex: 'version', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 220 },
  { title: '操作', key: 'actions', width: 360 },
];
onMounted(async () => {
  if (access.accessCodes.includes('category:read'))
    try {
      categories.value = await requestClient.get('/categories');
    } catch (e) {
      error.value = (e as Error).message;
    }
});
async function edit(id?: string) {
  error.value = '';
  try {
    editing.value = id ? await requestClient.get<Template>('/templates/' + id) : undefined;
    formOpen.value = true;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function save(content: TemplateContent) {
  const ok = await run(() =>
    editing.value
      ? requestClient.put('/templates/' + editing.value.id, {
          version: editing.value.version,
          content,
        })
      : requestClient.post('/templates', { content }),
  );
  if (ok) formOpen.value = false;
}
function transition(row: Template, action: string) {
  Modal.confirm({
    title:
      ({ publish: '发布模板', offline: '下架模板', delete: '删除模板' } as Record<string, string>)[
        action
      ] + '？',
    content:
      action === 'publish'
        ? '发布后前台即可搜索和套用本次草稿。'
        : '此操作会影响模板在前台的可见性。',
    onOk: () =>
      run(() =>
        action === 'delete'
          ? requestClient.delete('/templates/' + row.id, { data: { version: row.version } })
          : requestClient.post('/templates/' + row.id + '/' + action, { version: row.version }),
      ),
  });
}
async function showPreview(id: string) {
  try {
    const data = await requestClient.get<Template>('/templates/' + id + '/preview');
    preview.value = data.draft;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function history(id: string, next = 1) {
  try {
    const data = await requestClient.get<{ items: Revision[]; total: number }>(
      '/templates/' + id + '/revisions',
      { params: { page: next, pageSize: 10 } },
    );
    revisions.value = data.items;
    historyTotal.value = data.total;
    historyPage.value = next;
    historyTemplate.value = id;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function revision(id: string) {
  try {
    const data = await requestClient.get<Revision>(
      '/templates/' + historyTemplate.value + '/revisions/' + id,
    );
    preview.value = data.content;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <Page title="设计模板" description="维护模板草稿、预览画布并发布到前台。发布修订保留历史记录。"
    ><Card
      ><template #extra
        ><Space
          ><Button :loading="busy" @click="load">刷新</Button
          ><Button
            v-if="access.accessCodes.includes('template:write')"
            type="primary"
            :disabled="busy"
            @click="edit()"
            >新增模板</Button
          ></Space
        ></template
      ><Alert v-if="!allowed" message="无模板查看权限" type="warning" /><Alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
      /><Space style="margin-bottom: 16px"
        ><InputSearch
          v-model:value="keyword"
          placeholder="搜索标题、标签"
          allow-clear
          @search="search" /><Select
          v-model:value="status"
          style="width: 140px"
          :options="[
            { label: '全部状态', value: '' },
            { label: '草稿', value: 'draft' },
            { label: '已发布', value: 'published' },
            { label: '已下架', value: 'offline' },
          ]"
          @change="search" /></Space
      ><Table
        v-if="allowed"
        :columns="columns"
        :data-source="rows"
        row-key="id"
        :loading="busy"
        :scroll="{ x: 1190 }"
        :pagination="{ current: page, total, pageSize: 20, onChange: paginate }"
        ><template #bodyCell="{ column, record }"
          ><div v-if="column.key === 'template'">
            <strong>{{ record.draft.title }}</strong>
            <p>{{ record.draft.width }} × {{ record.draft.height }} px</p>
          </div>
          <Tag v-else-if="column.key === 'status'">{{ labels[record.status] }}</Tag
          ><Space v-else-if="column.key === 'actions'" wrap
            ><Button size="small" @click="showPreview(record.id)">预览</Button
            ><Button size="small" @click="history(record.id)">修订</Button
            ><Button
              v-if="access.accessCodes.includes('template:write')"
              size="small"
              :disabled="busy"
              @click="edit(record.id)"
              >编辑</Button
            ><Button
              v-if="access.accessCodes.includes('template:publish')"
              size="small"
              :disabled="busy"
              @click="transition(record as Template, 'publish')"
              >发布草稿</Button
            ><Button
              v-if="
                record.status === 'published' && access.accessCodes.includes('template:publish')
              "
              size="small"
              :disabled="busy"
              @click="transition(record as Template, 'offline')"
              >下架</Button
            ><Button
              v-if="access.accessCodes.includes('template:write')"
              size="small"
              danger
              :disabled="busy"
              @click="transition(record as Template, 'delete')"
              >删除</Button
            ></Space
          ></template
        ></Table
      ></Card
    ><TemplateForm
      v-if="formOpen"
      :template="editing"
      :categories="categories"
      :saving="busy"
      :error="error"
      @save="save"
      @close="formOpen = false"
    /><TemplatePreview v-if="preview" :content="preview" @close="preview = undefined" /><Modal
      :open="!!historyTemplate"
      title="发布修订"
      :footer="null"
      @cancel="historyTemplate = ''"
      ><Table
        :data-source="revisions"
        :columns="[
          { title: '版本', dataIndex: 'version' },
          { title: '发布时间', dataIndex: 'createdAt' },
          { title: '操作', key: 'actions' },
        ]"
        row-key="id"
        :pagination="{
          current: historyPage,
          total: historyTotal,
          pageSize: 10,
          onChange: (next: number) => history(historyTemplate, next),
        }"
        ><template #bodyCell="{ column, record }"
          ><Button v-if="column.key === 'actions'" @click="revision(record.id)"
            >预览修订</Button
          ></template
        ></Table
      ></Modal
    ></Page
  >
</template>
