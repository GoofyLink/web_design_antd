<script setup lang="ts">
import { onMounted, shallowRef } from 'vue';
import { Alert, Button, Descriptions, DescriptionsItem, Modal, Spin } from 'ant-design-vue';
import { requestClient } from '#/api/request';
import type { DesignUser } from './useDesignUsers';
const props = defineProps<{ id: string }>();
const emit = defineEmits<{ close: [] }>();
const user = shallowRef<DesignUser>(), busy = shallowRef(false), error = shallowRef('');
async function load() {
  busy.value = true; error.value = '';
  try { user.value = await requestClient.get<DesignUser>('/users/' + props.id); }
  catch (e) { error.value = (e as Error).message; }
  finally { busy.value = false; }
}
onMounted(load);
</script>
<template>
  <Modal :open="true" title="前台用户详情" :footer="null" @cancel="emit('close')">
    <Alert v-if="error" :message="error" type="error" show-icon />
    <Spin :spinning="busy"><Descriptions v-if="user" bordered :column="1">
      <DescriptionsItem label="用户ID">{{ user.id }}</DescriptionsItem>
      <DescriptionsItem label="登录账号">{{ user.username }}</DescriptionsItem>
      <DescriptionsItem label="姓名">{{ user.nickname || '未填写' }}</DescriptionsItem>
      <DescriptionsItem label="账户状态">{{ user.status === 'active' ? '已启用' : '已停用' }}</DescriptionsItem>
    </Descriptions></Spin>
    <Button class="mt-4" :loading="busy" @click="load">刷新详情</Button>
  </Modal>
</template>
