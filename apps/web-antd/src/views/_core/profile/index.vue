<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  FormItem,
  Input,
  InputPassword,
  Row,
  message,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
import { useAuthStore } from '#/store';
const auth = useAuthStore();
const profile = ref({ username: '', nickname: '', avatar: '' }),
  password = ref({ oldPassword: '', newPassword: '', confirm: '' }),
  busy = ref(false),
  error = ref('');
onMounted(async () => {
  try {
    profile.value = await requestClient.get('/me');
  } catch (e) {
    error.value = (e as Error).message;
  }
});
async function save() {
  busy.value = true;
  error.value = '';
  try {
    await requestClient.request('/me', {
      method: 'PATCH',
      data: { nickname: profile.value.nickname, avatar: profile.value.avatar },
    });
    await auth.fetchUserInfo();
    message.success('个人资料已保存');
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function changePassword() {
  error.value = '';
  const length = new TextEncoder().encode(password.value.newPassword).length;
  if (!password.value.oldPassword || length < 8 || length > 72) {
    error.value = '填写原密码，新密码须为8–72 UTF-8字节';
    return;
  }
  if (password.value.newPassword !== password.value.confirm) {
    error.value = '两次密码不一致';
    return;
  }
  busy.value = true;
  try {
    await requestClient.put('/me/password', {
      oldPassword: password.value.oldPassword,
      newPassword: password.value.newPassword,
    });
    password.value = { oldPassword: '', newPassword: '', confirm: '' };
    message.success('密码已修改，请重新登录');
    await auth.logout();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <Page title="个人中心" description="维护当前管理员资料和登录密码。"
    ><Alert v-if="error" :message="error" type="error" show-icon style="margin-bottom: 16px" /><Row
      :gutter="[24, 24]"
      ><Col :xs="24" :lg="12"
        ><Card title="个人资料"
          ><Form layout="vertical" :disabled="busy"
            ><FormItem label="管理员账号"><Input :value="profile.username" disabled /></FormItem
            ><FormItem label="姓名"
              ><Input
                v-model:value="profile.nickname"
                :maxlength="64"
                aria-label="管理员姓名" /></FormItem
            ><FormItem v-if="profile.avatar" label="头像"
              ><Button @click="profile.avatar = ''">清除现有头像</Button></FormItem
            ><Button type="primary" :loading="busy" @click="save">保存资料</Button></Form
          ></Card
        ></Col
      ><Col :xs="24" :lg="12"
        ><Card title="修改密码"
          ><Form layout="vertical" :disabled="busy"
            ><FormItem label="原密码"
              ><InputPassword
                v-model:value="password.oldPassword"
                autocomplete="current-password" /></FormItem
            ><FormItem label="新密码"
              ><InputPassword
                v-model:value="password.newPassword"
                autocomplete="new-password" /></FormItem
            ><FormItem label="确认新密码"
              ><InputPassword
                v-model:value="password.confirm"
                autocomplete="new-password" /></FormItem
            ><Alert
              message="修改密码后所有会话失效，需要重新登录。"
              type="info"
              show-icon
              style="margin-bottom: 16px"
            /><Button type="primary" :loading="busy" @click="changePassword">修改密码</Button></Form
          ></Card
        ></Col
      ></Row
    ></Page
  >
</template>
