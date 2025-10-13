-- CreateTable
CREATE TABLE "WatchedAccount" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unwatchedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "AccountState" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "balanceMicro" BIGINT NOT NULL,
    "lastCheckedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRound" BIGINT NOT NULL,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "lastErrorAt" DATETIME,
    CONSTRAINT "AccountState_address_fkey" FOREIGN KEY ("address") REFERENCES "WatchedAccount" ("address") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "oldBalance" BIGINT NOT NULL,
    "newBalance" BIGINT NOT NULL,
    "diff" BIGINT NOT NULL,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "round" BIGINT NOT NULL,
    CONSTRAINT "Notification_address_fkey" FOREIGN KEY ("address") REFERENCES "WatchedAccount" ("address") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Notification_address_observedAt_idx" ON "Notification"("address", "observedAt" DESC);
