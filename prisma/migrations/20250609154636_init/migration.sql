-- CreateEnum
CREATE TYPE "EAuthenticator" AS ENUM ('USERNAME_PASSWORD', 'MAGIC_LINK', 'GOOGLE', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "EUserNetworkRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "magicLink" TEXT,
    "magicLinkExpiryAt" TIMESTAMP(3),
    "magicLinkRequestedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "loginAuthenticator" TEXT NOT NULL,
    "authenticator" "EAuthenticator" NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Network" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "secretKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNetwork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "EUserNetworkRole" NOT NULL,
    "networkId" TEXT NOT NULL,

    CONSTRAINT "UserNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageHistory" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "usageKb" INTEGER NOT NULL,
    "timeslotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAuthoritiesHistory" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "timeslotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectedAuthoritiesHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectedAgentsHistory" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "timeslotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectedAgentsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelsHistory" (
    "id" TEXT NOT NULL,
    "networkId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "timeslotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_magicLink_key" ON "User"("magicLink");

-- CreateIndex
CREATE UNIQUE INDEX "Network_secretKey_key" ON "Network"("secretKey");

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

-- AddForeignKey
ALTER TABLE "UserNetwork" ADD CONSTRAINT "UserNetwork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNetwork" ADD CONSTRAINT "UserNetwork_networkId_fkey" FOREIGN KEY ("networkId") REFERENCES "Network"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
