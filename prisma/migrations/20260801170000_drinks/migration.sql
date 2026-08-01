-- CreateTable
CREATE TABLE "DrinkProduct" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellPrice" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2),
    "stockQty" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrinkProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrinkSale" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrinkSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrinkProduct_gymId_name_key" ON "DrinkProduct"("gymId", "name");

-- CreateIndex
CREATE INDEX "DrinkProduct_gymId_active_idx" ON "DrinkProduct"("gymId", "active");

-- CreateIndex
CREATE INDEX "DrinkSale_gymId_soldAt_idx" ON "DrinkSale"("gymId", "soldAt");

-- CreateIndex
CREATE INDEX "DrinkSale_productId_soldAt_idx" ON "DrinkSale"("productId", "soldAt");

-- CreateIndex
CREATE INDEX "DrinkSale_recordedById_idx" ON "DrinkSale"("recordedById");

-- AddForeignKey
ALTER TABLE "DrinkProduct" ADD CONSTRAINT "DrinkProduct_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrinkSale" ADD CONSTRAINT "DrinkSale_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrinkSale" ADD CONSTRAINT "DrinkSale_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DrinkProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrinkSale" ADD CONSTRAINT "DrinkSale_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
