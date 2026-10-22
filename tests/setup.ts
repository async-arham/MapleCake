// Integration tests only run when TEST_DATABASE_URL points at a disposable database.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret-123456";
