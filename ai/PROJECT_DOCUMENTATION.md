# Real-Time Market Data Streaming Service - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Database Schema](#database-schema)
5. [Module Structure](#module-structure)
6. [API Documentation](#api-documentation)
7. [WebSocket Events](#websocket-events)
8. [Implementation Plan](#implementation-plan)
9. [Setup Instructions](#setup-instructions)
10. [Development Guidelines](#development-guidelines)
11. [Worker Threads Implementation](#worker-threads-implementation)
12. [RabbitMQ Implementation](#rabbitmq-implementation)

---

## Project Overview

### Purpose
A real-time market data service that:
1. **Generates random live market data** for financial instruments
2. **Users have Quotes** that reference instruments (via `instrument_id`)
3. **Streams market data** via WebSocket to authorized users
4. **Users only receive updates** for instruments they have subscribed to (via quotes)
5. Uses **Worker Threads** for independent market data generation
6. Uses **RabbitMQ** for message queuing and distribution

### Key Features
- ✅ Market data simulator (random live updates every 500ms)
- ✅ Worker Thread-based simulation (runs in separate thread)
- ✅ RabbitMQ message queuing (decouples producers/consumers)
- ✅ WebSocket streaming (real-time updates)
- ✅ Quote-based filtering (users only see subscribed instruments)
- ✅ JWT authentication for WebSocket connections
- ✅ Multiple instruments support

### Current Status
- ✅ Authentication system (JWT + Passport) - **Complete**
- ✅ User management - **Complete**
- ✅ Database setup (PostgreSQL + Prisma) - **Complete**
- ✅ Quotes Module (CRUD operations) - **Complete** (90% - missing DB relation)
- ✅ Market Instrument Module (basic CRUD) - **Complete** (60%)
- ❌ Market Data Simulator (to be implemented)
- ❌ WebSocket Gateway with Auth (to be implemented)
- ❌ Worker Threads integration (to be implemented)
- ❌ RabbitMQ integration (to be implemented)

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Authorized Clients                      │
│  - WebSocket Connection (with JWT)                          │
│  - Receives: Market Data (filtered by quotes)              │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ WebSocket (Socket.IO)
                        │ (Authenticated)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              NestJS Backend                                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Auth Module (✅ Implemented)                 │  │
│  │  - JWT Authentication                               │  │
│  │  - WebSocket Authentication                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │      Market Data Module (❌ To Implement)           │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │   Market Simulator Worker                    │   │  │
│  │  │   - Runs in SEPARATE THREAD                  │   │  │
│  │  │   - Generates random market data             │   │  │
│  │  │   - Updates every 500ms                      │   │  │
│  │  └──────────────┬───────────────────────────────┘   │  │
│  │                 │                                    │  │
│  │                 │ postMessage()                      │  │
│  │                 ▼                                    │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │   Worker Manager Service                      │   │  │
│  │  │   - Receives updates from worker              │   │  │
│  │  │   - Publishes to RabbitMQ                     │   │  │
│  │  └──────────────┬───────────────────────────────┘   │  │
│  │                 │                                    │  │
│  │                 │ Publish                            │  │
│  │                 ▼                                    │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │   RabbitMQ Exchange                           │   │  │
│  │  │   - Routes messages to queue                 │   │  │
│  │  └──────────────┬───────────────────────────────┘   │  │
│  │                 │                                    │  │
│  │                 ▼                                    │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │   Market Data Queue                           │   │  │
│  │  └─────┬────────────────────────────────────────┘   │  │
│  │        │                                              │  │
│  │        ▼                                              │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │   Market Data Worker                         │   │  │
│  │  │   - Consumes market updates                  │   │  │
│  │  │   - Broadcasts via WebSocket Gateway        │   │  │
│  │  └─────┬────────────────────────────────────────┘   │  │
│  │        │                                              │  │
│  │        ▼                                              │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │   WebSocket Gateway (Authenticated)          │   │  │
│  │  │   - Validates JWT on connection              │   │  │
│  │  │   - Filters by user quotes                  │   │  │
│  │  │   - Streams to authorized users only         │   │  │
│  │  └──────────────┬───────────────────────────────┘   │  │
│  │                 │                                    │  │
│  │                 │ Broadcast (filtered by quotes)    │  │
│  │                 ▼                                    │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │      Authorized WebSocket Clients            │   │  │
│  │  │      (Only receive updates for subscribed    │   │  │
│  │  │       instruments via quotes)                │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Prisma ORM                                   │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │   (Docker)   │
                  └──────────────┘
```

### Data Flow

```
1. Worker Thread generates random market data for ALL instruments
   ↓
2. Worker sends updates via postMessage()
   ↓
3. Worker Manager receives updates
   ↓
4. Publishes to RabbitMQ Exchange
   ↓
5. RabbitMQ routes to Market Data Queue
   ↓
6. Market Data Worker consumes updates
   ↓
7. WebSocket Gateway:
   - Validates JWT (user authentication)
   - Gets user's quotes (which instruments user has subscribed to)
   - Filters updates: only sends updates for instruments in user's quotes
   ↓
8. Streams market data to authorized users
   (Only for instruments they have subscribed to via quotes)
```

### User-Quote-Instrument Relationship

```
┌─────────────────────────────────────────────────────────┐
│                    User (John)                          │
│  id: "user-123"                                         │
│  email: "john@example.com"                              │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ has many
                    ▼
        ┌───────────────────────┐
        │      Quotes           │
        │                       │
        │  Quote 1              │
        │  - id: "quote-1"      │
        │  - userId: "user-123" │
        │  - optionType: "Call" │
        │  - instrumentId: "AAPL-id" ←──┐
        │  - userBid: 150.00     │      │
        │  - userAsk: 155.00     │      │
        │  - overrides: {...}    │      │ references
        │                       │      │ (via instrumentId)
        │  Quote 2              │      │
        │  - id: "quote-2"      │      │
        │  - userId: "user-123" │      │
        │  - optionType: "Put"  │      │
        │  - instrumentId: "TSLA-id" ←─┤
        │                       │      │
        │  Quote 3              │      │
        │  - id: "quote-3"      │      │
        │  - userId: "user-123" │      │
        │  - optionType: "Call" │      │
        │  - instrumentId: "GOOGL-id" ←┘
        └───────────────────────┘      │
                                        │
                                        ▼
                        ┌───────────────────────────┐
                        │   Market Instruments      │
                        │                           │
                        │  AAPL                     │
                        │  - id: "AAPL-id"          │
                        │  - symbol: "AAPL"         │
                        │  - spotPrice: 152.50      │
                        │  - mktBid: 152.00         │
                        │  - mktAsk: 153.00         │
                        │  - delta: 0.65            │
                        │  - premium: 2.50          │
                        │                           │
                        │  TSLA                     │
                        │  - id: "TSLA-id"          │
                        │  - symbol: "TSLA"         │
                        │  - spotPrice: 200.00      │
                        │  - mktBid: 199.50         │
                        │  - mktAsk: 200.50         │
                        │  - delta: 0.45            │
                        │  - premium: 5.00          │
                        │                           │
                        │  GOOGL                    │
                        │  - id: "GOOGL-id"         │
                        │  - symbol: "GOOGL"        │
                        │  - spotPrice: 2500.00     │
                        │  - mktBid: 2499.00        │
                        │  - mktAsk: 2501.00        │
                        │  - delta: 0.75            │
                        │  - premium: 10.00         │
                        │                           │
                        │  MSFT                     │
                        │  - id: "MSFT-id"          │
                        │  - symbol: "MSFT"         │
                        │  - spotPrice: 350.00      │
                        │  - mktBid: 349.50         │
                        │  - mktAsk: 350.50         │
                        │  - delta: 0.55            │
                        │  - premium: 3.00          │
                        └───────────────────────────┘
```

**⚠️ Current Implementation Note:**
- Quotes reference instruments via `instrumentId` (string field)
- **Missing Prisma relation**: Cannot use `include: { instrument: true }` in queries
- Must manually join data using separate queries or application-level joins

### Market Data Update Flow with Quotes

```
Worker generates update for AAPL (instrumentId: "AAPL-id")
  ↓
Published to RabbitMQ
  ↓
Market Data Worker processes
  ↓
Gateway.broadcastMarketUpdate()
  ↓
Checks: Who has quotes with instrumentId = "AAPL-id"?
  ↓
Found: User John (has Quote 1 → AAPL-id)
  ↓
John is in room "instrument:AAPL-id"
  ↓
Update sent to John ✅

Worker generates update for MSFT (instrumentId: "MSFT-id")
  ↓
Published to RabbitMQ
  ↓
Market Data Worker processes
  ↓
Gateway.broadcastMarketUpdate()
  ↓
Checks: Who has quotes with instrumentId = "MSFT-id"?
  ↓
Found: No users (John doesn't have MSFT quote)
  ↓
Update NOT sent to John ❌
```

---

## Tech Stack

### Backend
- **Framework**: NestJS 11.x
- **Language**: TypeScript
- **Database**: PostgreSQL (via Docker)
- **ORM**: Prisma
- **Real-time**: Socket.IO
- **Authentication**: Passport JWT
- **Message Queue**: RabbitMQ
- **Multi-threading**: Node.js Worker Threads

### Frontend (Optional - for testing)
- **Framework**: React 18+
- **Build Tool**: Vite
- **Language**: TypeScript
- **WebSocket Client**: Socket.IO Client

### Development
- **Package Manager**: npm
- **Container**: Docker (for PostgreSQL, RabbitMQ)

---

## Database Schema

### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
  schemas      = ["public"]
}

datasource db {
  provider = "postgresql"
  schemas  = ["public"]
}

// Quote Option Type Enum
enum QuoteOptionType {
  Call
  Put

  @@schema("public")
  @@map("QuoteOptionType")
}

// User Model (✅ Already exists)
model User {
  id       String   @id @default(uuid())
  email    String   @unique
  password String
  name     String?
  posts    Post[]
  quotes   Quote[]  // User has many quotes

  @@map("User")
  @@schema("public")
}

// Quote Model - Links User to Instruments
model Quote {
  id           String          @id @default(uuid())
  userId       String
  user         User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  optionType   QuoteOptionType // Call or Put option type
  instrumentId String
  userBid      Float?          // User's bid price
  userAsk      Float?          // User's ask price
  notes        String?         // User notes
  overrides    Json?           // JSON field for custom overrides
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@unique([userId, instrumentId]) // One quote per user per instrument
  @@index([userId])
  @@index([instrumentId])
  @@map("Quote")
  @@schema("public")
  
  // ⚠️ NOTE: Missing relation to MarketInstrument
  // Should have: instrument MarketInstrument @relation(...)
}

// Market Instrument Model
model MarketInstrument {
  id         String   @id @default(uuid())
  symbol     String   @unique // e.g., "AAPL", "TSLA"
  name       String?

  // Market Data Fields
  spotPrice  Float    @default(0)  // Current spot price
  mktBid     Float    @default(0)  // Market bid price
  mktAsk     Float    @default(0)  // Market ask price
  delta      Float    @default(0)  // Option delta
  premium    Float    @default(0)  // Option premium

  lastUpdate DateTime @default(now())
  
  // ⚠️ NOTE: Missing relation to Quote
  // Should have: quotes Quote[]
  
  @@index([symbol])
  @@map("MarketInstrument")
  @@schema("public")
}

// Post Model (Legacy - from initial setup)
model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean? @default(false)
  authorId  String?
  author    User?    @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@map("Post")
  @@schema("public")
}
```

### Schema Notes

**Current Implementation:**
- ✅ `Quote` model has `optionType` (Call/Put) - **Implemented**
- ✅ `Quote` model has `overrides` JSON field - **Implemented**
- ✅ `MarketInstrument` has detailed market data fields (`spotPrice`, `mktBid`, `mktAsk`, `delta`, `premium`) - **Implemented**

**⚠️ Missing Relations (Critical):**
- ❌ `Quote` model does NOT have `instrument` relation to `MarketInstrument`
- ❌ `MarketInstrument` model does NOT have `quotes` relation to `Quote[]`

**Impact:**
- Cannot use Prisma `include` to load instrument data with quotes (e.g., `quote.include.instrument`)
- Must manually join data or use separate queries
- WebSocket gateway will need to work around this limitation

**Recommended Fix:**
```prisma
// In Quote model, add:
instrument MarketInstrument @relation(fields: [instrumentId], references: [id], onDelete: Cascade)

// In MarketInstrument model, add:
quotes Quote[]
```

---

## Module Structure

### Current Structure
```
src/
├── auth/                    ✅ Implemented
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── dtos/
│       └── LoginDto.ts
├── clients/                 ✅ Implemented
│   ├── clients.module.ts
│   ├── clients.controller.ts
│   └── clients.service.ts
├── app.module.ts
├── prisma.service.ts
└── main.ts
```

### Target Structure
```
src/
├── auth/                    ✅ Implemented
├── clients/                 ✅ Implemented
├── market-data/             ❌ To Implement
│   ├── market-data.module.ts
│   ├── market-data.controller.ts
│   ├── market-data.service.ts
│   ├── market-data.gateway.ts (WebSocket with Auth)
│   ├── quotes/                      (New)
│   │   ├── quotes.controller.ts
│   │   ├── quotes.service.ts
│   │   └── dtos/
│   │       └── quote.dto.ts
│   ├── simulation/
│   │   ├── market-simulator-worker.service.ts
│   │   └── market-simulator.worker.ts (Worker Thread)
│   ├── workers/
│   │   └── market-data.worker.ts
│   ├── rabbitmq/
│   │   └── rabbitmq.service.ts
│   └── dtos/
│       ├── market-data.dto.ts
│       └── instrument.dto.ts
├── app.module.ts
├── prisma.service.ts
└── main.ts
```

---

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
Login and receive JWT token in HTTP-only cookie.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "email": "user@example.com",
  "username": "John Doe"
}
```

**Cookies:** `access_token` (HTTP-only)

---

#### GET `/api/auth/profile`
Get current user profile (protected).

**Headers:** Cookie with `access_token`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe"
}
```

---

### Market Data Endpoints

#### GET `/api/market-data/instruments`
Get all market instruments.

**Response:**
```json
[
  {
    "id": "uuid",
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "spotPrice": 152.50,
    "mktBid": 152.00,
    "mktAsk": 153.00,
    "delta": 0.65,
    "premium": 2.50,
    "lastUpdate": "2024-12-06T21:00:00.000Z"
  }
]
```

---

#### POST `/api/market-data/instruments`
Create new market instrument.

**Request:**
```json
{
  "symbol": "TSLA",
  "name": "Tesla Inc.",
  "spotPrice": 200.00,
  "mktBid": 199.50,
  "mktAsk": 200.50,
  "delta": 0.45,
  "premium": 5.00
}
```

**Response:**
```json
{
  "id": "uuid",
  "symbol": "TSLA",
  "name": "Tesla Inc.",
  "spotPrice": 200.00,
  "mktBid": 199.50,
  "mktAsk": 200.50,
  "delta": 0.45,
  "premium": 5.00,
  "lastUpdate": "2024-12-06T21:00:00.000Z"
}
```

---

### Quote Endpoints

#### GET `/api/quotes`
Get all quotes for current user (protected).

**Headers:** Cookie with `access_token`

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "optionType": "Call",
    "instrumentId": "instrument-uuid",
    "userBid": 150.00,
    "userAsk": 155.00,
    "notes": "Watching for breakout",
    "overrides": null,
    "createdAt": "2024-12-06T21:00:00.000Z",
    "updatedAt": "2024-12-06T21:00:00.000Z",
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
]
```

**Note:** Currently, `instrument` data is not included in the response due to missing Prisma relation. Must be fetched separately.

---

#### POST `/api/quotes`
Create new quote (add instrument to user's watchlist).

**Headers:** Cookie with `access_token`

**Request:**
```json
{
  "instrumentId": "instrument-uuid",
  "optionType": "Call",
  "userBid": 150.00,
  "userAsk": 155.00,
  "notes": "My first quote"
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "optionType": "Call",
  "instrumentId": "instrument-uuid",
  "userBid": 150.00,
  "userAsk": 155.00,
  "notes": "My first quote",
  "overrides": null,
  "createdAt": "2024-12-06T21:00:00.000Z",
  "updatedAt": "2024-12-06T21:00:00.000Z",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Note:** `optionType` is required and must be either "Call" or "Put".

---

#### PUT `/api/quotes/:id`
Update quote (userBid, userAsk, notes).

**Headers:** Cookie with `access_token`

**Request:**
```json
{
  "userBid": 151.00,
  "userAsk": 156.00,
  "notes": "Updated notes"
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "optionType": "Call",
  "instrumentId": "instrument-uuid",
  "userBid": 151.00,
  "userAsk": 156.00,
  "notes": "Updated notes",
  "overrides": null,
  "createdAt": "2024-12-06T21:00:00.000Z",
  "updatedAt": "2024-12-06T21:05:00.000Z",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

#### PUT `/api/quotes/override/:id`
Update quote overrides (JSON field for custom data).

**Headers:** Cookie with `access_token`

**Request:**
```json
{
  "overrides": {
    "customField1": "value1",
    "customField2": 123,
    "nested": {
      "data": "value"
    }
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "optionType": "Call",
  "instrumentId": "instrument-uuid",
  "userBid": 151.00,
  "userAsk": 156.00,
  "notes": "Updated notes",
  "overrides": {
    "customField1": "value1",
    "customField2": 123,
    "nested": {
      "data": "value"
    }
  },
  "createdAt": "2024-12-06T21:00:00.000Z",
  "updatedAt": "2024-12-06T21:05:00.000Z",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

#### DELETE `/api/quotes/:id`
Delete quote (remove instrument from watchlist).

**Headers:** Cookie with `access_token`

**Response:**
```json
{
  "message": "Quote deleted successfully"
}
```

---

## WebSocket Events

### Connection (Authenticated)

**Namespace:** `/market-data`

**Connection with JWT:**
```typescript
const socket = io('http://localhost:3000/market-data', {
  auth: {
    token: 'your-jwt-token' // From login cookie or localStorage
  }
});
```

**Authentication Flow:**
1. Client connects with JWT token
2. Server validates token
3. If valid → connection established
4. If invalid → connection rejected

---

### Server → Client Events

#### `market-update`
Real-time market data update.

**Payload:**
```json
{
  "instrumentId": "uuid",
  "symbol": "AAPL",
  "price": 152.50,
  "change": 1.25,
  "changePercent": 0.82,
  "volume": 1500000,
  "timestamp": "2024-12-06T21:00:00.000Z"
}
```

---

#### `connection-status`
Connection status update.

**Payload:**
```json
{
  "status": "connected",
  "message": "Successfully connected to market data stream"
}
```

---

### Client → Server Events

#### `get-my-quotes`
Get user's quotes (instruments user is watching).

**Response:**
```json
{
  "quotes": [
    {
      "id": "uuid",
      "instrumentId": "instrument-uuid",
      "instrument": {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "currentPrice": 152.50
      },
      "userBid": 150.00,
      "userAsk": 155.00
    }
  ]
}
```

**Note:** User automatically receives updates for all instruments in their quotes. No need to manually subscribe.

---

## Implementation Plan

### Phase 1: Database & Core Setup (Week 1)
- [ ] Update Prisma schema with `Quote` and `MarketInstrument` models
- [ ] Run migration
- [ ] Install WebSocket and RabbitMQ dependencies
- [ ] Create `market-data` module structure
- [ ] Create `quotes` submodule (CRUD for user quotes)

### Phase 2: Worker Threads Implementation (Week 1-2)
- [ ] Create `market-simulator.worker.ts` (Worker Thread)
- [ ] Implement random market data generation
- [ ] Create `market-simulator-worker.service.ts` (Worker Manager)
- [ ] Test worker communication

### Phase 3: RabbitMQ Integration (Week 2)
- [ ] Install and setup RabbitMQ (Docker)
- [ ] Create `RabbitMQService`
- [ ] Integrate worker with RabbitMQ
- [ ] Create market-data queue
- [ ] Test message flow

### Phase 4: Quotes Module (Week 2-3)

#### Step 4.1: Update Prisma Schema
- [ ] Add `Quote` model to `schema.prisma`
- [ ] Add relations: `User.quotes`, `Quote.user`, `Quote.instrument`, `MarketInstrument.quotes`
- [ ] Add unique constraint: `@@unique([userId, instrumentId])`
- [ ] Add indexes: `@@index([userId])`, `@@index([instrumentId])`
- [ ] Run migration: `npx prisma migrate dev --name add_quote_model`

#### Step 4.2: Create DTOs
- [ ] Create `src/market-data/quotes/dtos/quote.dto.ts`
- [ ] Implement `CreateQuoteDto` with validation:
  - `@IsUUID()` for `instrumentId`
  - `@IsNumber()` `@IsOptional()` for `userBid`, `userAsk`
  - `@IsString()` `@IsOptional()` for `notes`
- [ ] Implement `UpdateQuoteDto` (same fields as Create, all optional)
- [ ] Implement `QuoteDto` (response DTO with instrument relation)

#### Step 4.3: Create Quotes Service
- [ ] Create `src/market-data/quotes/quotes.service.ts`
- [ ] Inject `PrismaService` and `MarketDataGateway`
- [ ] Implement `getUserQuotes(userId: string)`: Get all quotes for user with instrument data
- [ ] Implement `createQuote(userId: string, dto: CreateQuoteDto)`:
  - Validate instrument exists
  - Check for duplicate quote (same user + instrument)
  - Create quote in database
  - Return quote with instrument data
- [ ] Implement `updateQuote(userId: string, quoteId: string, dto: UpdateQuoteDto)`:
  - Verify quote exists and belongs to user
  - Update quote fields
  - Return updated quote
- [ ] Implement `deleteQuote(userId: string, quoteId: string)`:
  - Verify quote exists and belongs to user
  - Delete quote
- [ ] Implement `getQuoteById(userId: string, quoteId: string)`: Get single quote with validation
- [ ] Add private `mapToDto()` helper method

#### Step 4.4: Create Quotes Controller
- [ ] Create `src/market-data/quotes/quotes.controller.ts`
- [ ] Add `@Controller('api/quotes')` decorator
- [ ] Add `@UseGuards(JwtAuthGuard)` to protect all routes
- [ ] Implement `GET /api/quotes`: Get all user's quotes
- [ ] Implement `GET /api/quotes/:id`: Get single quote
- [ ] Implement `POST /api/quotes`: Create new quote
- [ ] Implement `PUT /api/quotes/:id`: Update quote
- [ ] Implement `DELETE /api/quotes/:id`: Delete quote
- [ ] Use `@Request() req` to get `req.user.id` from JWT

#### Step 4.5: Update Market Data Module
- [ ] Add `QuotesController` and `QuotesService` to `MarketDataModule` providers/controllers
- [ ] Ensure `MarketDataGateway` is available for QuotesService injection
- [ ] Export `QuotesService` if needed by other modules

#### Step 4.6: Testing Quotes Module
- [ ] Test creating quote with valid instrument
- [ ] Test creating duplicate quote (should fail)
- [ ] Test creating quote with invalid instrument (should fail)
- [ ] Test updating quote (own quote vs other user's quote)
- [ ] Test deleting quote
- [ ] Test getting all quotes (only own quotes returned)
- [ ] Test authorization (cannot access other user's quotes)

#### Step 4.7: Integration with WebSocket Gateway
- [ ] Update `MarketDataGateway.handleConnection()`:
  - Load user's quotes with `include: { quotes: { include: { instrument: true } } }`
  - Extract `instrumentId`s from quotes
  - Join Socket.IO rooms: `client.join('instrument:${instrumentId}')` for each quote
  - Store subscriptions in `userSubscriptions` Map
  - Emit `my-quotes` event with user's quotes on connection
- [ ] Update `broadcastMarketUpdate()` to use `instrumentId` instead of `symbol`
- [ ] Add `updateUserSubscriptions()` method to handle quote changes
- [ ] Add WebSocket event handlers for `quote-created` and `quote-deleted` (optional, for real-time updates)

#### Step 4.8: Update Market Data Simulator
- [ ] Ensure market updates include `instrumentId` field (not just `symbol`)
- [ ] Update worker to send `instrumentId` in market data updates
- [ ] Verify RabbitMQ messages include `instrumentId`

#### Step 4.9: Documentation & Examples
- [ ] Document all API endpoints in Swagger/OpenAPI (if using)
- [ ] Create example requests/responses
- [ ] Document WebSocket behavior with quotes
- [ ] Add example user journey (create quote → connect → receive updates)

### Phase 5: WebSocket Gateway with Auth (Week 3)

**Note:** Some steps overlap with Phase 4.7 (Integration with WebSocket Gateway)

#### Step 5.1: Gateway Setup
- [ ] Create `src/market-data/market-data.gateway.ts`
- [ ] Install `@nestjs/websockets` and `socket.io` packages
- [ ] Set up `@WebSocketGateway()` decorator with namespace `/market-data`
- [ ] Inject `JwtService`, `PrismaService`, `Logger`

#### Step 5.2: JWT Authentication
- [ ] Implement `handleConnection(client: Socket)`:
  - Extract JWT token from `client.handshake.auth.token` or query/headers
  - Verify token using `JwtService.verify()`
  - Load user from database with quotes: `include: { quotes: { include: { instrument: true } } }`
  - Attach user to socket: `(client as any).user = user`
  - Store `userId` on socket
- [ ] Handle authentication errors (disconnect client, emit error)
- [ ] Emit `connection-status` event on success

#### Step 5.3: Quote-Based Subscription
- [ ] On connection, extract `instrumentId`s from user's quotes
- [ ] Join Socket.IO rooms: `client.join('instrument:${instrumentId}')` for each quote
- [ ] Store subscriptions in `Map<userId, Set<instrumentId>>`
- [ ] Emit `my-quotes` event with user's quotes on connection

#### Step 5.4: Filtered Broadcasting
- [ ] Implement `broadcastMarketUpdate(update)`:
  - Use `update.instrumentId` (not `symbol`)
  - Broadcast to room: `this.server.to('instrument:${update.instrumentId}').emit('market-update', update)`
  - Only users with quotes for that instrument are in the room

#### Step 5.5: Dynamic Subscription Updates
- [ ] Implement `updateUserSubscriptions(userId, client)`:
  - Fetch user's current quotes from database
  - Update `userSubscriptions` Map
  - Rejoin rooms for all current quotes
- [ ] Add WebSocket event handlers (optional):
  - `@SubscribeMessage('quote-created')` → call `updateUserSubscriptions()`
  - `@SubscribeMessage('quote-deleted')` → call `updateUserSubscriptions()`

#### Step 5.6: Testing WebSocket Gateway
- [ ] Test connection without token (should reject)
- [ ] Test connection with invalid token (should reject)
- [ ] Test connection with valid token (should connect)
- [ ] Test user with quotes receives updates for those instruments
- [ ] Test user without quotes doesn't receive any updates
- [ ] Test adding quote → user receives updates for new instrument
- [ ] Test removing quote → user stops receiving updates for that instrument
- [ ] Test multiple users with different quotes (isolation)


### Phase 7: Testing & Polish (Week 4)
- [ ] End-to-end testing
- [ ] Test quote-based filtering
- [ ] Error handling
- [ ] Reconnection logic
- [ ] Performance optimization

---

## Quick Implementation Checklist

### Quotes Module Implementation Checklist

**Database:**
- [ ] Quote model in Prisma schema
- [ ] Relations configured (User ↔ Quote ↔ Instrument)
- [ ] Unique constraint on `[userId, instrumentId]`
- [ ] Indexes added
- [ ] Migration run successfully

**Backend:**
- [ ] `CreateQuoteDto` with validation
- [ ] `UpdateQuoteDto` with validation
- [ ] `QuoteDto` for responses
- [ ] `QuotesService` with all CRUD methods
- [ ] `QuotesController` with all endpoints
- [ ] JWT authentication on all routes
- [ ] Authorization checks (users can only access own quotes)

**WebSocket Integration:**
- [ ] Gateway loads quotes on connection
- [ ] Auto-subscription to instrument rooms
- [ ] Filtered broadcasting by `instrumentId`
- [ ] Dynamic subscription updates (optional)

**Testing:**
- [ ] Create quote (valid/invalid cases)
- [ ] Update quote (own/other user's)
- [ ] Delete quote
- [ ] Get quotes (only own)
- [ ] WebSocket filtering (receives only quoted instruments)
- [ ] Multiple users isolation

**Files to Create:**
```
src/market-data/
├── quotes/
│   ├── quotes.controller.ts
│   ├── quotes.service.ts
│   └── dtos/
│       └── quote.dto.ts
```

**Files to Modify:**
```
prisma/schema.prisma          (add Quote model)
src/market-data/
├── market-data.module.ts     (add QuotesController, QuotesService)
└── market-data.gateway.ts    (add quote loading & filtering)
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm

### Backend Setup

1. **Install dependencies:**
```bash
cd md_generator
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
npm install amqplib
```

2. **Update Prisma schema:**
```bash
# Edit prisma/schema.prisma (add MarketInstrument model)
npx prisma migrate dev --name add_market_instruments
npx prisma generate
```

3. **Start PostgreSQL:**
```bash
docker-compose up -d postgres
```

4. **Start RabbitMQ:**
```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3-management
```

5. **Environment variables (`.env`):**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/market_data?schema=public"
JWT_SECRET="your-secret-key-here"
RABBITMQ_URL="amqp://admin:admin@localhost:5672"
NODE_ENV="development"
PORT=3000
```

6. **Start backend:**
```bash
npm run start:dev
```

---

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow NestJS conventions
- Use DTOs for all API inputs/outputs
- Implement proper error handling

### Performance
- Use Worker Threads for CPU-intensive work
- Use RabbitMQ for message queuing
- Batch database operations
- Implement connection pooling

### Security
- Validate all inputs with class-validator
- Use HTTP-only cookies for JWT
- Authenticate WebSocket connections
- Sanitize user inputs

---

## Worker Threads Implementation

### Overview

The market data simulator runs in a **separate Worker Thread** to ensure:
- Main thread stays responsive for HTTP/WebSocket requests
- CPU-intensive calculations don't block the event loop
- True parallel processing

### Architecture

```
Main Thread                          Worker Thread
     │                                    │
     │  new Worker()                      │
     ├───────────────────────────────────>│
     │                                    │
     │  postMessage({start})              │
     ├───────────────────────────────────>│
     │                                    │
     │                                    │  setInterval(500ms)
     │                                    │  - Generate random prices
     │                                    │  - Calculate changes
     │                                    │
     │                                    │  postMessage({updates})
     │<───────────────────────────────────┤
     │                                    │
     │  Publish to RabbitMQ             │
```

### Step 1: Create Worker File

**File:** `src/market-data/simulation/market-simulator.worker.ts`

```typescript
import { parentPort, workerData } from 'worker_threads';

interface Instrument {
  id: string;
  symbol: string;
  currentPrice: number;
}

interface MarketUpdate {
  instrumentId: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// Current prices (in-memory state)
const spotPrices = new Map<string, number>();
const VOLATILITY = 0.02; // 2% volatility

/**
 * Initialize spot prices
 */
function initializePrices(instruments: Instrument[]) {
  instruments.forEach((inst) => {
    spotPrices.set(inst.symbol, inst.currentPrice || 100);
  });
}

/**
 * Generate next price using random walk
 */
function nextPrice(symbol: string): number {
  const current = spotPrices.get(symbol) || 100;
  const change = (Math.random() - 0.5) * 2 * VOLATILITY * current;
  const newPrice = Math.max(0.01, current + change);
  spotPrices.set(symbol, newPrice);
  return Number(newPrice.toFixed(2));
}

  /**
   * Generate market update for instrument
   */
  function generateUpdate(instrument: Instrument): MarketUpdate {
    const oldPrice = spotPrices.get(instrument.symbol) || instrument.currentPrice;
    const newPrice = nextPrice(instrument.symbol);
    const change = newPrice - oldPrice;
    const changePercent = (change / oldPrice) * 100;
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    return {
      instrumentId: instrument.id, // Important: include instrumentId for filtering
      symbol: instrument.symbol,
      price: newPrice,
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume,
      timestamp: new Date().toISOString(),
    };
  }

/**
 * Main simulation loop
 */
function startSimulation(instruments: Instrument[], interval: number) {
  initializePrices(instruments);

  setInterval(() => {
    const updates = instruments.map((inst) => generateUpdate(inst));

    if (parentPort) {
      parentPort.postMessage({
        type: 'market-updates',
        updates,
        timestamp: new Date().toISOString(),
      });
    }
  }, interval);
}

// Handle messages from main thread
if (parentPort) {
  parentPort.on('message', (message) => {
    if (message.type === 'start') {
      startSimulation(message.instruments, message.interval || 500);
    } else if (message.type === 'update-instruments') {
      initializePrices(message.instruments);
    }
  });

  parentPort.postMessage({ type: 'ready' });
}
```

### Step 2: Create Worker Manager Service

**File:** `src/market-data/simulation/market-simulator-worker.service.ts`

```typescript
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker } from 'worker_threads';
import { join } from 'path';
import { PrismaService } from 'src/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class MarketSimulatorWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MarketSimulatorWorkerService.name);
  private worker: Worker | null = null;
  private readonly UPDATE_INTERVAL_MS = 500;

  constructor(
    private prisma: PrismaService,
    private rabbitMQ: RabbitMQService,
  ) {}

  async onModuleInit() {
    const instruments = await this.loadInstruments();
    this.startWorker(instruments);
  }

  async onModuleDestroy() {
    await this.stopWorker();
  }

  private async loadInstruments() {
    return this.prisma.marketInstrument.findMany({
      select: {
        id: true,
        symbol: true,
        currentPrice: true,
      },
    });
  }

  private startWorker(instruments: any[]) {
    try {
      const workerPath = join(__dirname, 'market-simulator.worker.js');

      this.worker = new Worker(workerPath);

      this.worker.on('message', (message) => {
        if (message.type === 'market-updates') {
          // Publish to RabbitMQ
          this.rabbitMQ
            .publishMarketUpdates(message.updates)
            .catch((error) => {
              this.logger.error(`Error publishing: ${error.message}`);
            });
        } else if (message.type === 'ready') {
          // Start simulation
          this.worker?.postMessage({
            type: 'start',
            instruments,
            interval: this.UPDATE_INTERVAL_MS,
          });
          this.logger.log('Market simulator worker started');
        }
      });

      this.worker.on('error', (error) => {
        this.logger.error(`Worker error: ${error.message}`);
        this.restartWorker();
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.warn(`Worker exited with code ${code}`);
          this.restartWorker();
        }
      });
    } catch (error) {
      this.logger.error(`Failed to start worker: ${error.message}`);
    }
  }

  private async restartWorker() {
    await this.stopWorker();
    setTimeout(async () => {
      const instruments = await this.loadInstruments();
      this.startWorker(instruments);
    }, 1000);
  }

  private async stopWorker() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  async updateInstruments() {
    const instruments = await this.loadInstruments();
    this.worker?.postMessage({
      type: 'update-instruments',
      instruments,
    });
  }
}
```

---

## RabbitMQ Implementation

### Step 1: Install RabbitMQ

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  -e RABBITMQ_DEFAULT_USER=admin \
  -e RABBITMQ_DEFAULT_PASS=admin \
  rabbitmq:3-management
```

### Step 2: Install npm Package

```bash
npm install amqplib
```

### Step 3: Create RabbitMQ Service

**File:** `src/market-data/rabbitmq/rabbitmq.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly exchangeName = 'market-data-exchange';

  async onModuleInit() {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    this.connection = await amqp.connect(rabbitmqUrl);
    this.channel = await this.connection.createChannel();

    // Create topic exchange
    await this.channel.assertExchange(this.exchangeName, 'topic', {
      durable: true,
    });

    this.logger.log('Connected to RabbitMQ');
  }

  async onModuleDestroy() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }

  /**
   * Publish market data updates
   */
  async publishMarketUpdates(updates: any[]) {
    updates.forEach((update) => {
      // Use instrumentId for routing (consistent with WebSocket filtering)
      const routingKey = `market.update.${update.instrumentId}`;
      this.channel.publish(
        this.exchangeName,
        routingKey,
        Buffer.from(JSON.stringify(update)),
        { persistent: true }
      );
    });
  }


  /**
   * Create queue and bind to exchange
   */
  async createQueue(queueName: string, routingPattern: string) {
    await this.channel.assertQueue(queueName, { durable: true });
    await this.channel.bindQueue(queueName, this.exchangeName, routingPattern);
    this.logger.log(`Queue '${queueName}' created`);
  }

  /**
   * Consume messages from queue
   */
  async consumeQueue(
    queueName: string,
    callback: (msg: any) => Promise<void>,
    options?: { prefetch?: number }
  ) {
    if (options?.prefetch) {
      await this.channel.prefetch(options.prefetch);
    }

    this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel.ack(msg);
        } catch (error) {
          this.logger.error(`Error processing message: ${error.message}`);
          this.channel.nack(msg, false, false);
        }
      }
    });

    this.logger.log(`Started consuming from queue: ${queueName}`);
  }
}
```

### Step 4: Create Market Data Worker

**File:** `src/market-data/workers/market-data.worker.ts`

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { MarketDataGateway } from '../market-data.gateway';

@Injectable()
export class MarketDataWorker implements OnModuleInit {
  private readonly logger = new Logger(MarketDataWorker.name);
  private readonly queueName = 'market-data-queue';

  constructor(
    private rabbitMQ: RabbitMQService,
    private gateway: MarketDataGateway,
  ) {}

  async onModuleInit() {
    await this.rabbitMQ.createQueue(this.queueName, 'market.update.*');
    await this.rabbitMQ.consumeQueue(
      this.queueName,
      this.processUpdate.bind(this),
      { prefetch: 50 }
    );
    this.logger.log('Market data worker started');
  }

  private async processUpdate(update: any) {
    // Broadcast to WebSocket clients
    this.gateway.broadcastMarketUpdate(update);
  }
}
```

---

## WebSocket Gateway with Authentication

### Step 1: Create Authenticated Gateway

**File:** `src/market-data/market-data.gateway.ts`

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
  },
  namespace: '/market-data',
})
export class MarketDataGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MarketDataGateway.name);
  private userSubscriptions = new Map<string, Set<string>>(); // userId -> Set<symbols>

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Authenticate WebSocket connection
   */
  async handleConnection(client: Socket) {
    try {
      // Get token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      
      // Load user from database
      const user = await this.prisma.user.findUnique({
        where: { email: payload.email },
        include: {
          quotes: {
            include: {
              instrument: true,
            },
          },
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Attach user to socket
      (client as any).user = user;
      (client as any).userId = user.id;

      // Get instrument IDs from user's quotes
      const instrumentIds = user.quotes.map((quote) => quote.instrumentId);
      this.userSubscriptions.set(user.id, new Set(instrumentIds));

      // Join rooms for each instrument the user has quotes for
      instrumentIds.forEach((instrumentId) => {
        client.join(`instrument:${instrumentId}`);
      });

      this.logger.log(
        `Client connected: ${client.id} (User: ${user.email}, Quotes: ${user.quotes.length})`
      );

      // Send connection confirmation
      client.emit('connection-status', {
        status: 'connected',
        message: 'Successfully connected to market data stream',
      });

      // Send user's quotes
      client.emit('my-quotes', {
        quotes: user.quotes.map((quote) => ({
          id: quote.id,
          instrumentId: quote.instrumentId,
          instrument: quote.instrument,
          userBid: quote.userBid,
          userAsk: quote.userAsk,
          notes: quote.notes,
        })),
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('connection-status', {
        status: 'error',
        message: 'Authentication failed',
      });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any)?.userId;
    if (userId) {
      this.userSubscriptions.delete(userId);
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('get-my-quotes')
  async handleGetMyQuotes(@ConnectedSocket() client: Socket) {
    const userId = (client as any)?.userId;
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const quotes = await this.prisma.quote.findMany({
      where: { userId },
      include: {
        instrument: true,
      },
    });

    return {
      success: true,
      quotes: quotes.map((quote) => ({
        id: quote.id,
        instrumentId: quote.instrumentId,
        instrument: quote.instrument,
        userBid: quote.userBid,
        userAsk: quote.userAsk,
        notes: quote.notes,
      })),
    };
  }

  /**
   * Broadcast market update to users who have quotes for this instrument
   * Only users with quotes containing this instrumentId will receive the update
   */
  broadcastMarketUpdate(update: any) {
    // Broadcast to room for this instrument ID
    // Only users with quotes for this instrument are in this room (joined on connection)
    this.server.to(`instrument:${update.instrumentId}`).emit('market-update', update);
    
    this.logger.debug(
      `Broadcasted market update for instrument ${update.instrumentId} (${update.symbol})`
    );
  }


  /**
   * Update user subscriptions when quote is added/deleted
   */
  async updateUserSubscriptions(userId: string, client: Socket) {
    const quotes = await this.prisma.quote.findMany({
      where: { userId },
      select: { instrumentId: true },
    });

    const instrumentIds = quotes.map((q) => q.instrumentId);
    this.userSubscriptions.set(userId, new Set(instrumentIds));

    // Rejoin rooms
    instrumentIds.forEach((instrumentId) => {
      client.join(`instrument:${instrumentId}`);
    });
  }
}
```

---

## Quotes Service Implementation

### Step 1: Create Quote DTOs

**File:** `src/market-data/quotes/dtos/quote.dto.ts`

```typescript
import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateQuoteDto {
  @IsUUID()
  instrumentId: string;

  @IsNumber()
  @IsOptional()
  userBid?: number;

  @IsNumber()
  @IsOptional()
  userAsk?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateQuoteDto {
  @IsNumber()
  @IsOptional()
  userBid?: number;

  @IsNumber()
  @IsOptional()
  userAsk?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class QuoteDto {
  id: string;
  userId: string;
  instrumentId: string;
  instrument: {
    id: string;
    symbol: string;
    name: string;
    currentPrice: number;
  };
  userBid?: number;
  userAsk?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Step 2: Create Quotes Service

**File:** `src/market-data/quotes/quotes.service.ts`

```typescript
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateQuoteDto, UpdateQuoteDto, QuoteDto } from './dtos/quote.dto';
import { MarketDataGateway } from '../market-data.gateway';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private prisma: PrismaService,
    private gateway: MarketDataGateway,
  ) {}

  /**
   * Get all quotes for a user
   */
  async getUserQuotes(userId: string): Promise<QuoteDto[]> {
    const quotes = await this.prisma.quote.findMany({
      where: { userId },
      include: {
        instrument: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map(this.mapToDto);
  }

  /**
   * Create a new quote (add instrument to user's watchlist)
   */
  async createQuote(userId: string, dto: CreateQuoteDto): Promise<QuoteDto> {
    // Check if instrument exists
    const instrument = await this.prisma.marketInstrument.findUnique({
      where: { id: dto.instrumentId },
    });

    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }

    // Check if quote already exists
    const existing = await this.prisma.quote.findUnique({
      where: {
        userId_instrumentId: {
          userId,
          instrumentId: dto.instrumentId,
        },
      },
    });

    if (existing) {
      throw new ForbiddenException('Quote already exists for this instrument');
    }

    // Create quote
    const quote = await this.prisma.quote.create({
      data: {
        userId,
        instrumentId: dto.instrumentId,
        userBid: dto.userBid,
        userAsk: dto.userAsk,
        notes: dto.notes,
      },
      include: {
        instrument: true,
      },
    });

    this.logger.log(`User ${userId} created quote for instrument ${dto.instrumentId}`);

    // Notify WebSocket gateway to update user subscriptions
    // This will be handled by the gateway when it receives the update

    return this.mapToDto(quote);
  }

  /**
   * Update quote
   */
  async updateQuote(
    userId: string,
    quoteId: string,
    dto: UpdateQuoteDto,
  ): Promise<QuoteDto> {
    // Verify quote belongs to user
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.userId !== userId) {
      throw new ForbiddenException('Not authorized to update this quote');
    }

    // Update quote
    const updated = await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        userBid: dto.userBid,
        userAsk: dto.userAsk,
        notes: dto.notes,
      },
      include: {
        instrument: true,
      },
    });

    return this.mapToDto(updated);
  }

  /**
   * Delete quote
   */
  async deleteQuote(userId: string, quoteId: string): Promise<void> {
    // Verify quote belongs to user
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.userId !== userId) {
      throw new ForbiddenException('Not authorized to delete this quote');
    }

    await this.prisma.quote.delete({
      where: { id: quoteId },
    });

    this.logger.log(`User ${userId} deleted quote ${quoteId}`);

    // Notify WebSocket gateway to update user subscriptions
    // This will be handled by the gateway when it receives the update
  }

  /**
   * Get quote by ID
   */
  async getQuoteById(userId: string, quoteId: string): Promise<QuoteDto> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        instrument: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (quote.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this quote');
    }

    return this.mapToDto(quote);
  }

  private mapToDto(quote: any): QuoteDto {
    return {
      id: quote.id,
      userId: quote.userId,
      instrumentId: quote.instrumentId,
      instrument: {
        id: quote.instrument.id,
        symbol: quote.instrument.symbol,
        name: quote.instrument.name || '',
        currentPrice: quote.instrument.currentPrice,
      },
      userBid: quote.userBid,
      userAsk: quote.userAsk,
      notes: quote.notes,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    };
  }
}
```

### Step 3: Create Quotes Controller

**File:** `src/market-data/quotes/quotes.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dtos/quote.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('api/quotes')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Get()
  async getMyQuotes(@Request() req) {
    return this.quotesService.getUserQuotes(req.user.id);
  }

  @Get(':id')
  async getQuote(@Request() req, @Param('id') id: string) {
    return this.quotesService.getQuoteById(req.user.id, id);
  }

  @Post()
  async createQuote(@Request() req, @Body() dto: CreateQuoteDto) {
    return this.quotesService.createQuote(req.user.id, dto);
  }

  @Put(':id')
  async updateQuote(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotesService.updateQuote(req.user.id, id, dto);
  }

  @Delete(':id')
  async deleteQuote(@Request() req, @Param('id') id: string) {
    await this.quotesService.deleteQuote(req.user.id, id);
    return { message: 'Quote deleted successfully' };
  }
}
```

### Step 4: Update Gateway to Handle Quote Changes

**Add to `market-data.gateway.ts`:**

```typescript
/**
 * Handle quote creation - update user subscriptions
 */
@SubscribeMessage('quote-created')
async handleQuoteCreated(@ConnectedSocket() client: Socket) {
  const userId = (client as any)?.userId;
  if (userId) {
    await this.updateUserSubscriptions(userId, client);
  }
}

/**
 * Handle quote deletion - update user subscriptions
 */
@SubscribeMessage('quote-deleted')
async handleQuoteDeleted(@ConnectedSocket() client: Socket) {
  const userId = (client as any)?.userId;
  if (userId) {
    await this.updateUserSubscriptions(userId, client);
  }
}
```

---

## Complete Data Flow with Quotes

### User Creates Quote

```
1. User creates quote via POST /api/quotes
   Body: { instrumentId: "abc-123" }
   ↓
2. Quote created in database
   ↓
3. User connects via WebSocket (or already connected)
   ↓
4. Gateway loads user's quotes on connection
   ↓
5. User automatically joins rooms for all instruments in quotes
   ↓
6. Market data updates for those instruments → User receives them ✅
```

### Market Data Update Flow

```
1. Worker Thread generates update for Instrument "AAPL" (id: abc-123)
   ↓
2. Update published to RabbitMQ
   ↓
3. Market Data Worker consumes update
   ↓
4. Gateway.broadcastMarketUpdate() called
   ↓
5. Gateway checks: Who has quotes for instrument "abc-123"?
   - User A: Has quote for "abc-123" ✅ → Receives update
   - User B: Has quote for "abc-123" ✅ → Receives update
   - User C: No quote for "abc-123" ❌ → Doesn't receive update
   ↓
6. Updates sent only to users in room "instrument:abc-123"
```

### User Adds New Quote

```
1. User creates new quote via POST /api/quotes
   Body: { instrumentId: "xyz-789" }
   ↓
2. Quote saved to database
   ↓
3. User sends WebSocket message: "quote-created"
   ↓
4. Gateway updates user subscriptions
   ↓
5. User joins room "instrument:xyz-789"
   ↓
6. Now receives updates for "xyz-789" ✅
```

### User Deletes Quote

```
1. User deletes quote via DELETE /api/quotes/:id
   ↓
2. Quote removed from database
   ↓
3. User sends WebSocket message: "quote-deleted"
   ↓
4. Gateway updates user subscriptions
   ↓
5. User leaves room "instrument:xyz-789"
   ↓
6. No longer receives updates for "xyz-789" ❌
```

---

## Key Concepts

### 1. Quote = User's Watchlist Item
- User creates quote → Adds instrument to watchlist
- User receives updates only for instruments in quotes
- User can have multiple quotes (multiple instruments)

### 2. Automatic Subscription
- On WebSocket connection, user automatically subscribed to all instruments in their quotes
- No need to manually subscribe/unsubscribe
- Updates when quotes are added/removed

### 3. Filtering Logic
- Market data generated for ALL instruments
- But only sent to users who have quotes for those instruments
- Efficient: Uses Socket.IO rooms for filtering

---

## Example User Journey

### Step 1: User Logs In
```
POST /api/auth/login
→ Receives JWT token in cookie
```

### Step 2: User Creates Quotes
```
POST /api/quotes
Body: { instrumentId: "AAPL-instrument-id" }
→ Quote created

POST /api/quotes
Body: { instrumentId: "TSLA-instrument-id" }
→ Another quote created
```

### Step 3: User Connects via WebSocket
```
const socket = io('http://localhost:3000/market-data', {
  auth: { token: 'jwt-token' }
});

→ Gateway authenticates
→ Loads user's quotes (AAPL, TSLA)
→ Joins rooms: "instrument:AAPL-id", "instrument:TSLA-id"
```

### Step 4: User Receives Updates
```
→ Market data for AAPL → User receives ✅
→ Market data for TSLA → User receives ✅
→ Market data for GOOGL → User doesn't receive ❌ (no quote)
```

### Step 5: User Adds New Quote
```
POST /api/quotes
Body: { instrumentId: "GOOGL-instrument-id" }

→ Quote created
→ User sends "quote-created" via WebSocket
→ Gateway updates subscriptions
→ User joins room "instrument:GOOGL-id"
→ Now receives updates for GOOGL ✅
```

---

## Summary

**Key Points:**
1. ✅ Users have **Quotes** (watchlist items)
2. ✅ Quotes link to **Instruments** via `instrumentId`
3. ✅ Market data generated for **all instruments**
4. ✅ Updates **filtered** by user's quotes
5. ✅ Users **only receive** updates for instruments in their quotes
6. ✅ **Automatic subscription** on WebSocket connection
7. ✅ **Dynamic updates** when quotes added/removed

**This ensures:**
- Users only see data they care about
- Efficient message filtering
- Clean separation of concerns
- Scalable architecture

---

## Complete Module Setup

### Market Data Module

**File:** `src/market-data/market-data.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { MarketDataGateway } from './market-data.gateway';
import { QuotesController } from './quotes/quotes.controller';
import { QuotesService } from './quotes/quotes.service';
import { MarketSimulatorWorkerService } from './simulation/market-simulator-worker.service';
import { RabbitMQService } from './rabbitmq/rabbitmq.service';
import { MarketDataWorker } from './workers/market-data.worker';
import { PrismaService } from 'src/prisma.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  controllers: [MarketDataController, QuotesController],
  providers: [
    MarketDataService,
    MarketDataGateway,
    QuotesService,
    MarketSimulatorWorkerService,
    RabbitMQService,
    MarketDataWorker,
    PrismaService,
  ],
  exports: [MarketDataService, MarketDataGateway, QuotesService],
})
export class MarketDataModule {}
```

---

## Complete Data Flow

### Market Data Flow

```
1. Worker Thread generates random market data (every 500ms)
   ↓
2. Worker sends updates via postMessage()
   ↓
3. Worker Manager receives updates
   ↓
4. Publishes to RabbitMQ Exchange (routing: market.update.*)
   ↓
5. Market Data Worker consumes from queue
   ↓
6. Broadcasts via WebSocket Gateway (authenticated users only)
   ↓
7. Clients receive real-time updates
```

---

## Testing the System

### 1. Test Worker Thread

```bash
# Check logs for:
✅ "Market simulator worker started"
✅ "Received X updates from worker"
```

### 2. Test RabbitMQ

```bash
# Access RabbitMQ UI: http://localhost:15672
# Check:
✅ Exchange "market-data-exchange" exists
✅ Queues are created
✅ Messages are flowing
```

### 3. Test WebSocket Connection

```typescript
// Frontend test
const socket = io('http://localhost:3000/market-data', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connection-status', (data) => {
  console.log('Status:', data);
});

socket.on('market-update', (update) => {
  console.log('Market update:', update);
});


socket.emit('subscribe-instrument', { symbol: 'AAPL' });
```

---

## Project Status Summary

| Component | Status | Priority | Notes |
|-----------|--------|----------|-------|
| Authentication | ✅ Complete | - | JWT + Passport fully implemented |
| User Management | ✅ Complete | - | All CRUD operations working |
| Database Setup | ✅ Complete | - | PostgreSQL + Prisma configured |
| Quotes Module | ✅ 90% Complete | Critical | CRUD implemented, missing DB relation |
| Market Instrument Module | ✅ 60% Complete | Medium | Basic CRUD, needs enhancement |
| Market Data Simulator (Worker) | ❌ Not Started | Critical | Service exists but empty |
| RabbitMQ Integration | ❌ Not Started | Critical | No files created |
| WebSocket Gateway (Auth + Quote Filtering) | ❌ Not Started | Critical | No files created |

---

## Key Design Decisions

### 1. Worker Threads for Market Simulation
- ✅ Runs in separate thread (true parallelism)
- ✅ Never blocks main thread
- ✅ Perfect for demo (shows advanced skills)

### 2. RabbitMQ for Message Queuing
- ✅ Decouples producer (worker) from consumers
- ✅ Scales independently
- ✅ Professional architecture
- ✅ Great for demo

### 3. Authenticated WebSocket
- ✅ Only authorized users receive data
- ✅ JWT validation on connection
- ✅ Secure streaming

### 4. Quote-Based Filtering
- ✅ Users have quotes (links to instruments)
- ✅ Users only receive updates for instruments in their quotes
- ✅ Automatic subscription on connection
- ✅ Updates when quotes are added/removed

---

## Benefits for Demo Project

✅ **Worker Threads**: Shows advanced Node.js knowledge
✅ **RabbitMQ**: Demonstrates message queuing architecture
✅ **WebSocket Auth**: Shows security best practices
✅ **Real-time Streaming**: Impressive user experience
✅ **Quote-Based Filtering**: Efficient message routing

---

**Last Updated:** December 6, 2024
**Version:** 2.2.0 (Removed Strategy Components - Simplified to Market Data Streaming Only)
