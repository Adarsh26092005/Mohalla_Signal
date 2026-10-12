-- AlterTable
ALTER TABLE "MerchantProfile" ADD COLUMN     "neighborhoodId" TEXT;

-- CreateTable
CREATE TABLE "Neighborhood" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissedDemand" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "neighborhoodId" TEXT NOT NULL,
    "rawQuery" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissedDemand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Neighborhood_slug_key" ON "Neighborhood"("slug");

-- CreateIndex
CREATE INDEX "Neighborhood_pincode_idx" ON "Neighborhood"("pincode");

-- CreateIndex
CREATE INDEX "Neighborhood_slug_idx" ON "Neighborhood"("slug");

-- CreateIndex
CREATE INDEX "MissedDemand_merchantId_idx" ON "MissedDemand"("merchantId");

-- CreateIndex
CREATE INDEX "MissedDemand_productId_idx" ON "MissedDemand"("productId");

-- CreateIndex
CREATE INDEX "MissedDemand_neighborhoodId_idx" ON "MissedDemand"("neighborhoodId");

-- CreateIndex
CREATE INDEX "MissedDemand_createdAt_idx" ON "MissedDemand"("createdAt");

-- CreateIndex
CREATE INDEX "MerchantProfile_neighborhoodId_idx" ON "MerchantProfile"("neighborhoodId");

-- AddForeignKey
ALTER TABLE "MerchantProfile" ADD CONSTRAINT "MerchantProfile_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "Neighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissedDemand" ADD CONSTRAINT "MissedDemand_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "MerchantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissedDemand" ADD CONSTRAINT "MissedDemand_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissedDemand" ADD CONSTRAINT "MissedDemand_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "Neighborhood"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
