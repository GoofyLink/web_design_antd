<script setup lang="ts">
import { ref } from 'vue';
import { Page } from '@vben/common-ui';
import { Alert, Button, Card, Modal, Space, Table, Tag } from 'ant-design-vue';
import { requestClient } from '#/api/request';
import { useDesignList } from '../useDesignList';
import TopicForm from './TopicForm.vue';
import type { Topic } from './TopicForm.vue';
const { allowed, rows, total, page, busy, error, load, run, paginate, access } =
  useDesignList<Topic>('/topics', 'operation:read');
const open = ref(false),
  editing = ref<Topic>(),
  detail = ref<Topic>();
const columns = [
  { title: '专题标题', dataIndex: 'title', width: 230 },
  { title: '位置', dataIndex: 'slot', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '开始', dataIndex: 'startsAt', width: 220 },
  { title: '结束', dataIndex: 'endsAt', width: 220 },
  { title: '操作', key: 'actions', width: 240 },
];
const labels: Record<string, string> = { draft: '草稿', published: '已上线', offline: '已下线' };
async function edit(id?: string) {
  error.value = '';
  try {
    editing.value = id ? await requestClient.get('/topics/' + id) : undefined;
    open.value = true;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function show(id: string) {
  try {
    detail.value = await requestClient.get('/topics/' + id);
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function save(data: Record<string, unknown>) {
  if (
    await run(() =>
      editing.value
        ? requestClient.put('/topics/' + editing.value.id, data)
        : requestClient.post('/topics', data),
    )
  )
    open.value = false;
}
function remove(row: Topic) {
  Modal.confirm({
    title: '删除专题“' + row.title + '”？',
    content: '已上线专题须先编辑为下线状态后才能删除。',
    onOk: () =>
      run(() => requestClient.delete('/topics/' + row.id, { data: { version: row.version } })),
  });
}
</script>
<template>
  <Page title="专题运营" description="配置首页与精选专题，支持排期、模板排序及上下线。"
    ><Card
      ><template #extra
        ><Space
          ><Button :loading="busy" @click="load">刷新</Button
          ><Button
            v-if="access.accessCodes.includes('operation:write')"
            type="primary"
            @click="edit()"
            >新增专题</Button
          ></Space
        ></template
      ><Alert v-if="!allowed" message="没有运营查看权限" type="warning" /><Alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
      /><Table
        v-if="allowed"
        :columns="columns"
        :data-source="rows"
        row-key="id"
        :loading="busy"
        :scroll="{ x: 1100 }"
        :pagination="{ current: page, total, pageSize: 20, onChange: paginate }"
        ><template #bodyCell="{ column, record }"
          ><Tag v-if="column.key === 'status'">{{ labels[record.status] }}</Tag
          ><Space v-if="column.key === 'actions'"
            ><Button @click="show(record.id)">详情</Button
            ><template v-if="access.accessCodes.includes('operation:write')"
              ><Button :disabled="busy" @click="edit(record.id)">编辑</Button
              ><Button
                :disabled="busy || record.status === 'published'"
                danger
                @click="remove(record as Topic)"
                >删除</Button
              ></template
            ></Space
          ></template
        ></Table
      ></Card
    ><TopicForm
      v-if="open"
      :topic="editing"
      :busy="busy"
      :error="error"
      @save="save"
      @close="open = false"
    /><Modal :open="!!detail" :title="detail?.title" :footer="null" @cancel="detail = undefined"
      ><p>{{ detail?.description }}</p>
      <ol>
        <li v-for="item in detail?.templates" :key="item.id" style="padding: 10px">
          {{ item.title }}
        </li>
      </ol></Modal
    ></Page
  >
</template>
