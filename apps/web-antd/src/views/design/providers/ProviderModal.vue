<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Alert,
  Checkbox,
  Form,
  FormItem,
  Input,
  InputPassword,
  Modal,
  Select,
} from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import type { ImageProvider, ProviderForm } from './useProviders';
const props = defineProps<{
  kind?: 'image' | 'renderer';
  open: boolean;
  provider?: ImageProvider;
  busy: boolean;
  error: string;
}>();
const emit = defineEmits<{ close: []; save: [providerForm: ProviderForm] }>();
const renderer = computed(() => props.kind === 'renderer');
const intro = computed(() => renderer.value ? '仅保存渲染服务配置，不测试连接。' : '仅保存配置，不测试连接、不发送生成请求。前台生成能力本期仍为待接入。');
const endpointPlaceholder = computed(() => renderer.value ? 'https://your-service.example/render' : 'https://your-service.example/v1/images/generations');
const keyHelp = computed(() => props.provider?.hasKey ? '已保存密钥；留空保持原值，填写新值则替换。密钥不会回显。' : renderer.value ? '若渲染服务无需鉴权，可留空。' : '可以先留空保存配置；无密钥时前台不列为可用服务。');
const warning = computed(() => renderer.value ? '启用前请确认服务地址与协议正确，已有排队任务可能使用该配置。' : '保存后的密钥由后端加密存储，仅管理员可修改。配置启用仅让前台可选择该服务，不代表本期已接通生图。');
const formRef = ref<FormInstance>();
const providerForm = ref<ProviderForm>({
  name: '',
  endpoint: '',
  model: '',
  apiKey: '',
  clearKey: false,
  status: 'disabled' as ProviderForm['status'],
});
watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(providerForm.value, {
        name: props.provider?.name || '',
        endpoint: props.provider?.endpoint || '',
        model: props.provider?.model || '',
        apiKey: '',
        clearKey: false,
        status: props.provider?.status || 'disabled',
      });
      formRef.value?.clearValidate();
    } else {
      providerForm.value.apiKey = '';
    }
  },
);
async function submit() {
  try {
    await formRef.value?.validate();
    emit('save', { ...providerForm.value });
  } catch {
    /* validation shown by Form */
  }
}
async function validateEndpoint(_rule: unknown, value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      value.length > 1000
    )
      throw new Error();
  } catch {
    throw new Error('填写完整 HTTPS 接口地址，不含凭据、查询参数或片段');
  }
}
</script>
<template>
  <Modal
    :open="open"
    :title="(provider ? '编辑' : '新增') + (kind === 'renderer' ? '渲染服务' : ' AI 图片服务')"
    :confirm-loading="busy"
    :closable="!busy"
    :mask-closable="false"
    :keyboard="!busy"
    :cancel-button-props="{ disabled: busy }"
    ok-text="保存配置"
    cancel-text="取消"
    :width="640"
    @ok="submit"
    @cancel="emit('close')"
    ><Alert
      :message="intro"
      type="info"
      show-icon
      style="margin-bottom: 20px" /><Alert
      v-if="error"
      :message="error"
      type="error"
      show-icon
      style="margin-bottom: 16px" /><Form
      ref="formRef"
      :model="providerForm"
      layout="vertical"
      :disabled="busy"
      ><FormItem
        label="服务名称"
        name="name"
        :rules="[{ required: true, whitespace: true, message: '请输入服务名称' }]"
        ><Input
          v-model:value="providerForm.name"
          :maxlength="100"
          placeholder="例如：公司图片服务" /></FormItem
      ><FormItem
        :label="kind === 'renderer' ? '完整渲染接口地址' : '完整图片生成接口地址'"
        name="endpoint"
        :rules="[{ required: true, message: '请输入接口地址' }, { validator: validateEndpoint }]"
        ><Input
          v-model:value="providerForm.endpoint"
          :maxlength="1000"
          :placeholder="endpointPlaceholder" /></FormItem
      ><FormItem
        label="模型名称"
        name="model"
        :rules="[
          {
            required: kind !== 'renderer',
            whitespace: true,
            message: '请输入服务商提供的模型名称',
          },
        ]"
        ><Input
          v-model:value="providerForm.model"
          :maxlength="100"
          placeholder="请按服务商文档填写" /></FormItem
      ><FormItem
        label="API Key"
        :help="keyHelp"
        ><InputPassword
          v-model:value="providerForm.apiKey"
          :disabled="busy || providerForm.clearKey"
          :maxlength="4096"
          autocomplete="new-password"
          placeholder="输入新的 API Key" /></FormItem
      ><FormItem v-if="provider?.hasKey"
        ><Checkbox v-model:checked="providerForm.clearKey" :disabled="busy || !!providerForm.apiKey"
          >清除已保存的密钥</Checkbox
        ></FormItem
      ><FormItem label="配置状态"
        ><Select
          v-model:value="providerForm.status"
          :options="[
            { label: '停用（默认）', value: 'disabled' },
            { label: '启用配置', value: 'active' },
          ]" /></FormItem
      ><Alert
        :message="warning"
        type="warning"
        show-icon /></Form
  ></Modal>
</template>
