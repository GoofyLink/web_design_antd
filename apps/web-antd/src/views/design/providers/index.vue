<script setup lang="ts">
import { Page } from '@vben/common-ui';
import { Alert, Button, Card, Space, Table, Tag } from 'ant-design-vue';
import ProviderModal from './ProviderModal.vue';
import { useProviders } from './useProviders';
const props = withDefaults(defineProps<{ kind?: 'image' | 'renderer' }>(), { kind: 'image' });
const { canWrite, rows, loading, saving, error, open, editing, load, edit, save } = useProviders(
  props.kind,
);
const columns = [
  { title: '服务名称', dataIndex: 'name', key: 'name', width: 170 },
  { title: '模型', dataIndex: 'model', key: 'model', width: 170 },
  { title: '接口地址', dataIndex: 'endpoint', key: 'endpoint', ellipsis: true },
  { title: '密钥', key: 'key', width: 100 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'actions', width: 100 },
];
</script>
<template>
  <Page
    :title="kind === 'renderer' ? '批量导出服务配置' : 'AI 服务配置'"
    :description="
      kind === 'renderer'
        ? '配置服务端批量导出的渲染服务，保存配置不会测试连接。'
        : '公司管理员自行填写图片服务地址、模型与密钥。当前阶段只管理配置，不调用真实 AI 服务。'
    "
    ><Card :bordered="false"
      ><template #title>{{ kind === 'renderer' ? '渲染服务' : '图片服务' }}</template> ><template
        #extra
        ><Space
          ><Button :loading="loading" :disabled="!canWrite || saving" @click="load">刷新</Button
          ><Button v-if="canWrite" type="primary" :disabled="loading || saving" @click="edit()"
            >新增服务</Button
          ></Space
        ></template
      ><Alert
        type="info"
        show-icon
        :message="
          kind === 'renderer'
            ? '服务须兼容本系统画布渲染协议。只有执行批量导出任务时才会调用服务。'
            : '前台支持参考图片和描述草稿。即使配置启用，本期也不会提交生成任务，不会自动测试连接。'
        "
        style="margin-bottom: 16px"
      /><Alert
        v-if="!canWrite"
        type="warning"
        message="当前账号没有 provider:write 权限，请联系管理员。"
      /><Alert
        v-if="error && !open"
        type="error"
        :message="error"
        show-icon
        style="margin-bottom: 16px"
      /><Table
        v-if="canWrite"
        :columns="columns"
        :data-source="rows"
        row-key="id"
        :loading="loading"
        :scroll="{ x: 1000 }"
        :pagination="{ pageSize: 10 }"
        :locale="{ emptyText: '尚未配置服务，点击新增服务开始' }"
        ><template #bodyCell="{ column, record }"
          ><Tag v-if="column.key === 'key'" :color="record.hasKey ? 'green' : 'default'">{{
            record.hasKey ? '已配置' : '未配置'
          }}</Tag
          ><Tag
            v-else-if="column.key === 'status'"
            :color="record.status === 'active' ? 'blue' : 'default'"
            >{{ record.status === 'active' ? '已启用' : '已停用' }}</Tag
          ><Button
            v-else-if="column.key === 'actions'"
            type="link"
            @click="edit(rows.find((row) => row.id === record.id))"
            >编辑</Button
          ></template
        ></Table
      ></Card
    ><ProviderModal
      :kind="kind"
      :open="open"
      :provider="editing"
      :busy="saving"
      :error="error"
      @close="open = false"
      @save="save"
  /></Page>
</template>
