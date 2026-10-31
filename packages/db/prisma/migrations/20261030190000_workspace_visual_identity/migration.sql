-- Additive: no existing brand, document, file or business data is changed.
CREATE TABLE "workspace_visual_settings" (
  "workspaceId" UUID PRIMARY KEY REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "publishedVersion" INTEGER NOT NULL DEFAULT 0,
  "draft" JSONB NOT NULL,
  "published" JSONB,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "workspace_visual_versions" (
  "id" UUID PRIMARY KEY,
  "workspaceId" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "version" INTEGER NOT NULL,
  "config" JSONB NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "workspace_visual_versions_workspaceId_version_key" ON "workspace_visual_versions"("workspaceId", "version");
CREATE TABLE "brand_assets" (
  "id" UUID PRIMARY KEY,
  "workspaceId" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "fileObjectId" UUID NOT NULL,
  "parentAssetId" UUID,
  "title" VARCHAR(120) NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "brand_assets_fileObjectId_key" ON "brand_assets"("fileObjectId");
CREATE INDEX "brand_assets_workspaceId_createdAt_idx" ON "brand_assets"("workspaceId", "createdAt");
CREATE TABLE "authored_documents" (
  "id" UUID PRIMARY KEY,
  "workspaceId" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "kind" VARCHAR(20) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "clientId" UUID NOT NULL,
  "quoteId" UUID,
  "project" VARCHAR(180) NOT NULL,
  "sections" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  "frozenHtml" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "authored_documents_workspaceId_updatedAt_idx" ON "authored_documents"("workspaceId", "updatedAt");
