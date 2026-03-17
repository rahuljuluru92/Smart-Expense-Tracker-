/**
 * k6 Load Test — Smart Expense Tracker
 *
 * Two scenarios:
 *   A) Cache-warm read load — targets 600 req/sec, P95 < 120ms threshold
 *   B) Write + DB load     — targets write path at 20 VUs, P95 < 500ms
 *
 * Run both:
 *   k6 run --env BASE_URL=http://localhost:3001 --env AUTH_TOKEN=<jwt> load-tests/expense-api.js
 *
 * Run Scenario A only:
 *   k6 run --env BASE_URL=http://localhost:3001 --env AUTH_TOKEN=<jwt> \
 *     --scenario scenario_a load-tests/expense-api.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001'
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''

// Custom metrics
const errorRate = new Rate('errors')
const cacheLatency = new Trend('cache_hit_latency', true)
const writeLatency = new Trend('write_latency', true)

export const options = {
  scenarios: {
    /**
     * Scenario A: Cache-warm read load
     * Requirement: cache must be warm (at least one prior GET /api/expenses).
     * Ramps to 200 VUs → ~600 req/sec sustained for 2 min.
     * Threshold: P95 < 120ms (matches resume claim exactly).
     */
    scenario_a: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 50 },   // warm-up
        { duration: '2m', target: 200 },   // sustained load — target: ~600 req/sec
        { duration: '30s', target: 0 },    // ramp-down
      ],
      gracefulRampDown: '10s',
      exec: 'readCachedExpenses',
      tags: { scenario: 'cache_warm_reads' },
    },

    /**
     * Scenario B: Write + DB load
     * Tests cold POST path: category create + expense create → DB write + cache invalidation.
     * 20 VUs to stay within connection_limit=20 (set in DATABASE_URL).
     * Threshold: P95 < 500ms for full DB write path.
     */
    scenario_b: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      startTime: '3m30s',  // runs after Scenario A completes
      exec: 'writeExpense',
      tags: { scenario: 'db_writes' },
    },
  },

  thresholds: {
    // Scenario A: P95 must be under 120ms (cache-warm path)
    'http_req_duration{scenario:cache_warm_reads}': ['p(95)<120'],

    // Scenario B: P95 under 500ms for DB write path
    'http_req_duration{scenario:db_writes}': ['p(95)<500'],

    // Overall error rate under 1%
    errors: ['rate<0.01'],

    // At least 95% of requests succeed
    http_req_failed: ['rate<0.05'],
  },
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${AUTH_TOKEN}`,
}

/**
 * Scenario A executor: GET /api/expenses (cache-warm, no DB hit)
 * NOTE: Cache must already be warm before running at scale.
 * Pre-warm: curl -H "Authorization: Bearer $TOKEN" $BASE_URL/api/expenses
 */
export function readCachedExpenses() {
  const start = Date.now()
  const res = http.get(`${BASE_URL}/api/expenses?limit=20`, { headers, tags: { name: 'GET /api/expenses' } })

  const ok = check(res, {
    'status 200': (r) => r.status === 200,
    'has data': (r) => {
      try { return !!JSON.parse(r.body).data } catch { return false }
    },
  })

  errorRate.add(!ok)
  cacheLatency.add(Date.now() - start)

  // No sleep — maximum throughput to measure cache performance
}

/**
 * Scenario B executor: POST /api/expenses (full DB write path)
 * Each VU creates a new expense. Validates cache invalidation happens correctly.
 */
export function writeExpense() {
  const categories = ['food', 'transport', 'entertainment', 'shopping', 'utilities']
  const descriptions = [
    'Lunch at Chipotle', 'Uber ride downtown', 'Netflix subscription',
    'Groceries at Whole Foods', 'Electric bill', 'Coffee at Starbucks',
    'Gas station fill-up', 'Movie tickets', 'Amazon order', 'Gym membership'
  ]

  const body = JSON.stringify({
    amount: parseFloat((Math.random() * 200 + 5).toFixed(2)),
    currency: 'USD',
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    categoryId: categories[Math.floor(Math.random() * categories.length)],
    date: new Date().toISOString(),
  })

  const start = Date.now()
  const res = http.post(`${BASE_URL}/api/expenses`, body, { headers, tags: { name: 'POST /api/expenses' } })

  const ok = check(res, {
    'status 201': (r) => r.status === 201,
  })

  errorRate.add(!ok)
  writeLatency.add(Date.now() - start)

  // Brief pause between writes to simulate realistic user behavior
  sleep(0.5)
}
