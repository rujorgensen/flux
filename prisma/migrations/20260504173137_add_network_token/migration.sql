/*
  Warnings:

  - You are about to drop the column `secretKey` on the `Network` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Network_secretKey_key";

-- AlterTable
ALTER TABLE "Network" DROP COLUMN "secretKey";

-- CreateTable
CREATE TABLE "NetworkToken" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    "rotatedOutAt" TIMESTAMP(3),

    CONSTRAINT "NetworkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkToken_token_key" ON "NetworkToken"("token");

-- CreateIndex
CREATE INDEX "NetworkToken_networkId_idx" ON "NetworkToken"("networkId");

-- AddForeignKey
ALTER TABLE "NetworkToken" ADD CONSTRAINT "NetworkToken_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NetworkToken" ADD CONSTRAINT "NetworkToken_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
