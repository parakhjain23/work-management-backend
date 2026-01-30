# GTWY JWT Embed Token Setup

## Overview

This document describes the secure backend implementation for generating GTWY chatbot JWT embed tokens. The JWT is generated server-side and encodes user identity, organization context, and runtime variables.

## Security Model

**Critical Rules**:
- JWT is NEVER generated on frontend
- `GTWY_ACCESS_KEY` is NEVER exposed to client
- Token is short-lived (configurable expiry)
- User identity comes from authenticated session
- All token generation is logged

## Environment Configuration

### Required Variables

Add to `.env`:

```bash
# GTWY Chatbot Configuration
GTWY_ACCESS_KEY=your_actual_gtwy_access_key_here
GTWY_CHATBOT_ID=69785c0b108ba50ee320501b
JWT_EXPIRY_SECONDS=3600
APP_ENV=local
```

### Variable Descriptions

- **GTWY_ACCESS_KEY** - Secret key for signing JWTs (from GTWY dashboard)
- **GTWY_CHATBOT_ID** - Your chatbot ID from GTWY
- **JWT_EXPIRY_SECONDS** - Token lifetime in seconds (default: 3600 = 1 hour)
- **APP_ENV** - Environment identifier (local, staging, prod)

## API Endpoint

### GET /chatbot/embed-token

**Purpose**: Generate a signed JWT embed token for GTWY chatbot

**Authentication**: Required (via auth middleware)

**Request**:
```http
GET /chatbot/embed-token
Authorization: Bearer <user_session_token>
```

**Response (Success)**:
```json
{
  "success": true,
  "embedToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Response (Unauthorized)**:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Response (Server Error)**:
```json
{
  "success": false,
  "error": "Chatbot token generation failed"
}
```

## JWT Payload Structure

The generated JWT contains:

```json
{
  "org_id": "mock-org-456",
  "chatbot_id": "69785c0b108ba50ee320501b",
  "user_id": "mock-user-123",
  "variables": {
    "org_id": "mock-org-456",
    "user_id": "mock-user-123",
    "env": "local"
  },
  "iat": 1738099200,
  "exp": 1738102800
}
```

### Payload Fields

- **org_id** - Organization identifier from `req.user.org_id`
- **chatbot_id** - GTWY chatbot ID from environment
- **user_id** - User identifier from `req.user.id`
- **variables** - Runtime context for AI (duplicates identity)
- **iat** - Issued at timestamp (Unix seconds)
- **exp** - Expiry timestamp (Unix seconds)

### Why Variables Duplicate Identity

The `variables` object provides runtime context to the AI:
- AI can reference `{{user_id}}` in prompts
- AI can use `{{org_id}}` for scoping
- AI can adapt behavior based on `{{env}}`

This is GTWY's mechanism for passing context to the chatbot runtime.

## Implementation Architecture

### Files Created

```
src/
├── chatbot/
│   ├── gtwy.jwt.ts         # JWT generation logic
│   ├── gtwy.controller.ts  # HTTP request handler
├── middleware/
│   └── auth.mock.ts        # Mock auth (replace with real auth)
├── routes/
│   └── chatbot.ts          # Route registration
├── types/
│   └── express.d.ts        # TypeScript type extensions
```

### Component Responsibilities

**gtwy.jwt.ts**:
- Accepts org_id, user_id, chatbot_id
- Builds JWT payload per GTWY spec
- Signs with HS256 algorithm
- Returns token string

**gtwy.controller.ts**:
- Validates `req.user` exists
- Extracts user_id and org_id from session
- Calls JWT service
- Returns formatted response
- Handles errors safely

**chatbot.ts (routes)**:
- Registers `GET /chatbot/embed-token`
- Attaches auth middleware
- Routes to controller

**auth.mock.ts**:
- Mock authentication for development
- **MUST be replaced with real auth in production**

## Security Features

### 1. Server-Side Only
JWT generation happens exclusively on backend. Frontend never sees the secret key.

### 2. Short-Lived Tokens
Tokens expire after configured duration (default 1 hour). Reduces risk if token is compromised.

### 3. User Identity Binding
Token is bound to authenticated user session. Cannot be generated without valid authentication.

### 4. Safe Error Messages
Error responses never expose:
- Secret keys
- Internal configuration
- Stack traces
- Payload details

### 5. Audit Trail
All token generation is logged with:
- Timestamp
- User ID
- Success/failure

## Frontend Integration

### React Example

```typescript
// Fetch embed token from backend
const response = await fetch('/chatbot/embed-token', {
  headers: {
    'Authorization': `Bearer ${userSessionToken}`
  }
});

const { embedToken } = await response.json();

