<script setup lang="ts">
import type { TableProps } from 'ant-design-vue';
import type { DesignUser } from './useDesignUsers';
import { computed } from 'vue';
import { Button, Empty, Table, Tag } from 'ant-design-vue';
const props = defineProps<{
  items: DesignUser[];
  total: number;
  page: number;
  loading: boolean;
  canStatus: boolean;
  canEdit: boolean;
  canPassword: boolean;
  canQuota: boolean;
  filtered: boolean;
  failed: boolean;
}>();
const emit = defineEmits<{
  pageChange: [page: number];
  toggle: [user: DesignUser];
  edit: [user: DesignUser];
  password: [user: DesignUser];
  quota: [user: DesignUser];
  detail: [user: DesignUser];
}>();
const columns: TableProps<DesignUser>['columns'] = [
  { title: '用户 ID', dataIndex: 'id', width: 200, ellipsis: true },
  { title: '登录账号', dataIndex: 'username', width: 240, ellipsis: true },
  { title: '姓名', dataIndex: 'nickname', ellipsis: true },
  { title: '状态', key: 'status', width: 120 },
  { title: '操作', key: 'action', width: 360, fixed: 'right' },
];
const pagination = computed(() => ({
  current: props.page,
  total: props.total,
  pageSize: 20,
  showSizeChanger: false,
  showQuickJumper: props.total > 20,
  showTotal: (total: number) => `共 ${total} 位用户`,
}));
const handleChange: TableProps<DesignUser>['onChange'] = (value) =>
  emit('pageChange', value.current ?? 1);
</script>
<template>
  <Table
    :columns="columns"
    :data-source="items"
    :loading="loading"
    :pagination="pagination"
    row-key="id"
    :scroll="{ x: 850 }"
    @change="handleChange"
  >
    <template #emptyText
      ><Empty
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        :description="
          failed
            ? '加载失败，请点击刷新重试'
            : filtered
              ? '没有符合条件的用户，请调整查询条件'
              : '暂无前台用户，添加账号后即可登录设计工作台'
        "
    /></template>
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'status'"
        ><Tag :color="record.status === 'active' ? 'success' : 'default'">{{
          record.status === 'active' ? '已启用' : '已停用'
        }}</Tag></template
      >
      <template v-else-if="column.key === 'action'">
        <Button type="link" size="small" @click="emit('detail', record as DesignUser)">详情</Button>
        <Button
          v-if="canQuota"
          type="link"
          size="small"
          @click="emit('quota', record as DesignUser)"
          >任务额度</Button
        >
        <Button v-if="canEdit" type="link" size="small" @click="emit('edit', record as DesignUser)"
          >编辑</Button
        >
        <Button
          v-if="canPassword"
          type="link"
          size="small"
          @click="emit('password', record as DesignUser)"
          >重置密码</Button
        >
        <Button
          v-if="canStatus"
          type="link"
          size="small"
          :danger="record.status === 'active'"
          @click="emit('toggle', record as DesignUser)"
          >{{ record.status === 'active' ? '停用' : '启用' }}</Button><span
          v-if="!canStatus && !canEdit && !canPassword && !canQuota"
          >—</span
        ></template
      >
    </template>
  </Table>
</template>
