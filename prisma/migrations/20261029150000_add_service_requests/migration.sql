CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "tableSessionId" TEXT,
    "tableLabel" TEXT NOT NULL,
    "requests" TEXT[] NOT NULL,
    "custom" TEXT,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING',
    "handledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ServiceRequest_restaurantId_status_createdAt_idx"
ON "ServiceRequest"("restaurantId", "status", "createdAt");
CREATE INDEX "ServiceRequest_tableId_createdAt_idx"
ON "ServiceRequest"("tableId", "createdAt");
CREATE INDEX "ServiceRequest_tableSessionId_idx"
ON "ServiceRequest"("tableSessionId");

ALTER TABLE "ServiceRequest"
ADD CONSTRAINT "ServiceRequest_restaurantId_fkey"
FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest"
ADD CONSTRAINT "ServiceRequest_tableId_fkey"
FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ServiceRequest"
ADD CONSTRAINT "ServiceRequest_tableSessionId_fkey"
FOREIGN KEY ("tableSessionId") REFERENCES "TableSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
