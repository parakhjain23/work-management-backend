# Authentication System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Folder Structure](#folder-structure)
4. [Authentication Flow](#authentication-flow)
5. [Mock Authentication Implementation](#mock-authentication-implementation)
6. [Type Definitions](#type-definitions)
7. [Middleware Details](#middleware-details)
8. [Usage in Controllers](#usage-in-controllers)
9. [API Request Flow](#api-request-flow)
10. [Security Considerations](#security-considerations)

---

## Overview

The backend currently uses a **mock authentication system** for development and testing purposes. This system simulates authenticated user sessions by automatically injecting user context into every request without requiring actual login credentials or JWT validation.

### Key Characteristics:
- **Environment**: Development/Testing only
- **Authentication Type**: Mock (simulated)
- **User Context**: Hardcoded user ID and organization ID
- **Security**: None (not suitable for production)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Request                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express Application                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  1. CORS Middleware                                   │  │
│  │     - Origin validation                               │  │
│  │     - Credentials handling                            │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│                      ▼                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  2. JSON Body Parser                                  │  │
│  │     - Parses request body                             │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│                      ▼                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  3. Mock Auth Middleware (GLOBAL)                     │  │
│  │     - Injects req.user = { id: 1, org_id: 1 }        │  │
│  │     - Applied to ALL routes                           │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│                      ▼                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  4. Request Logger                                    │  │
│  │     - Logs: [timestamp] METHOD path - User: id       │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│                      ▼                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  5. Route Handlers                                    │  │
│  │     - /categories                                     │  │
│  │     - /work-items                                     │  │
│  │     - /custom-fields                                  │  │
│  │     - /system-prompts                                 │  │
│  │     - etc.                                            │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│                      ▼                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  6. Controllers                                       │  │
│  │     - Extract req.user.id and req.user.org_id        │  │
│  │     - Convert to BigInt                               │  │
│  │     - Call service layer                              │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│                      ▼                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  7. Service Layer                                     │  │
│  │     - Business logic                                  │  │
│  │     - Database operations (Prisma)                    │  │
│  │     - Event emission                                  │  │
│  └───────────────────┬───────────────────────────────────┘  │
│                      │                                       │
│                      ▼                                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  8. Response                                          │  │
│  │     - JSON response with data                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
backend/
├── src/
│   ├── middleware/
│   │   └── auth.mock.ts              # Mock authentication middleware
│   │
│   ├── types/
│   │   └── express.d.ts              # TypeScript type extensions for Express
│   │
│   ├── app/
│   │   └── server.ts                 # Express app setup with middleware chain
│   │
│   ├── routes/
│   │   ├── categories.routes.ts      # Category routes (protected)
│   │   ├── workItems.routes.ts       # Work items routes (protected)
│   │   ├── customFields.routes.ts    # Custom fields routes (protected)
│   │   ├── systemPrompts.routes.ts   # System prompts routes (protected)
│   │   ├── followers.routes.ts       # Followers routes (protected)
│   │   ├── workItemLogs.routes.ts    # Logs routes (protected)
│   │   ├── intent.routes.ts          # AI intent routes (protected)
│   │   ├── chatbot.routes.ts         # Chatbot routes (protected)
│   │   ├── rag.route.ts              # RAG routes (protected)
│   │   ├── ai.schema.ts              # AI schema routes (protected)
│   │   ├── ai.sql.ts                 # AI SQL routes (protected)
│   │   └── health.route.ts           # Health check (unprotected)
│   │
│   ├── controllers/
│   │   ├── categories.controller.ts
│   │   ├── workItems.controller.ts
│   │   ├── customFields.controller.ts
│   │   ├── systemPrompts.controller.ts
│   │   ├── followers.controller.ts
│   │   ├── workItemLogs.controller.ts
│   │   └── intent.controller.ts
│   │
│   ├── services/
│   │   ├── categories.service.ts
│   │   ├── workItems.service.ts
│   │   ├── customFields.service.ts
│   │   ├── systemPrompts.service.ts
│   │   ├── followers.service.ts
│   │   └── workItemLogs.service.ts
│   │
│   └── index.ts                      # Application entry point
│
└── package.json
```

---

## Authentication Flow

### 1. Request Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Client sends HTTP request                           │
│ ────────────────────────────────────────────────────────────│
│ POST /work-items                                             │
│ Content-Type: application/json                               │
│ {                                                            │
│   "title": "Fix login bug",                                 │
│   "categoryId": "4"                                          │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Express receives request                            │
│ ────────────────────────────────────────────────────────────│
│ req = {                                                      │
│   method: 'POST',                                            │
│   path: '/work-items',                                       │
│   body: { title: '...', categoryId: '4' },                  │
│   user: undefined  // Not set yet                           │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 3: CORS Middleware                                     │
│ ────────────────────────────────────────────────────────────│
│ - Validates origin (localhost:3000, localhost:3001)         │
│ - Sets CORS headers                                          │
│ - Allows credentials                                         │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 4: JSON Body Parser                                    │
│ ────────────────────────────────────────────────────────────│
│ - Parses JSON body                                           │
│ - Populates req.body                                         │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 5: Mock Auth Middleware (THE KEY STEP)                 │
│ ────────────────────────────────────────────────────────────│
│ authMiddleware(req, res, next) {                         │
│   req.user = {                                               │
│     id: 1,        // Hardcoded user ID                      │
│     org_id: 1     // Hardcoded organization ID              │
│   };                                                         │
│   next();                                                    │
│ }                                                            │
│                                                              │
│ Result:                                                      │
│ req.user = { id: 1, org_id: 1 }  ✅ User context injected  │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 6: Request Logger                                      │
│ ────────────────────────────────────────────────────────────│
│ Console output:                                              │
│ [2026-02-03T05:30:15.123Z] POST /work-items - User: 1      │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 7: Route Handler                                       │
│ ────────────────────────────────────────────────────────────│
│ router.post('/', createWorkItem);                            │
│ // Matches POST /work-items                                 │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 8: Controller extracts user context                    │
│ ────────────────────────────────────────────────────────────│
│ export const createWorkItem = async (req, res) => {         │
│   const orgId = BigInt(req.user!.org_id);   // 1n          │
│   const userId = BigInt(req.user!.id);      // 1n          │
│                                                              │
│   const workItem = await workItemsService.create(           │
│     orgId,                                                   │
│     userId,                                                  │
│     req.body                                                 │
│   );                                                         │
│                                                              │
│   res.json({ success: true, data: workItem });             │
│ };                                                           │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 9: Service Layer                                       │
│ ────────────────────────────────────────────────────────────│
│ async create(orgId, userId, data) {                         │
│   // Validate category belongs to org                       │
│   // Create work item in database                           │
│   // Emit domain event                                      │
│   return workItem;                                           │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Step 10: Response sent to client                            │
│ ────────────────────────────────────────────────────────────│
│ HTTP 200 OK                                                  │
│ {                                                            │
│   "success": true,                                           │
│   "data": {                                                  │
│     "id": "15",                                              │
│     "title": "Fix login bug",                               │
│     "orgId": "1",                                            │
│     "createdBy": "1",                                        │
│     ...                                                      │
│   }                                                          │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## Mock Authentication Implementation

### File: `src/middleware/auth.mock.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Purpose: Mock authentication middleware for development/testing
 * Provides fake user context with numeric IDs (required for BigInt conversion)
 */
export const authMiddleware = (
  req: Request, 
  _res: Response, 
  next: NextFunction
): void => {
  req.user = {
    id: 1,      // Numeric ID (will be converted to BigInt in controllers)
    org_id: 1   // Numeric ID (will be converted to BigInt in controllers)
  };
  next();
};
```

### Key Points:

1. **Automatic Injection**: Every request automatically gets `req.user` populated
2. **Hardcoded Values**: User ID = 1, Organization ID = 1
3. **No Validation**: No token checking, no password verification
4. **Development Only**: Should NEVER be used in production

---

## Type Definitions

### File: `src/types/express.d.ts`

```typescript
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;      // User ID (numeric, converted to BigInt in controllers)
        org_id: number;  // Organization ID (numeric, converted to BigInt)
      };
    }
  }
}
```

### Purpose:
- Extends Express Request type to include `user` property
- Provides TypeScript autocomplete and type safety
- Allows `req.user` to be accessed in controllers without type errors

---

## Middleware Details

### Registration in `src/app/server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import { authMiddleware } from '../middleware/auth.mock.js';

const app = express();

// 1. CORS configuration
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));

// 2. JSON body parser
app.use(express.json());

// 3. GLOBAL mock authentication (applies to ALL routes)
app.use(authMiddleware);

// 4. Request logger
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - User: ${req.user?.id}`);
  next();
});

// 5. Route registration
app.use('/categories', categoriesRoutes);
app.use('/work-items', workItemsRoutes);
app.use('/custom-fields', customFieldsRoutes);
app.use('/system-prompts', systemPromptsRoutes);
// ... more routes

export default app;
```

### Middleware Order (CRITICAL):

1. **CORS** - Must be first to handle preflight requests
2. **Body Parser** - Parses JSON before auth
3. **Mock Auth** - Injects user context (GLOBAL)
4. **Logger** - Logs requests with user ID
5. **Routes** - Handle specific endpoints

---

## Usage in Controllers

### Example: `src/controllers/workItems.controller.ts`

```typescript
import { Request, Response } from 'express';
import { WorkItemsService } from '../services/workItems.service.js';

const workItemsService = new WorkItemsService();

/**
 * Purpose: Get all work items for the authenticated user's organization
 */
export const getWorkItems = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract org_id from authenticated user context
    const orgId = BigInt(req.user!.org_id);  // req.user is guaranteed by middleware
    
    // Apply filters from query params
    const filters = {
      status: req.query.status as string,
      priority: req.query.priority as string,
      categoryId: req.query.categoryId ? BigInt(req.query.categoryId as string) : undefined
    };

    // Call service layer with org context
    const workItems = await workItemsService.findAll(orgId, filters);

    res.json({
      success: true,
      data: workItems
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch work items'
    });
  }
};

/**
 * Purpose: Create a new work item
 */
export const createWorkItem = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract BOTH org_id and user id from authenticated context
    const orgId = BigInt(req.user!.org_id);   // For org-level validation
    const userId = BigInt(req.user!.id);      // For audit trail (createdBy)

    const workItem = await workItemsService.create(orgId, userId, req.body);

    res.status(201).json({
      success: true,
      data: workItem
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create work item'
    });
  }
};
```

### Common Patterns:

#### 1. **Read Operations** (GET)
```typescript
const orgId = BigInt(req.user!.org_id);
const data = await service.findAll(orgId);
```

#### 2. **Create Operations** (POST)
```typescript
const orgId = BigInt(req.user!.org_id);
const userId = BigInt(req.user!.id);
const data = await service.create(orgId, userId, req.body);
```

#### 3. **Update Operations** (PATCH/PUT)
```typescript
const orgId = BigInt(req.user!.org_id);
const userId = BigInt(req.user!.id);
const data = await service.update(id, orgId, userId, req.body);
```

#### 4. **Delete Operations** (DELETE)
```typescript
const orgId = BigInt(req.user!.org_id);
await service.delete(id, orgId);
```

### Why `req.user!` with `!`?

The `!` (non-null assertion) tells TypeScript that `req.user` is guaranteed to exist. This is safe because:
1. Mock auth middleware runs BEFORE all routes
2. It always sets `req.user`
3. TypeScript type is `user?: { ... }` (optional), but we know it's always present

---

## API Request Flow

### Example: Creating a Work Item

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Client Request                                           │
├─────────────────────────────────────────────────────────────┤
│ POST http://localhost:3000/work-items                       │
│ Content-Type: application/json                              │
│                                                             │
│ {                                                           │
│   "title": "Implement user authentication",                │
│   "description": "Add JWT-based auth",                     │
│   "categoryId": "4",                                        │
│   "priority": "HIGH"                                        │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Mock Auth Middleware                                     │
├─────────────────────────────────────────────────────────────┤
│ req.user = { id: 1, org_id: 1 }                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Route Handler                                            │
├─────────────────────────────────────────────────────────────┤
│ router.post('/', createWorkItem)                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Controller (workItems.controller.ts)                     │
├─────────────────────────────────────────────────────────────┤
│ export const createWorkItem = async (req, res) => {         │
│   const orgId = BigInt(req.user!.org_id);   // 1n          │
│   const userId = BigInt(req.user!.id);      // 1n          │
│                                                             │
│   const workItem = await workItemsService.create(           │
│     orgId,      // 1n                                       │
│     userId,     // 1n                                       │
│     {                                                       │
│       title: "Implement user authentication",              │
│       description: "Add JWT-based auth",                   │
│       categoryId: 4n,                                       │
│       priority: "HIGH"                                      │
│     }                                                       │
│   );                                                        │
│                                                             │
│   res.status(201).json({                                   │
│     success: true,                                          │
│     data: serializeBigInt(workItem)                        │
│   });                                                       │
│ };                                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Service Layer (workItems.service.ts)                     │
├─────────────────────────────────────────────────────────────┤
│ async create(orgId: bigint, userId: bigint, data) {        │
│   // 1. Validate category belongs to org                   │
│   if (data.categoryId) {                                    │
│     const category = await prisma.category.findFirst({     │
│       where: { id: data.categoryId, orgId }               │
│     });                                                     │
│     if (!category) throw new Error('Category not found');  │
│   }                                                         │
│                                                             │
│   // 2. Create work item                                   │
│   const workItem = await prisma.workItem.create({          │
│     data: {                                                 │
│       orgId,                                                │
│       categoryId: data.categoryId,                         │
│       title: data.title,                                    │
│       description: data.description,                       │
│       priority: data.priority,                             │
│       status: 'CAPTURED',                                   │
│       createdBy: userId,    // Audit trail                 │
│       updatedBy: userId                                     │
│     }                                                       │
│   });                                                       │
│                                                             │
│   // 3. Emit domain event                                  │
│   await domainEventDispatcher.emit(                         │
│     DomainEventDispatcher.workItemEvent(                   │
│       'create',                                             │
│       workItem.id,                                          │
│       orgId,                                                │
│       workItem.categoryId,                                  │
│       'user',                                               │
│       ['title', 'status', 'priority'],                     │
│       { /* field changes */ }                              │
│     )                                                       │
│   );                                                        │
│                                                             │
│   return workItem;                                          │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Database (Prisma → PostgreSQL)                           │
├─────────────────────────────────────────────────────────────┤
│ INSERT INTO work_items (                                    │
│   org_id, category_id, title, description,                 │
│   priority, status, created_by, updated_by                 │
│ ) VALUES (                                                  │
│   1, 4, 'Implement user authentication',                   │
│   'Add JWT-based auth', 'HIGH', 'CAPTURED', 1, 1          │
│ ) RETURNING *;                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Response to Client                                       │
├─────────────────────────────────────────────────────────────┤
│ HTTP 201 Created                                            │
│ Content-Type: application/json                              │
│                                                             │
│ {                                                           │
│   "success": true,                                          │
│   "data": {                                                 │
│     "id": "15",                                             │
│     "orgId": "1",                                           │
│     "categoryId": "4",                                      │
│     "title": "Implement user authentication",              │
│     "description": "Add JWT-based auth",                   │
│     "priority": "HIGH",                                     │
│     "status": "CAPTURED",                                   │
│     "createdBy": "1",                                       │
│     "updatedBy": "1",                                       │
│     "createdAt": "2026-02-03T05:30:15.123Z",              │
│     "updatedAt": "2026-02-03T05:30:15.123Z"               │
│   }                                                         │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### ⚠️ Current Implementation (Mock Auth)

**CRITICAL WARNINGS:**

1. **No Authentication**: Anyone can access any endpoint
2. **No Authorization**: All users have the same permissions
3. **Single User/Org**: All requests are treated as user ID 1, org ID 1
4. **No Token Validation**: No JWT, no session, no security
5. **Development Only**: Must be replaced before production

### 🔒 Production Requirements

For production, you need to implement:

#### 1. **Real Authentication Middleware**

```typescript
// src/middleware/auth.jwt.ts (EXAMPLE - NOT IMPLEMENTED)
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const jwtAuthMiddleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      orgId: number;
    };

    // Set user context
    req.user = {
      id: decoded.userId,
      org_id: decoded.orgId
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

#### 2. **Login Endpoint**

```typescript
// POST /auth/login
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  // Validate credentials
  const user = await validateCredentials(email, password);
  
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, orgId: user.org_id },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  res.json({ token, user });
};
```

#### 3. **Replace Mock Middleware**

```typescript
// src/app/server.ts
import { jwtAuthMiddleware } from '../middleware/auth.jwt.js';

// Replace this:
// app.use(authMiddleware);

// With this:
app.use(jwtAuthMiddleware);
```

#### 4. **Environment-Based Toggle**

```typescript
// src/app/server.ts
import { authMiddleware } from '../middleware/auth.mock.js';
import { jwtAuthMiddleware } from '../middleware/auth.jwt.js';

// Use mock auth in development, real auth in production
const authMiddleware = process.env.NODE_ENV === 'production' 
  ? jwtAuthMiddleware 
  : authMiddleware;

app.use(authMiddleware);
```

---

## Complete Code Reference

### 1. Mock Auth Middleware

**File**: `src/middleware/auth.mock.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Purpose: Mock authentication middleware for development/testing
 * Provides fake user context with numeric IDs (required for BigInt conversion)
 */
export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  req.user = {
    id: 1,      // Numeric ID (will be converted to BigInt)
    org_id: 1   // Numeric ID (will be converted to BigInt)
  };
  next();
};
```

### 2. Type Definitions

**File**: `src/types/express.d.ts`

```typescript
import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        org_id: number;
      };
    }
  }
}
```

### 3. Server Setup

**File**: `src/app/server.ts`

```typescript
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authMiddleware } from '../middleware/auth.mock.js';

