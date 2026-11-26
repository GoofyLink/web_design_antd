<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  CheckboxGroup,
  Form,
  FormItem,
  Input,
  InputSearch,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
import { useDesignList } from '../useDesignList';
interface Role {
  id: string;
  code: string;
  name: string;
  permissions: string[];
}
const { allowed, rows, busy, error, load, run, access } = useDesignList<Role>(
  '/roles',
  'role:read',
);
const permissions = ref<{ code: string; name: string }[]>([]),
  open = ref(false),
  id = ref(''),
  form = ref({ code: '', name: '', permissions: [] as string[] });
const keyword = ref('');
const filteredRows = computed(() => rows.value.filter(role => `${role.name} ${role.code}`.toLowerCase().includes(keyword.value.trim().toLowerCase())));
const columns = [
  { title: '角色名称', dataIndex: 'name' },
  { title: '角色代码', dataIndex: 'code' },
  { title: '权限', key: 'permissions' },
  { title: '操作', key: 'actions', width: 180 },
];
onMounted(async () => {
  if (allowed.value)
    try {
      permissions.value = await requestClient.get('/permissions');
    } catch (e) {
      error.value = (e as Error).message;
    }
});
function edit(role?: Role) {
  id.value = role?.id || '';
  form.value = {
    code: role?.code || '',
    name: role?.name || '',
    permissions: [...(role?.permissions || [])],
  };
  open.value = true;
}
async function save() {
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(form.value.code) || !form.value.name.trim()) {
    error.value = '角色代码须为3–32位字母、数字或下划线，并填写角色名称';
    return;
  }
  if (
    await run(() =>
      id.value
        ? requestClient.put('/roles/' + id.value, form.value)
        : requestClient.post('/roles', form.value),
    )
  )
    open.value = false;
}
function remove(role: Role) {
  Modal.confirm({
    title: '删除角色“' + role.name + '”？',
    content: '已被管理员使用的角色无法删除。',
    onOk: () => run(() => requestClient.delete('/roles/' + role.id)),
  });
}
</script>
<template>
  <Page title="角色与权限" description="按岗位分配管理权限。内置超级管理员角色不可修改或删除。"
    ><Card
      ><template #extra
        ><Space
          ><Button :loading="busy" @click="load">刷新</Button
          ><Button v-if="access.accessCodes.includes('role:write')" type="primary" @click="edit()"
            >新增角色</Button
          ></Space
        ></template
      ><Alert v-if="!allowed" message="没有角色查看权限" type="warning" /><Alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
      /><InputSearch v-model:value="keyword" placeholder="搜索角色名称或代码" allow-clear style="max-width:320px;margin-bottom:16px" /><Table
        v-if="allowed"
        :columns="columns"
        :data-source="filteredRows"
        row-key="id"
        :loading="busy"
        :pagination="{ pageSize: 15 }"
        ><template #bodyCell="{ column, record }"
          ><div v-if="column.key === 'permissions'">
            <Tag v-if="record.code === 'super_admin'" color="purple">全部权限</Tag
            ><Tag v-for="code in record.permissions" :key="code">{{
              permissions.find((p) => p.code === code)?.name || code
            }}</Tag>
          </div>
          <Space
            v-if="
              column.key === 'actions' &&
              record.code !== 'super_admin' &&
              access.accessCodes.includes('role:write')
            "
            ><Button :disabled="busy" @click="edit(record as Role)">编辑</Button
            ><Button danger :disabled="busy" @click="remove(record as Role)">删除</Button></Space
          ></template
        ></Table
      ></Card
    ><Modal
      v-model:open="open"
      :title="id ? '编辑角色' : '新增角色'"
      :width="750"
      :confirm-loading="busy"
      :mask-closable="false"
      :closable="!busy"
      :cancel-button-props="{ disabled: busy }"
      @ok="save"
      ><Alert v-if="error" :message="error" type="error" /><Form layout="vertical" :disabled="busy"
        ><FormItem label="角色名称" required
          ><Input v-model:value="form.name" :maxlength="64" aria-label="角色名称" /></FormItem
        ><FormItem label="角色代码" required
          ><Input v-model:value="form.code" :maxlength="32" aria-label="角色代码" /></FormItem
        ><FormItem label="分配权限"
          ><CheckboxGroup
            v-model:value="form.permissions"
            :options="
              permissions.map((p) => ({ label: p.name + ' (' + p.code + ')', value: p.code }))
            "
            class="permission-options" /></FormItem></Form></Modal
  ></Page>
</template>
<style scoped>
.permission-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  max-height: 400px;
  overflow: auto;
}
@media (max-width: 600px) {
  .permission-options {
    grid-template-columns: 1fr;
  }
}
</style>
