-- DropIndex
DROP INDEX "UsageHistory_networkId_key";

-- DropIndex
DROP INDEX "ConnectedAuthoritiesHistory_networkId_key";

-- DropIndex
DROP INDEX "ConnectedAgentsHistory_networkId_key";

-- DropIndex
DROP INDEX "ChannelsHistory_networkId_key";

-- CreateIndex
CREATE INDEX "UsageHistory_networkId_timeslotAt_idx" ON "UsageHistory"("networkId", "timeslotAt");

-- CreateIndex
CREATE INDEX "ConnectedAuthoritiesHistory_networkId_timeslotAt_idx" ON "ConnectedAuthoritiesHistory"("networkId", "timeslotAt");

-- CreateIndex
CREATE INDEX "ConnectedAgentsHistory_networkId_timeslotAt_idx" ON "ConnectedAgentsHistory"("networkId", "timeslotAt");

-- CreateIndex
CREATE INDEX "ChannelsHistory_networkId_timeslotAt_idx" ON "ChannelsHistory"("networkId", "timeslotAt");
