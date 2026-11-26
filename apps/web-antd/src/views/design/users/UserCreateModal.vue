<script setup lang="ts">
import { reactive, ref } from 'vue';
import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputPassword,
  Modal,
  message,
} from 'ant-design-vue';
const props = defineProps<{
  create: (data: { username: string; nickname: string; password: string }) => Promise<void>;
}>();
const open = ref(false),
  saving = ref(false),
  formError = ref('');
const form = reactive({ username: '', nickname: '', password: '' });
function showCreate() {
  Object.assign(form, { username: '', nickname: '', password: '' });
  formError.value = '';
  open.value = true;
}
async function submit() {
  if (saving.value) return;
  if (
    !/^[a-zA-Z0-9_]{3,32}$/.test(form.username) ||
    new TextEncoder().encode(form.password).length < 8 ||
    new TextEncoder().encode(form.password).length > 72
  ) {
    formError.value = '账号为 3–32 位字母、数字或下划线；密码为 8–72 字节。';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    await props.create({ ...form });
    form.password = '';
    open.value = false;
    message.success('用户已添加，可以登录前台');
  } catch (e) {
    formError.value = (e as Error).message || '添加失败，请重试';
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <Button type="primary" @click="showCreate">添加用户</Button>
  <Modal
    v-model:open="open"
    title="添加前台用户"
    :confirm-loading="saving"
    :closable="!saving"
    :mask-closable="!saving"
    :cancel-button-props="{ disabled: saving }"
    @ok="submit"
    @cancel="form.password = ''"
    ><Form layout="vertical" class="users-form"
      ><FormItem label="登录账号" required
        ><Input
          v-model:value="form.username"
          autocomplete="off"
          placeholder="3–32 位字母、数字或下划线"
          :maxlength="32" /></FormItem
      ><FormItem label="姓名"
        ><Input
          v-model:value="form.nickname"
          placeholder="例如：张小绘"
          :maxlength="64" /></FormItem
      ><FormItem label="初始密码" required
        ><InputPassword
          v-model:value="form.password"
          autocomplete="new-password"
          placeholder="至少 8 位，最长 72 字节"
          @press-enter="submit" /></FormItem
      ><Alert v-if="formError" :message="formError" type="error" /></Form
  ></Modal>
</template>
<style scoped>
.users-form {
  margin-top: 24px;
}
</style>
