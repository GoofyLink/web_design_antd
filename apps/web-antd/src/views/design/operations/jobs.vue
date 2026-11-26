<script setup lang="ts">
import { ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
import { useDesignList } from '../useDesignList';
interface Job {
  id: string;
  ownerId: string;
  kind: string;
  providerId: string;
  status: string;
  units: number;
  attempts: number;
  errorCode: string;
  completedItems: number;
  totalItems: number;
  createdAt: string;
  updatedAt: string;
}
const { allowed, rows, total, page, status, busy, error, load, run, search, paginate, access } =
  useDesignList<Job>('/jobs', 'job:read');
const detail = ref<Job>();
interface Attempt {
  attempt: number;
  status: string;
  errorCode: string;
  startedAt: string;
  finishedAt: string | null;
}
const attempts = ref<Attempt[]>([]);
const attemptColumns = [
  { title: '次数', dataIndex: 'attempt' },
  { title: '状态', key: 'status' },
  { title: '错误码', dataIndex: 'errorCode' },
  { title: '开始时间', dataIndex: 'startedAt' },
  { title: '结束时间', dataIndex: 'finishedAt' },
];
const inspecting = ref(false);
const labels: Record<string, string> = {
  queued: '排队中',
  running: '执行中',
  succeeded: '成功',
  failed: '失败',
  cancelled: '已取消',
};
const columns = [
  { title: '任务ID', dataIndex: 'id' },
  { title: '用户ID', dataIndex: 'ownerId' },
  { title: '类型', key: 'kind' },
  { title: '状态', key: 'status' },
  { title: '完成数量', key: 'progress' },
  { title: '错误码', dataIndex: 'errorCode' },
  { title: '创建时间', dataIndex: 'createdAt' },
  { title: '操作', key: 'actions', width: 210 },
];
async function inspect(id: string) {
  if (inspecting.value) return;
  inspecting.value = true;
  error.value = '';
  try {
    const [job, history] = await Promise.all([
      requestClient.get<Job>('/jobs/' + id),
      requestClient.get<Attempt[]>('/jobs/' + id + '/attempts'),
    ]);
    detail.value = job;
    attempts.value = history;
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    inspecting.value = false;
  }
}
function act(id: string, action: 'cancel' | 'retry') {
  const job = rows.value.find((item) => item.id === id);
  if (!job) return;
  if (!access.accessCodes.includes('job:write') || (action === 'retry' && job.kind === 'ai-image'))
    return;
  Modal.confirm({
    title: action === 'cancel' ? '取消此任务？' : '重新执行批量导出？',
    content:
      action === 'retry'
        ? '重试会重新预留用户额度，并使用已配置的渲染服务。'
        : '任务将停止，未消耗的预留额度会释放。',
    async onOk() {
      const ok = await run(() => requestClient.post('/jobs/' + job.id + '/' + action));
      if (!ok) throw new Error(error.value || '操作失败');
    },
  });
}
</script>
<template>
  <Page
    title="任务管理"
    description="查看任务状态与执行记录。AI 图片当前仅支持配置，不开放生成或重试。"
  >
    <Card>
      <template #extra
        ><Space
          ><Select
            v-model:value="status"
            style="width: 150px"
            :options="[
              { label: '全部状态', value: '' },
              ...Object.entries(labels).map(([value, label]) => ({ value, label })),
            ]"
            @change="search"
          /><Button :loading="busy" @click="load">刷新</Button></Space
        ></template
      >
      <Alert v-if="!allowed" message="当前账号无查看权限" type="warning" />
      <Alert v-if="error" :message="error" type="error" show-icon />
      <Table
        v-if="allowed"
        :columns="columns"
        :data-source="rows"
        row-key="id"
        :loading="busy"
        :scroll="{ x: 1200 }"
        :pagination="{ current: page, total, pageSize: 20, onChange: paginate }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'kind'">{{
            record.kind === 'ai-image' ? 'AI 图片' : '批量导出'
          }}</template>
          <Tag v-else-if="column.key === 'status'">{{
            labels[record.status] || record.status
          }}</Tag>
          <template v-else-if="column.key === 'progress'"
            >{{ record.completedItems }} / {{ record.totalItems }}</template
          >
          <Space v-else-if="column.key === 'actions'">
            <Button size="small" :disabled="inspecting" @click="inspect(record.id)">详情</Button>
            <Button
              v-if="
                access.accessCodes.includes('job:write') &&
                ['queued', 'running'].includes(record.status)
              "
              size="small"
              danger
              :disabled="busy"
              @click="act(record.id, 'cancel')"
              >取消</Button
            >
            <Button
              v-if="
                access.accessCodes.includes('job:write') &&
                record.status === 'failed' &&
                record.kind === 'batch-export'
              "
              size="small"
              :disabled="busy"
              @click="act(record.id, 'retry')"
              >重试</Button
            >
          </Space>
        </template>
      </Table>
    </Card>
    <Modal
      :open="!!detail"
      title="任务详情与执行记录"
      :footer="null"
      width="760px"
      @cancel="detail = undefined"
    >
      <Descriptions v-if="detail" bordered :column="2">
        <DescriptionsItem label="任务ID">{{ detail.id }}</DescriptionsItem><DescriptionsItem
          label="服务商ID"
          >{{ detail.providerId }}</DescriptionsItem
        >
        <DescriptionsItem label="状态">{{
          labels[detail.status] || detail.status
        }}</DescriptionsItem><DescriptionsItem label="执行次数">{{
          detail.attempts
        }}</DescriptionsItem>
        <DescriptionsItem label="任务单位">{{ detail.units }}</DescriptionsItem><DescriptionsItem
          label="更新时间"
          >{{ detail.updatedAt }}</DescriptionsItem
        >
        <DescriptionsItem label="错误码">{{ detail.errorCode || '无' }}</DescriptionsItem>
      </Descriptions>
      <p class="my-4">执行记录（不包含用户私有图片和提示词）</p>
      <Table
        :columns="attemptColumns"
        :data-source="attempts"
        row-key="attempt"
        size="small"
        :pagination="false"
        :scroll="{ x: 650 }"
        ><template #bodyCell="{ column, record }"
          ><template v-if="column.key === 'status'">{{
            labels[record.status] || record.status
          }}</template></template
        ></Table
      >
    </Modal>
  </Page>
</template>
