<script setup lang="ts">
import { reactive, shallowRef } from 'vue';
import { Alert, Form, FormItem, Input, InputPassword, Modal, message } from 'ant-design-vue';
import type { DesignUser } from './useDesignUsers';
const props = defineProps<{
  user: DesignUser;
  mode: 'edit' | 'password';
  updateUser: (id: string, data: { username: string; nickname: string }) => Promise<void>;
  resetPassword: (id: string, password: string) => Promise<void>;
}>();
const emit = defineEmits<{ close: [] }>();
const saving = shallowRef(false);
const error = shallowRef('');
const form = reactive({
  username: props.user.username,
  nickname: props.user.nickname,
  password: '',
  confirm: '',
});
async function submit() {
  if (saving.value) return;
  error.value = '';
  if (props.mode === 'edit') {
    if (!/^[a-zA-Z0-9_]{3,32}$/.test(form.username.trim())) {
      error.value = '账号须为 3–32 位字母、数字或下划线';
      return;
    }
    if ([...form.nickname.trim()].length > 64) {
      error.value = '姓名最多 64 个字';
      return;
    }
  } else {
    const length = new TextEncoder().encode(form.password).length;
    if (length < 8 || length > 72) {
      error.value = '密码须为 8–72 UTF-8 字节';
      return;
    }
    if (form.password !== form.confirm) {
      error.value = '两次输入的密码不一致';
      return;
    }
  }
  saving.value = true;
  try {
    if (props.mode === 'edit')
      await props.updateUser(props.user.id, {
        username: form.username.trim(),
        nickname: form.nickname.trim(),
      });
    else await props.resetPassword(props.user.id, form.password);
    form.password = '';
    form.confirm = '';
    message.success(props.mode === 'edit' ? '用户资料已更新' : '密码已重置，该用户需重新登录');
    emit('close');
  } catch (e) {
    error.value = (e as Error).message || '保存失败，请重试';
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <Modal
    :open="true"
    :title="mode === 'edit' ? '编辑前台用户' : '重置用户密码'"
    :confirm-loading="saving"
    :closable="!saving"
    :mask-closable="!saving"
    :keyboard="!saving"
    :cancel-button-props="{ disabled: saving }"
    ok-text="保存"
    @ok="submit"
    @cancel="emit('close')"
  >
    <Form layout="vertical" :model="form" class="manage-form" @finish="submit">
      <template v-if="mode === 'edit'">
        <FormItem label="登录账号" required
          ><Input
            v-model:value="form.username"
            :maxlength="32"
            :disabled="saving"
            autocomplete="off"
        /></FormItem>
        <FormItem label="姓名"
          ><Input v-model:value="form.nickname" :maxlength="64" :disabled="saving"
        /></FormItem>
        <Alert
          type="info"
          show-icon
          message="修改登录账号后，该用户需使用新账号重新登录，原有作品和素材保留。"
        />
      </template>
      <template v-else>
        <FormItem label="登录账号"><Input :value="user.username" disabled /></FormItem>
        <FormItem label="新密码" required
          ><InputPassword
            v-model:value="form.password"
            :disabled="saving"
            autocomplete="new-password"
            placeholder="8–72 UTF-8 字节"
        /></FormItem>
        <FormItem label="确认新密码" required
          ><InputPassword
            v-model:value="form.confirm"
            :disabled="saving"
            autocomplete="new-password"
            placeholder="再次输入新密码"
            @press-enter="submit"
        /></FormItem>
        <Alert
          type="warning"
          show-icon
          message="保存后旧密码立即失效，并退出该用户所有已登录设备。"
        />
      </template>
      <Alert v-if="error" :message="error" type="error" show-icon class="form-error" />
    </Form>
  </Modal>
</template>
<style scoped>
.manage-form {
  margin-top: 24px;
}
.form-error {
  margin-top: 16px;
}
</style>
