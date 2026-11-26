<script setup lang="ts">
import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  message,
} from 'ant-design-vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useCanvasPresets } from './useCanvasPresets';
const { items, version, busy, error, dirty, canWrite, load, save, add, move, remove } =
  useCanvasPresets();
const columns = [
  { title: '名称', key: 'name', width: 220 },
  { title: '分类', key: 'category', width: 160 },
  { title: '宽 / px', key: 'width', width: 140 },
  { title: '高 / px', key: 'height', width: 140 },
  { title: '启用', key: 'enabled', width: 90 },
  { title: '排序 / 操作', key: 'actions', width: 230 },
];
async function submit() {
  if (await save()) message.success('推荐尺寸已保存，前台重新打开创建窗口即可读取');
}
function reload() {
  if (dirty.value) Modal.confirm({ title: '放弃未保存的修改并重新加载？', onOk: load });
  else void load();
}
function deleteItem(index: number) {
  Modal.confirm({
    title: '从推荐列表移除这个尺寸？',
    content: '不会影响已创建的作品，保存后生效。',
    onOk: () => remove(index),
  });
}
onBeforeRouteLeave(() => !dirty.value || window.confirm('尺寸配置尚未保存，确定离开？'));
</script>
<template>
  <Page title="画布推荐尺寸" description="维护前台“新增画布”中的推荐尺寸，按列表顺序展示。"
    ><Card :bordered="false" title="尺寸配置"
      ><template #extra
        ><Space
          ><Button :loading="busy" @click="reload">重新加载</Button
          ><Button v-if="canWrite" :disabled="busy || !version || items.length >= 100" @click="add"
            >新增尺寸</Button
          ><Button
            v-if="canWrite"
            type="primary"
            :loading="busy"
            :disabled="!version || !dirty"
            @click="submit"
            >保存配置</Button
          ></Space
        ></template
      ><Alert
        message="单位为像素（px）；单边 1–8192，总像素不超过 4000 万。停用后前台隐藏，已有作品不受影响。"
        type="info"
        show-icon
        class="presets-notice"
      /><Alert
        v-if="!busy && version && !canWrite"
        message="当前账号只有查看权限。请由管理员在角色与权限中授予“管理画布推荐尺寸”权限，再点击重新加载。"
        type="warning"
        show-icon
        class="presets-notice"
      /><Alert
        v-if="canWrite"
        :message="dirty ? '有未保存的修改，请点击右上角“保存配置”使其生效。' : '点击“新增尺寸”添加；直接修改表格中的名称、分类、宽高和启用状态，支持移除与上下排序，最后点击“保存配置”。'"
        :type="dirty ? 'warning' : 'info'"
        show-icon
        class="presets-notice"
      /><Alert v-if="error" :message="error" type="error" show-icon class="presets-notice" /><Table
        :columns="columns"
        :data-source="items"
        row-key="id"
        :loading="busy"
        :pagination="false"
        :scroll="{ x: 1080 }"
        ><template #bodyCell="{ column, record, index }"
          ><Input
            v-if="column.key === 'name'"
            v-model:value="record.name"
            :maxlength="40"
            :disabled="!canWrite || busy"
            aria-label="尺寸名称"
            @change="dirty = true"
          /><Input
            v-else-if="column.key === 'category'"
            v-model:value="record.category"
            :maxlength="20"
            :disabled="!canWrite || busy"
            aria-label="尺寸分类"
            @change="dirty = true"
          /><InputNumber
            v-else-if="column.key === 'width' || column.key === 'height'"
            v-model:value="record[column.key]"
            :min="1"
            :max="8192"
            :precision="0"
            :disabled="!canWrite || busy"
            :aria-label="column.key === 'width' ? '宽度' : '高度'"
            @change="dirty = true"
          /><Switch
            v-else-if="column.key === 'enabled'"
            v-model:checked="record.enabled"
            :disabled="!canWrite || busy"
            checked-children="开"
            un-checked-children="关"
            @change="dirty = true"
          /><Space v-else-if="column.key === 'actions' && canWrite"
            ><Button size="small" :disabled="busy || index === 0" @click="move(index, -1)"
              >上移</Button
            ><Button
              size="small"
              :disabled="busy || index === items.length - 1"
              @click="move(index, 1)"
              >下移</Button
            ><Button size="small" danger :disabled="busy" @click="deleteItem(index)"
              >移除</Button
            ></Space
          ></template
        ></Table
      ></Card
    ></Page
  >
</template>
<style scoped>
.presets-notice {
  margin-bottom: 16px;
}
</style>
