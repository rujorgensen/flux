-- CreateEnum
CREATE TYPE "ESubscriptionType" AS ENUM ('FREE', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Network" ADD COLUMN     "subscriptionType" "ESubscriptionType" NOT NULL DEFAULT 'FREE';
