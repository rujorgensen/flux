-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "magicLink" TEXT,
    "magicLinkExpiryAt" TIMESTAMP(3),
    "magicLinkRequestedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageHistory" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "usageKb" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAuthoritiesHistory" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectedAuthoritiesHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAgentsHistory" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectedAgentsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelsHistory" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_magicLink_key" ON "User"("magicLink");

-- CreateIndex
CREATE UNIQUE INDEX "UsageHistory_networkId_key" ON "UsageHistory"("networkId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAuthoritiesHistory_networkId_key" ON "ConnectedAuthoritiesHistory"("networkId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAgentsHistory_networkId_key" ON "ConnectedAgentsHistory"("networkId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelsHistory_networkId_key" ON "ChannelsHistory"("networkId");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
