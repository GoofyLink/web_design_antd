<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import { AuthenticationLogin, z } from '@vben/common-ui';
import { useAuthStore } from '#/store';
const authStore = useAuthStore();
const formSchema: VbenFormSchema[] = [
  { component: 'VbenInput', componentProps: { placeholder: '请输入管理员账号', autocomplete: 'username' }, fieldName: 'username', label: '管理员账号', rules: z.string().min(1, '请输入管理员账号') },
  { component: 'VbenInputPassword', componentProps: { placeholder: '请输入密码', autocomplete: 'current-password' }, fieldName: 'password', label: '密码', rules: z.string().min(1, '请输入密码') },
];
</script>
<template>
  <AuthenticationLogin :form-schema="formSchema" :loading="authStore.loginLoading" :show-code-login="false" :show-qrcode-login="false" :show-third-party-login="false" :show-register="false" :show-forget-password="false" @submit="authStore.authLogin" />
</template>
