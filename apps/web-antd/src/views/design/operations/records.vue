<script setup lang="ts">
import { computed } from 'vue';
import { Page } from '@vben/common-ui';
import { Alert, Button, Card, Select, Space, Table, Tag } from 'ant-design-vue';
import { useDesignList } from '../useDesignList';
const { audit } = defineProps<{ audit: boolean }>();
const { allowed, rows, total, page, status, busy, error, load, search, paginate } = useDesignList<
  Record<string, unknown>
>(audit ? '/audit-logs' : '/export-events', audit ? 'audit:read' : 'operation:read');
const columns = computed(() =>
  audit
    ? [
        { title: '操作人ID', dataIndex: 'actorId' },
        { title: '操作', dataIndex: 'action' },
        { title: '目标', dataIndex: 'target', ellipsis: true },
        { title: '请求ID', dataIndex: 'requestId', ellipsis: true },
        { title: '时间', dataIndex: 'createdAt' },
      ]
    : [
        { title: '用户ID', dataIndex: 'ownerId' },
        { title: '作品ID', dataIndex: 'designId' },
        { title: '作品版本', dataIndex: 'version' },
        { title: '格式', dataIndex: 'format' },
        { title: '结果', key: 'status' },
        { title: '错误码', dataIndex: 'errorCode' },
        { title: '时间', dataIndex: 'createdAt' },
      ],
);
</script>
<template>
  <Page
    :title="audit ? '审计日志' : '导出记录'"
    :description="
      audit
        ? '查询账户、权限、素材与内容操作记录。'
        : '浏览器上报的图片导出结果，不能代表文件最终写入用户设备。'
    "
    ><Card
      ><template #extra
        ><Space
          ><Select
            v-if="!audit"
            v-model:value="status"
            style="width: 150px"
            :options="[
              { label: '全部结果', value: '' },
              { label: '成功', value: 'succeeded' },
              { label: '失败', value: 'failed' },
            ]"
            @change="search"
          /><Button :loading="busy" @click="load">刷新</Button></Space
        ></template
      ><Alert v-if="!allowed" message="当前账号无查看权限" type="warning" /><Alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
      /><Table
        v-if="allowed"
        :columns="columns"
        :data-source="rows"
        row-key="id"
        :loading="busy"
        :scroll="{ x: 1100 }"
        :pagination="{ current: page, total, pageSize: 20, onChange: paginate }"
        ><template #bodyCell="{ column, record }"
          ><Tag
            v-if="column.key === 'status'"
            :color="record.status === 'succeeded' ? 'green' : 'red'"
            >{{ record.status === 'succeeded' ? '成功' : '失败' }}</Tag
          ></template
        ></Table
      ></Card
    ></Page
  >
</template>
