/*
  Warnings:

  - A unique constraint covering the columns `[isFluxAdmin]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isFluxAdmin" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "user_isFluxAdmin_key" ON "user"("isFluxAdmin");
