/*
  Warnings:

  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Notification";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "BalanceChangeNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "address" TEXT NOT NULL,
    "oldBalance" BIGINT NOT NULL,
    "newBalance" BIGINT NOT NULL,
    "diff" BIGINT NOT NULL,
    "observedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "round" BIGINT NOT NULL,
    CONSTRAINT "BalanceChangeNotification_address_fkey" FOREIGN KEY ("address") REFERENCES "WatchedAccount" ("address") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BalanceChangeNotification_address_observedAt_idx" ON "BalanceChangeNotification"("address", "observedAt" DESC);
