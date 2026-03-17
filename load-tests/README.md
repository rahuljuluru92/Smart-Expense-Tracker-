# Load Tests

k6 load tests for the Smart Expense Tracker API.

## Prerequisites

```bash
brew install k6          # macOS
# or
sudo apt install k6      # Ubuntu
```

## Setup

1. Start services: `docker-compose up -d`
2. Register a user and get a JWT token:
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@test.com","password":"password123"}' | jq -r '.data.token')
   ```

3. **Pre-warm Redis cache** before running Scenario A (required for 600 req/sec):
   ```bash
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/expenses
   ```

## Running Tests

**Both scenarios (Scenario A first, then Scenario B after 3.5 min):**
```bash
k6 run \
  --env BASE_URL=http://localhost:3001 \
  --env AUTH_TOKEN=$TOKEN \
  load-tests/expense-api.js
```

**Scenario A only (cache-warm read load):**
```bash
k6 run \
  --env BASE_URL=http://localhost:3001 \
  --env AUTH_TOKEN=$TOKEN \
  --scenario scenario_a \
  load-tests/expense-api.js
```

**Scenario B only (write + DB load):**
```bash
k6 run \
  --env BASE_URL=http://localhost:3001 \
  --env AUTH_TOKEN=$TOKEN \
  --scenario scenario_b \
  load-tests/expense-api.js
```

## Expected Results

### Scenario A — Cache-Warm Read Load
- **VUs**: ramps from 50 → 200
- **Target throughput**: ~600 req/sec (200 VUs × ~3 req/sec each)
- **Threshold**: P95 < 120ms ✓
- **Requirement**: Redis cache must be warm. The 120ms P95 figure applies to
  the Redis cache hit path exclusively — this is the path validated by this scenario.

### Scenario B — DB Write Load
- **VUs**: 20 constant (matches `connection_limit=20` in `DATABASE_URL`)
- **Path**: `POST /api/expenses` → PostgreSQL write → cache invalidation
- **Threshold**: P95 < 500ms ✓
- **Note**: This path hits PostgreSQL directly. 20 VUs is intentionally low to
  avoid connection pool exhaustion.

## Architecture Notes

- Scenario A proves the Redis read-through cache layer sustains 600 req/sec
- Scenario B proves the DB write path handles concurrent writes without pool exhaustion
- The two scenarios are deliberately separated — mixing reads and writes in a single
  scenario would obscure which path is under pressure
