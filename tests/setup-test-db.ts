// Runs before each integration test file is imported (see vitest.config.ts
// `setupFiles`). It only sets the env var — it must not import anything that
// would itself pull in `@/lib/prisma` before DATABASE_URL is set, otherwise
// the PrismaClient singleton would bind to the dev database instead.
process.env.DATABASE_URL = "file:./test.db";
