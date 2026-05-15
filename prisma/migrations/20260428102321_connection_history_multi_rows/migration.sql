/*
  Warnings:

  - Made the column `isFluxAdmin` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "ChannelsHistory_networkId_key";

-- DropIndex
DROP INDEX "ConnectedAgentsHistory_networkId_key";

-- DropIndex
DROP INDEX "ConnectedAuthoritiesHistory_networkId_key";

-- DropIndex
DROP INDEX "UsageHistory_networkId_key";

-- DropIndex
DROP INDEX "user_isFluxAdmin_key";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "isFluxAdmin" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ChannelsHistory_networkId_timeslotAt_idx" ON "ChannelsHistory"("networkId", "timeslotAt");

-- CreateIndex
CREATE INDEX "ConnectedAgentsHistory_networkId_timeslotAt_idx" ON "ConnectedAgentsHistory"("networkId", "timeslotAt");

-- CreateIndex
CREATE INDEX "ConnectedAuthoritiesHistory_networkId_timeslotAt_idx" ON "ConnectedAuthoritiesHistory"("networkId", "timeslotAt");

-- CreateIndex
CREATE INDEX "UsageHistory_networkId_timeslotAt_idx" ON "UsageHistory"("networkId", "timeslotAt");
