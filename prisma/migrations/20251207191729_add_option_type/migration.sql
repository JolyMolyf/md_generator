-- CreateEnum
CREATE TYPE "QuoteOptionType" AS ENUM ('Call', 'Put');

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionType" "QuoteOptionType" NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "userBid" DOUBLE PRECISION,
    "userAsk" DOUBLE PRECISION,
    "notes" TEXT,
    "overrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketInstrument" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "spotPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mktBid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mktAsk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "premium" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Quote_userId_idx" ON "Quote"("userId");

-- CreateIndex
CREATE INDEX "Quote_instrumentId_idx" ON "Quote"("instrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_userId_instrumentId_key" ON "Quote"("userId", "instrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketInstrument_symbol_key" ON "MarketInstrument"("symbol");

-- CreateIndex
CREATE INDEX "MarketInstrument_symbol_idx" ON "MarketInstrument"("symbol");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
