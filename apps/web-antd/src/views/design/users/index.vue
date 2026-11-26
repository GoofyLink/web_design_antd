<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { useAccessStore } from '@vben/stores';
import UserQuotaModal from './UserQuotaModal.vue';
import UserDetailModal from './UserDetailModal.vue';
import { requestClient } from '#/api/request';
import UserManageModal from './UserManageModal.vue';
import { Page } from '@vben/common-ui';
import { Alert, Button, Card, Modal, Space, message } from 'ant-design-vue';
import type { DesignUser } from './useDesignUsers';
import { useDesignUsers } from './useDesignUsers';
import UserCreateModal from './UserCreateModal.vue';
import UserFilters from './UserFilters.vue';
import UserTable from './UserTable.vue';
const {
  canEdit,
  canPassword,
  updateUser,
  resetPassword,
  canCreate,
  canStatus,
  items,
  total,
  page,
  keyword,
  status,
  loading,
  error,
  load,
  create,
  setStatus,
} = useDesignUsers();
const selectedUser = shallowRef<DesignUser>();
const detailId = shallowRef('');
const reading = shallowRef(false);
const quotaUser = shallowRef<DesignUser>();
const access = useAccessStore();
const canQuota = computed(() => access.accessCodes.includes('job:read'));
const manageMode = shallowRef<'edit' | 'password'>('edit');
const manageOpen = shallowRef(false);
async function manage(user: DesignUser, mode: 'edit' | 'password') {
  if (reading.value) return;
  reading.value = true; error.value = '';
  try {
    selectedUser.value = await requestClient.get<DesignUser>('/users/' + user.id);
    manageMode.value = mode;
    manageOpen.value = true;
  } catch (e) { error.value = (e as Error).message; }
  finally { reading.value = false; }
}
function search() {
  page.value = 1;
  void load();
}
function reset() {
  keyword.value = '';
  status.value = '';
  search();
}
function pageChange(value: number) {
  page.value = value;
  void load();
}
function toggle(item: DesignUser) {
  Modal.confirm({
    title: item.status === 'active' ? `停用 ${item.username}？` : `启用 ${item.username}？`,
    content:
      item.status === 'active'
        ? '停用后该用户立即退出登录，已有作品与素材保留。'
        : '启用后用户可以重新登录。',
    async onOk() {
      await setStatus(item);
      message.success('状态已更新');
    },
  });
}
</script>
<template>
  <Page title="前台用户" description="管理公司内部设计账号，员工使用这些账号登录设计工作台。">
    <div class="users-content">
      <Card :bordered="false"
        ><UserFilters
          v-model:keyword="keyword"
          v-model:status="status"
          :loading="loading"
          @search="search"
          @reset="reset"
      /></Card>
      <Card title="用户列表" :bordered="false">
        <template #extra
          ><Space wrap
            ><Button :loading="loading" @click="load">刷新</Button
            ><UserCreateModal v-if="canCreate" :create="create" /></Space
        ></template>
        <div class="users-notices">
          <Alert
            message="仅限公司内部使用，前台账号由管理员统一添加。"
            type="info"
            show-icon
          /><Alert v-if="error" :message="error" type="error" show-icon />
        </div>
        <UserTable
          :items="items"
          :total="total"
          :page="page"
          :loading="loading"
          :can-status="canStatus"
          :can-edit="canEdit"
          :can-password="canPassword"
          :can-quota="canQuota"
          @quota="quotaUser = $event"
          @detail="detailId = $event.id"
          @edit="manage($event, 'edit')"
          @password="manage($event, 'password')"
          :filtered="Boolean(keyword || status)"
          :failed="Boolean(error)"
          @page-change="pageChange"
          @toggle="toggle"
        />
      </Card>
    </div>
    <UserManageModal
      v-if="manageOpen && selectedUser"
      :user="selectedUser"
      :mode="manageMode"
      :update-user="updateUser"
      :reset-password="resetPassword"
      @close="manageOpen = false"
    />
    <UserDetailModal v-if="detailId" :key="detailId" :id="detailId" @close="detailId = ''" />
    <UserQuotaModal
      v-if="quotaUser"
      :key="quotaUser.id"
      :user="quotaUser"
      @close="quotaUser = undefined"
    />
  </Page>
</template>
<style scoped>
.users-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.users-notices {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
</style>
