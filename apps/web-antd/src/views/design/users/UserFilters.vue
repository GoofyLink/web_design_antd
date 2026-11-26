<script setup lang="ts">
import { Button, Form, FormItem, Input, Select, Space } from 'ant-design-vue';
const keyword = defineModel<string>('keyword', { required: true });
const status = defineModel<string>('status', { required: true });
defineProps<{ loading: boolean }>();
const emit = defineEmits<{ search: []; reset: [] }>();
const options = [
  { label: '全部状态', value: '' },
  { label: '已启用', value: 'active' },
  { label: '已停用', value: 'disabled' },
];
</script>
<template>
  <Form :model="{ keyword, status }" layout="inline" class="user-filters" @finish="emit('search')">
    <FormItem label="登录账号"
      ><Input
        v-model:value="keyword"
        placeholder="请输入登录账号"
        allow-clear
        class="account-input"
    /></FormItem>
    <FormItem label="账号状态"
      ><Select v-model:value="status" :options="options" class="status-input"
    /></FormItem>
    <FormItem
      ><Space
        ><Button type="primary" html-type="submit" :loading="loading">查询</Button
        ><Button @click="emit('reset')">重置</Button></Space
      ></FormItem
    >
  </Form>
</template>
<style scoped>
.user-filters {
  gap: 16px 8px;
}
.account-input {
  width: 240px;
}
.status-input {
  width: 160px;
}
@media (max-width: 600px) {
  .account-input {
    width: 180px;
  }
}
</style>
