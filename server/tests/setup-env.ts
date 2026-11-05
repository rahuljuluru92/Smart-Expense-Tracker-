// Deterministic configuration for unit tests (validated by src/config/env.ts)
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long'
process.env.JWT_EXPIRES_IN = '1h'
