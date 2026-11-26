<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue';
import { useAccessStore } from '@vben/stores';
import {
  Alert,
  Button,
  Descriptions,
  DescriptionsItem,
  Form,
  FormItem,
  InputNumber,
  Modal,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
import type { DesignUser } from './useDesignUsers';
const props = defineProps<{ user: DesignUser }>();
const emit = defineEmits<{ close: [] }>();
interface Quota {
  limitUnits: number;
  reservedUnits: number;
  consumedUnits: number;
  availableUnits: number;
}
const access = useAccessStore();
const canWrite = computed(() => access.accessCodes.includes('job:write'));
const quota = shallowRef<Quota>();
const limit = shallowRef<number>();
const loading = shallowRef(false),
  saving = shallowRef(false),
  error = shallowRef(''),
  notice = shallowRef('');
const minimum = computed(
  () => (quota.value?.reservedUnits || 0) + (quota.value?.consumedUnits || 0),
);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    quota.value = await requestClient.get<Quota>('/users/' + props.user.id + '/task-quota');
    limit.value = quota.value.limitUnits;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (!quota.value || !canWrite.value || saving.value || loading.value) return;
  error.value = '';
  notice.value = '';
  if (
    typeof limit.value !== 'number' ||
    !Number.isInteger(limit.value) ||
    limit.value < minimum.value ||
    limit.value > 1_000_000_000
  ) {
    error.value = `总额度须为 ${minimum.value} 至 1000000000 的整数`;
    return;
  }
  saving.value = true;
  try {
    await requestClient.put('/users/' + props.user.id + '/task-quota', { limitUnits: limit.value });
    await load();
    if (!error.value) notice.value = '内部任务额度已更新';
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Modal
    :open="true"
    :title="'任务额度 · ' + user.username"
    :footer="null"
    :mask-closable="false"
    :closable="!saving"
    @cancel="emit('close')"
  >
    <Alert
      message="累计内部任务额度，不涉及支付。总额度不能低于已消耗与预留之和。"
      type="info"
      show-icon
      class="mb-4"
    />
    <Alert v-if="error" :message="error" type="error" show-icon class="mb-4" />
    <Alert v-if="notice" :message="notice" type="success" show-icon class="mb-4" />
    <Descriptions v-if="quota" bordered :column="2" class="mb-4">
      <DescriptionsItem label="总额度">{{ quota.limitUnits }}</DescriptionsItem><DescriptionsItem
        label="可用"
        >{{ quota.availableUnits }}</DescriptionsItem
      >
      <DescriptionsItem label="已消耗">{{ quota.consumedUnits }}</DescriptionsItem><DescriptionsItem
        label="预留中"
        >{{ quota.reservedUnits }}</DescriptionsItem
      >
    </Descriptions>
    <Form v-if="quota && canWrite" layout="vertical">
      <FormItem label="累计任务总额度"
        ><InputNumber
          v-model:value="limit"
          aria-label="累计任务总额度"
          :min="minimum"
          :max="1000000000"
          :precision="0"
          :disabled="loading || saving"
          style="width: 100%"
      /></FormItem>
      <Button type="primary" :loading="saving" :disabled="loading" @click="save">保存额度</Button>
    </Form>
    <Button class="mt-4" :loading="loading" :disabled="saving" @click="load">刷新额度</Button>
  </Modal>
</template>
