export interface Category {
  id: string;
  name: string;
  sort: number;
  status: string;
}
export interface TemplateContent {
  title: string;
  categoryId: string;
  tags: string[];
  width: number;
  height: number;
  cover: string;
  coverAssetId?: string;
  engine: string;
  engineVersion: string;
  schemaVersion: number;
  document: Record<string, any>;
}
export interface Template {
  id: string;
  status: string;
  version: number;
  draft: TemplateContent;
  published?: TemplateContent;
  updatedAt: string;
}
export interface Revision {
  id: string;
  version: number;
  createdAt: string;
  content?: TemplateContent;
}
