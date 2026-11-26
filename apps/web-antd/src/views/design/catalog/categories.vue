<script setup lang="ts">
import { ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
import { useDesignList } from '../useDesignList';
import type { Category } from './types';
const { allowed, rows, busy, error, load, run, access } = useDesignList<Category>(
  '/categories',
  'category:read',
);
const open = ref(false),
  editing = ref(''),
  form = ref({ name: '', sort: 0, status: 'active' });
const columns = [
  { title: '分类名称', dataIndex: 'name' },
  { title: '排序', dataIndex: 'sort' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions' },
];
function edit(row?: Category) {
  editing.value = row?.id || '';
  form.value = { name: row?.name || '', sort: row?.sort || 0, status: row?.status || 'active' };
  open.value = true;
}
async function save() {
  if (!form.value.name.trim()) {
    error.value = '请输入分类名称';
    return;
  }
  const ok = await run(() =>
    editing.value
      ? requestClient.put('/categories/' + editing.value, {
          ...form.value,
          name: form.value.name.trim(),
        })
      : requestClient.post('/categories', { ...form.value, name: form.value.name.trim() }),
  );
  if (ok) open.value = false;
}
function remove(row: Category) {
  Modal.confirm({
    title: '删除分类“' + row.name + '”？',
    content: '被模板引用的分类不能删除。',
    onOk: () => run(() => requestClient.delete('/categories/' + row.id)),
  });
}
</script>
<template>
  <Page title="模板分类" description="分类启停与排序同步影响前台模板库。"
    ><Card
      ><template #extra
        ><Space
          ><Button :loading="busy" @click="load">刷新</Button
          ><Button
            v-if="access.accessCodes.includes('category:write')"
            type="primary"
            @click="edit()"
            >新增分类</Button
          ></Space
        ></template
      ><Alert v-if="!allowed" message="无分类查看权限" type="warning" /><Alert
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
        :pagination="{ pageSize: 20 }"
        ><template #bodyCell="{ column, record }"
          ><Tag
            v-if="column.key === 'status'"
            :color="record.status === 'active' ? 'green' : 'default'"
            >{{ record.status === 'active' ? '启用' : '停用' }}</Tag
          ><Space v-if="column.key === 'actions' && access.accessCodes.includes('category:write')"
            ><Button :disabled="busy" @click="edit(rows.find((r) => r.id === record.id))"
              >编辑</Button
            ><Button danger :disabled="busy" @click="remove(record as Category)"
              >删除</Button
            ></Space
          ></template
        ></Table
      ></Card
    ><Modal
      v-model:open="open"
      :title="editing ? '编辑分类' : '新增分类'"
      :confirm-loading="busy"
      :mask-closable="false"
      :closable="!busy"
      :cancel-button-props="{ disabled: busy }"
      @ok="save"
      ><Alert v-if="error" :message="error" type="error" /><Form layout="vertical" :disabled="busy"
        ><FormItem label="分类名称" required
          ><Input v-model:value="form.name" :maxlength="64" /></FormItem
        ><FormItem label="排序（数字小的在前）"
          ><InputNumber
            v-model:value="form.sort"
            :min="-100000"
            :max="100000"
            :precision="0" /></FormItem
        ><FormItem label="状态"
          ><Select
            v-model:value="form.status"
            :options="[
              { label: '启用', value: 'active' },
              { label: '停用', value: 'disabled' },
            ]" /></FormItem></Form></Modal
  ></Page>
</template>
