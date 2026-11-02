CREATE TABLE "public_brand_assets" (
  "id" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "sourceAssetId" UUID NOT NULL,
  "variant" VARCHAR(50) NOT NULL,
  "fileObjectId" UUID NOT NULL,
  "sha256" VARCHAR(64) NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "public_brand_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "public_brand_assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "public_brand_assets_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "brand_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "public_brand_assets_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "public_brand_assets_fileObjectId_key" ON "public_brand_assets"("fileObjectId");
CREATE UNIQUE INDEX "public_brand_assets_workspaceId_sourceAssetId_variant_key" ON "public_brand_assets"("workspaceId", "sourceAssetId", "variant");
