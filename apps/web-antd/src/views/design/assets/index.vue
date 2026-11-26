<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Input,
  InputSearch,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import { requestClient } from '#/api/request';
import { useDesignList } from '../useDesignList';
interface Asset {
  id: string;
  name: string;
  kind: string;
  status: string;
  size: number;
  width: number;
  height: number;
  license: string;
  mime: string;
  createdAt: string;
  fontFamily?: string;
}
const { allowed, rows, total, page, keyword, busy, error, load, run, search, paginate, access } =
  useDesignList<Asset>('/assets?scope=public', 'asset:read');
const uploadOpen = ref(false),
  kind = ref('image'),
  license = ref(''),
  file = ref<File>(),
  detail = ref<Asset>(),
  references = ref<{ kind: string; id: string }[]>(),
  preview = ref('');
const columns = [
  { title: '素材名称', dataIndex: 'name', width: 230 },
  { title: '类型', key: 'kind', width: 100 },
  { title: '尺寸 / 大小', key: 'size', width: 170 },
  { title: '状态', key: 'status', width: 90 },
  { title: '授权说明', dataIndex: 'license', ellipsis: true },
  { title: '操作', key: 'actions', width: 260 },
];
function choose(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0];
}
async function upload() {
  if (!file.value || !license.value.trim()) {
    error.value = '请选择文件并填写授权说明';
    return;
  }
  if (file.value.size > 20 * 1024 * 1024) {
    error.value = '文件不超过20MB';
    return;
  }
  const body = new FormData();
  body.append('file', file.value);
  body.append('kind', kind.value);
  body.append('license', license.value.trim());
  if (await run(() => requestClient.post('/assets', body, {headers: {'Content-Type': 'multipart/form-data'}}))) {
    uploadOpen.value = false;
    file.value = undefined;
    license.value = '';
  }
}
async function show(id: string) {
  error.value = '';
  try {
    detail.value = await requestClient.get<Asset>('/assets/' + id);
    if (detail.value.kind === 'image') {
      const ticket = await requestClient.post<{ url: string }>('/assets/' + id + '/access-url');
      if (!ticket.url.startsWith('/api/v1/')) throw new Error('素材地址无效');
      const response = await fetch(ticket.url);
      if (!response.ok) throw new Error('图片加载失败');
      URL.revokeObjectURL(preview.value);
      preview.value = URL.createObjectURL(await response.blob());
    }
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function refs(id: string) {
  error.value = '';
  try {
    references.value = await requestClient.get('/assets/' + id + '/references');
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function change(row: Asset, action: string) {
  Modal.confirm({
    title:
      (action === 'delete' ? '删除' : action === 'active' ? '启用' : '停用') +
      '素材“' +
      row.name +
      '”？',
    content: '被模板、作品或历史引用的素材不能停用或删除。',
    onOk: () =>
      run(() =>
        action === 'delete'
          ? requestClient.delete('/assets/' + row.id)
          : requestClient.request('/assets/' + row.id + '/status', {
              method: 'PATCH',
              data: { status: action },
            }),
      ),
  });
}
watch(detail, (value) => {
  if (!value) {
    URL.revokeObjectURL(preview.value);
    preview.value = '';
  }
});
onBeforeUnmount(() => URL.revokeObjectURL(preview.value));
</script>
<template>
  <Page
    title="公共素材与字体"
    description="维护前台可用的公共图片与字体。所有上传都需注明授权来源。"
    ><Card
      ><template #extra
        ><Space
          ><Button :loading="busy" @click="load">刷新</Button
          ><Button
            v-if="access.accessCodes.includes('asset:write')"
            type="primary"
            :disabled="busy"
            @click="uploadOpen = true"
            >上传素材</Button
          ></Space
        ></template
      ><Alert v-if="!allowed" message="无素材查看权限" type="warning" /><Alert
        v-if="error"
        :message="error"
        type="error"
        show-icon
      /><InputSearch
        v-model:value="keyword"
        placeholder="搜索素材名称"
        style="max-width: 320px; margin-bottom: 16px"
        @search="search"
      /><Table
        v-if="allowed"
        :data-source="rows"
        :columns="columns"
        row-key="id"
        :loading="busy"
        :scroll="{ x: 1100 }"
        :pagination="{ current: page, total, pageSize: 20, onChange: paginate }"
        ><template #bodyCell="{ column, record }"
          ><Tag v-if="column.key === 'kind'">{{ record.kind === 'font' ? '字体' : '图片' }}</Tag
          ><span v-else-if="column.key === 'size'"
            >{{ record.kind === 'image' ? `${record.width}×${record.height} · ` : ''
            }}{{ (record.size / 1024).toFixed(0) }} KB</span
          ><Tag
            v-else-if="column.key === 'status'"
            :color="record.status === 'active' ? 'green' : 'default'"
            >{{ record.status === 'active' ? '启用' : '停用' }}</Tag
          ><Space v-else-if="column.key === 'actions'" wrap
            ><Button size="small" @click="show(record.id)">详情</Button
            ><Button size="small" @click="refs(record.id)">引用</Button
            ><template v-if="access.accessCodes.includes('asset:write')"
              ><Button
                size="small"
                :disabled="busy"
                @click="change(record as Asset, record.status === 'active' ? 'disabled' : 'active')"
                >{{ record.status === 'active' ? '停用' : '启用' }}</Button
              ><Button
                size="small"
                danger
                :disabled="busy"
                @click="change(record as Asset, 'delete')"
                >删除</Button
              ></template
            ></Space
          ></template
        ></Table
      ></Card
    ><Modal
      v-model:open="uploadOpen"
      title="上传公共素材"
      :confirm-loading="busy"
      :mask-closable="false"
      :closable="!busy"
      :cancel-button-props="{ disabled: busy }"
      @ok="upload"
      ><Alert v-if="error" :message="error" type="error" /><Space
        direction="vertical"
        style="width: 100%"
        ><label
          >类型<Select
            v-model:value="kind"
            :disabled="busy"
            style="width: 100%"
            :options="[
              { label: '图片 PNG/JPG/WebP', value: 'image' },
              { label: '字体 TTF/OTF', value: 'font' },
            ]"
            @change="file = undefined" /></label
        ><label
          >授权说明<Input.TextArea
            v-model:value="license"
            :disabled="busy"
            :maxlength="1000"
            placeholder="请注明公司原创或授权来源" /></label
        ><input
          :key="kind"
          :disabled="busy"
          type="file"
          :accept="kind === 'font' ? '.ttf,.otf' : 'image/png,image/jpeg,image/webp'"
          @change="choose"
        /><small>单个文件不超过20MB。字体由后端校验格式。</small></Space
      ></Modal
    ><Modal :open="!!detail" title="素材详情" :footer="null" @cancel="detail = undefined"
      ><template v-if="detail"
        ><img
          v-if="preview"
          :src="preview"
          :alt="detail.name"
          style="max-width: 100%; max-height: 300px; object-fit: contain"
        /><Descriptions :column="1" bordered
          ><DescriptionsItem label="素材ID">{{ detail.id }}</DescriptionsItem
          ><DescriptionsItem label="名称">{{ detail.name }}</DescriptionsItem
          ><DescriptionsItem label="格式">{{ detail.mime }}</DescriptionsItem
          ><DescriptionsItem label="授权">{{ detail.license }}</DescriptionsItem
          ><DescriptionsItem label="上传时间">{{
            detail.createdAt
          }}</DescriptionsItem></Descriptions
        ></template
      ></Modal
    ><Modal :open="!!references" title="素材引用" :footer="null" @cancel="references = undefined"
      ><Table
        :data-source="references"
        :columns="[
          { title: '引用类型', dataIndex: 'kind' },
          { title: '对象ID', dataIndex: 'id' },
        ]"
        :row-key="(r: any) => r.kind + ':' + r.id"
        :pagination="{ pageSize: 10 }" /></Modal
  ></Page>
</template>