// Initialize GTWY chatbot with token
<GtwyChatbot embedToken={embedToken} />
```

### Token Refresh Strategy

Since tokens are short-lived:
1. Fetch token when user opens chatbot
2. Store token in component state (not localStorage)
3. Refresh token before expiry
4. Handle 401 errors by re-fetching

**Example**:
```typescript
useEffect(() => {
  const fetchToken = async () => {
    const { embedToken, expiresIn } = await getEmbedToken();
    setToken(embedToken);
    
    // Refresh 5 minutes before expiry
    setTimeout(fetchToken, (expiresIn - 300) * 1000);
  };
  
  fetchToken();
}, []);
```

## Testing

### Manual Test

```bash
# Start server
npm run dev

# Test endpoint (with mock auth)
curl http://localhost:3000/chatbot/embed-token

# Expected response:
{
  "success": true,
  "embedToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

### Decode JWT (for verification)

```bash
# Install jwt-cli (optional)
npm install -g jwt-cli

# Decode token
jwt decode <token_string>

# Verify signature
jwt verify <token_string> <GTWY_ACCESS_KEY>
```

### Test Checklist

- [ ] Authenticated request returns valid JWT
- [ ] JWT decodes with correct org_id
- [ ] JWT decodes with correct user_id
- [ ] JWT decodes with correct chatbot_id
- [ ] JWT has valid iat and exp timestamps
- [ ] exp is set to now + JWT_EXPIRY_SECONDS
- [ ] Missing auth returns 401
- [ ] Missing GTWY_ACCESS_KEY logs error and returns 500
- [ ] Token can be verified with GTWY_ACCESS_KEY

## Production Deployment

### 1. Replace Mock Auth

Replace `auth.mock.ts` with real authentication middleware:

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export const authMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    // Verify token and get user
    const user = await verifyUserToken(token);
    
    // Attach to request
    req.user = {
      id: user.id,
      org_id: user.org_id
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
};
```

### 2. Secure Environment Variables

- Store `GTWY_ACCESS_KEY` in secure vault (AWS Secrets Manager, etc.)
- Never commit `.env` to version control
- Use different keys per environment
- Rotate keys periodically

### 3. Enable HTTPS

JWT tokens must be transmitted over HTTPS in production.

### 4. Add Rate Limiting

Prevent token generation abuse:

```typescript
import rateLimit from 'express-rate-limit';

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each user to 100 requests per window
});

router.get('/chatbot/embed-token', tokenLimiter, authMiddleware, getEmbedToken);
```

### 5. Monitor Token Generation

Log and alert on:
- High token generation rates
- Failed generation attempts
- Missing configuration errors

## Troubleshooting

### Error: "GTWY_ACCESS_KEY is required"

**Cause**: Environment variable not set

**Fix**: Add `GTWY_ACCESS_KEY` to `.env` file

### Error: "Authentication required"

**Cause**: No user session or invalid auth token

**Fix**: Ensure auth middleware populates `req.user`

### Error: "Chatbot token generation failed"

**Cause**: Missing `GTWY_CHATBOT_ID` or JWT service initialization failed

**Fix**: Check environment variables and server logs

### Token Not Working in GTWY

**Cause**: Incorrect secret key or payload structure

**Fix**: 
1. Verify `GTWY_ACCESS_KEY` matches GTWY dashboard
2. Verify `GTWY_CHATBOT_ID` is correct
3. Check JWT payload structure matches GTWY spec

## What This Enables

With JWT embed tokens, you can now:

1. **Secure Chatbot Access** - Only authenticated users can use chatbot
2. **User Context** - AI knows who is talking (user_id)
3. **Organization Scoping** - AI operates within org boundaries (org_id)
4. **Audit Trail** - Track which users are using chatbot
5. **Permission Anchor** - Future: enforce permissions via JWT claims
6. **Multi-User Safety** - Each user gets their own token with their identity

## Future Enhancements

Possible additions (not implemented yet):
- Custom JWT claims (roles, permissions)
- Token refresh endpoint
- Token revocation list
- Per-user token limits
- Analytics on token usage

## Integration with GTWY Embed

Once you have the token, embed GTWY chatbot:

```html
<script src="https://cdn.gtwy.ai/embed.js"></script>
<script>
  GTWY.init({
    embedToken: '<JWT_FROM_BACKEND>',
    containerId: 'chatbot-container'
  });
</script>
```

The JWT ensures:
- User identity is verified
- Organization context is maintained
- AI can personalize responses
- Backend can enforce scope boundaries

## Summary

This implementation provides:
- ✅ Secure server-side JWT generation
- ✅ User identity binding
- ✅ Organization context
- ✅ Short-lived tokens
- ✅ Safe error handling
- ✅ Production-ready architecture
- ✅ Frontend integration ready

**The JWT is your runtime identity anchor for all chatbot interactions.**
