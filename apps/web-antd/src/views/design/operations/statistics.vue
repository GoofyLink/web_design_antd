<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';
import { Alert, Button, Card, Col, Row, Select, Space, Statistic, Table } from 'ant-design-vue';
import { requestClient } from '#/api/request';
interface Stats {
  users: number;
  designs: number;
  publishedTemplates: number;
  favorites: number;
  exports_succeeded: number;
  exports_failed: number;
  dailyExportsUTC: { date: string; succeeded: number; failed: number }[];
}
const access = useAccessStore(),
  allowed = computed(() => access.accessCodes.includes('operation:read'));
const days = ref(30),
  stats = ref<Stats>(),
  busy = ref(false),
  error = ref('');
const metrics = [
  { key: 'users' as const, label: '内部用户' },
  { key: 'designs' as const, label: '有效作品' },
  { key: 'publishedTemplates' as const, label: '已发布模板' },
  { key: 'favorites' as const, label: '模板收藏' },
  { key: 'exports_succeeded' as const, label: '区间导出成功' },
  { key: 'exports_failed' as const, label: '区间导出失败' },
];
async function load() {
  if (!allowed.value) return;
  busy.value = true;
  error.value = '';
  try {
    const to = new Date(),
      from = new Date(to.getTime() - days.value * 86400000);
    stats.value = await requestClient.get('/statistics', {
      params: { from: from.toISOString(), to: to.toISOString() },
    });
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Page title="设计运营概览" description="用户、作品和模板为当前全量；导出指标按所选时间区间统计。"
    ><Card
      ><template #extra
        ><Space
          ><Select
            v-model:value="days"
            style="width: 140px"
            :options="[
              { label: '最近7天', value: 7 },
              { label: '最近30天', value: 30 },
              { label: '最近90天', value: 90 },
              { label: '最近365天', value: 365 },
            ]"
            @change="load"
          /><Button :loading="busy" @click="load">刷新</Button></Space
        ></template
      ><Alert v-if="!allowed" message="当前账号无统计查看权限" type="warning" /><Alert
        v-if="error"
        :message="error"
        type="error"
        show-icon /><template v-if="stats"
        ><Row :gutter="[16, 16]"
          ><Col v-for="metric in metrics" :key="metric.key" :xs="24" :sm="12" :lg="8"
            ><Card><Statistic :title="metric.label" :value="stats[metric.key]" /></Card></Col
        ></Row>
        <h3 style="margin: 24px 0 12px">每日导出（UTC 日期）</h3>
        <Table
          :data-source="stats.dailyExportsUTC"
          :columns="[
            { title: '日期', dataIndex: 'date' },
            { title: '成功次数', dataIndex: 'succeeded' },
            { title: '失败次数', dataIndex: 'failed' },
          ]"
          row-key="date"
          :pagination="{ pageSize: 15 }" /><Alert
          message="导出数据来源为浏览器上报；未上报或网络中断的记录不包含在统计内。"
          type="info"
          show-icon /></template></Card
  ></Page>
</template>
