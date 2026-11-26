<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  Input,
  InputPassword,
  InputSearch,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
import { useDesignList } from '../useDesignList';
interface Admin {
  id: string;
  username: string;
  nickname: string;
  status: string;
  roleIds?: string[];
}
const { allowed, rows, total, page, keyword, busy, error, load, run, search, paginate, access } =
  useDesignList<Admin>('/admins', 'admin:read');
const roles = ref<{ id: string; name: string }[]>([]),
  open = ref(false),
  editing = ref<Admin>(),
  detail = ref<Admin>(),
  form = ref({ username: '', password: '', roleIds: [] as string[] });
const columns = [
  { title: '管理员账号', dataIndex: 'username' },
  { title: '姓名', dataIndex: 'nickname' },
  { title: '状态', key: 'status' },
  { title: '操作', key: 'actions', width: 280 },
];
onMounted(async () => {
  if (access.accessCodes.includes('role:read'))
    try {
      roles.value = await requestClient.get('/roles');
    } catch (e) {
      error.value = (e as Error).message;
    }
});
async function edit(id?: string) {
  error.value = '';
  try {
    editing.value = id ? await requestClient.get<Admin>('/admins/' + id) : undefined;
    form.value = {
      username: editing.value?.username || '',
      password: '',
      roleIds: [...(editing.value?.roleIds || [])],
    };
    open.value = true;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function show(id: string) {
  try {
    detail.value = await requestClient.get('/admins/' + id);
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function save() {
  if (form.value.roleIds.length < 1 || form.value.roleIds.length > 20) {
    error.value = '请为管理员选择 1–20 个角色';
    return;
  }
  if (!editing.value) {
    const length = new TextEncoder().encode(form.value.password).length;
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(form.value.username) || length < 8 || length > 72) {
      error.value = '账号须为3–32位字母数字下划线，密码为8–72 UTF-8字节';
      return;
    }
  }
  const ok = await run(() =>
    editing.value
      ? requestClient.put('/admins/' + editing.value.id + '/roles', { roleIds: form.value.roleIds })
      : requestClient.post('/admins', form.value),
  );
  if (ok) {
    form.value.password = '';
    open.value = false;
  }
}
function status(row: Admin) {
  Modal.confirm({
    title: (row.status === 'active' ? '停用' : '启用') + '管理员“' + row.username + '”？',
    content: '停用会撤销该管理员的会话；角色变更会立即影响接口权限。最后一个有效超级管理员受到保护。',
    onOk: () =>
      run(() =>
        requestClient.request('/admins/' + row.id + '/status', {
          method: 'PATCH',
          data: { status: row.status === 'active' ? 'disabled' : 'active' },
        }),
      ),
  });
}
</script>
<template>
  <Page title="管理员账号" description="管理员与前台员工账号独立，按角色授权。"
    ><Card
      ><template #extra
        ><Space
          ><Button :loading="busy" @click="load">刷新</Button
          ><Button v-if="access.accessCodes.includes('admin:write')" type="primary" @click="edit()"
            >新增管理员</Button
          ></Space
        ></template
      ><Alert v-if="!allowed" message="没有管理员查看权限" type="warning" /><Alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
      /><InputSearch
        v-model:value="keyword"
        placeholder="搜索管理员"
        style="max-width: 320px; margin-bottom: 16px"
        @search="search"
      /><Table
        v-if="allowed"
        :columns="columns"
        :data-source="rows"
        row-key="id"
        :loading="busy"
        :pagination="{ current: page, total, pageSize: 20, onChange: paginate }"
        ><template #bodyCell="{ column, record }"
          ><Tag
            v-if="column.key === 'status'"
            :color="record.status === 'active' ? 'green' : 'default'"
            >{{ record.status === 'active' ? '正常' : '停用' }}</Tag
          ><Space v-if="column.key === 'actions'"
            ><Button @click="show(record.id)">详情</Button
            ><template v-if="access.accessCodes.includes('admin:write')"
              ><Button :disabled="busy" @click="edit(record.id)">分配角色</Button
              ><Button :disabled="busy" @click="status(record as Admin)">{{
                record.status === 'active' ? '停用' : '启用'
              }}</Button></template
            ></Space
          ></template
        ></Table
      ></Card
    ><Modal
      v-model:open="open"
      :title="editing ? '分配管理员角色' : '新增管理员'"
      :confirm-loading="busy"
      :mask-closable="false"
      :closable="!busy"
      :cancel-button-props="{ disabled: busy }"
      @ok="save"
      @cancel="form.password = ''"
      ><Alert v-if="error" :message="error" type="error" /><Form layout="vertical" :disabled="busy"
        ><FormItem label="管理员账号"
          ><Input
            v-model:value="form.username"
            :disabled="!!editing || busy"
            aria-label="新管理员账号"
            :maxlength="32" /></FormItem
        ><FormItem v-if="!editing" label="初始密码"
          ><InputPassword
            v-model:value="form.password"
            autocomplete="new-password"
            aria-label="管理员初始密码" /></FormItem
        ><FormItem label="角色"
          ><Select
            v-model:value="form.roleIds"
            mode="multiple"
            show-search
            option-filter-prop="label"
            :options="roles.map((r) => ({ label: r.name, value: r.id }))"
            placeholder="选择角色" /></FormItem
        ><Alert
          v-if="!roles.length"
          message="没有可选角色，请检查角色读取权限。"
          type="warning" /></Form></Modal
    ><Modal :open="!!detail" title="管理员详情" :footer="null" @cancel="detail = undefined"
      ><Descriptions v-if="detail" :column="1" bordered
        ><DescriptionsItem label="账号">{{ detail.username }}</DescriptionsItem
        ><DescriptionsItem label="姓名">{{ detail.nickname }}</DescriptionsItem
        ><DescriptionsItem label="角色">{{
          detail.roleIds?.map((id) => roles.find((r) => r.id === id)?.name || id).join('、') ||
          '无角色'
        }}</DescriptionsItem
        ><DescriptionsItem label="状态">{{ detail.status }}</DescriptionsItem></Descriptions
      ></Modal
    ></Page
  >
</template>