// Import all routes
import categoriesRoutes from '../routes/categories.routes.js';
import workItemsRoutes from '../routes/workItems.routes.js';
import customFieldsRoutes from '../routes/customFields.routes.js';
import systemPromptsRoutes from '../routes/systemPrompts.routes.js';
// ... more routes

const app = express();

// Middleware chain (ORDER MATTERS!)
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(authMiddleware);  // GLOBAL authentication

app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - User: ${req.user?.id}`);
  next();
});

// Route registration
app.use('/categories', categoriesRoutes);
app.use('/work-items', workItemsRoutes);
app.use('/custom-fields', customFieldsRoutes);
app.use('/system-prompts', systemPromptsRoutes);
// ... more routes

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
```

### 4. Example Controller

**File**: `src/controllers/workItems.controller.ts`

```typescript
import { Request, Response } from 'express';
import { WorkItemsService } from '../services/workItems.service.js';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const workItemsService = new WorkItemsService();

export const createWorkItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = BigInt(req.user!.org_id);
    const userId = BigInt(req.user!.id);

    const workItem = await workItemsService.create(orgId, userId, req.body);

    res.status(201).json({
      success: true,
      data: serializeBigInt(workItem)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create work item'
    });
  }
};
```

---

## Summary

### Current State:
- ✅ Mock authentication for development
- ✅ Automatic user context injection
- ✅ Type-safe with TypeScript
- ✅ Applied globally to all routes
- ✅ Simple and easy to use

### Limitations:
- ❌ No real authentication
- ❌ No authorization/permissions
- ❌ Single user/org only
- ❌ Not production-ready

### Next Steps for Production:
1. Implement JWT-based authentication
2. Add login/logout endpoints
3. Add role-based authorization
4. Add token refresh mechanism
5. Add password hashing (bcrypt)
6. Add rate limiting
7. Add session management
8. Replace mock middleware with real auth

---

**Document Version**: 1.0  
**Last Updated**: February 3, 2026  
**Status**: Development (Mock Auth)
