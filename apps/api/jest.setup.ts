process.env.NODE_ENV = "test";
process.env.APP_SECRET = "test-secret-with-at-least-32-characters";
process.env.DATABASE_URL = "postgresql://user:password@localhost:5435/lucarne";
process.env.TEST_DATABASE_URL = "postgresql://test_user:test_password@localhost:5436/lucarne_test";
