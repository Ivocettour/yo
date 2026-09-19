import "dotenv/config";

// Secreto fijo para los tests de sesion.
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret";
