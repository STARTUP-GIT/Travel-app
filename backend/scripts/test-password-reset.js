import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url) });

import http from "http";
import bcrypt from "bcryptjs";
import prisma from "../dist/src/db/prisma.js";
import {
  createPasswordResetToken,
  resetPassword,
  verifyResetToken,
} from "../dist/src/services/passwordReset.js";
import app from "../dist/src/app.js";

async function run() {
  console.log("===============================================================");
  console.log("   PASSWORD RESET FEATURE — COMPREHENSIVE VERIFICATION SUITE   ");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const TEST_CUSTOMER_EMAIL = `test-cust-${Date.now()}@atlaswanders-test.com`;
  const TEST_PROVIDER_EMAIL = `test-prov-${Date.now()}@atlaswanders-test.com`;
  const INITIAL_PASSWORD = "InitialPassword123!";
  const NEW_PASSWORD = "NewUpdatedPassword456!";

  let server;
  let serverPort;

  try {
    // 0. Spin up test server for HTTP API tests
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, "127.0.0.1", () => {
        serverPort = server.address().port;
        console.log(`  ℹ️ Test Express server listening on port ${serverPort}\n`);
        resolve();
      });
    });

    const API_BASE = `http://127.0.0.1:${serverPort}`;

    // ───────────────────────────────────────────────────────────────────────────
    // 1. SETUP TEST ACCOUNTS
    // ───────────────────────────────────────────────────────────────────────────
    console.log("--- 1. PREPARING TEST DATA ---");
    const initialSalt = await bcrypt.genSalt(10);
    const initialHashed = await bcrypt.hash(INITIAL_PASSWORD, initialSalt);

    const testUser = await prisma.user.create({
      data: {
        name: "Test Customer",
        username: `cust_${Date.now()}`,
        email: TEST_CUSTOMER_EMAIL,
        password: initialHashed,
        phonenumber: "+919876543210",
        authprovider: "EMAIL",
      },
    });
    assert(Boolean(testUser.id), "Customer test account created in user table");

    const testProvider = await prisma.common_guide.create({
      data: {
        full_name: "Test Guide Provider",
        username: `guide_${Date.now()}`,
        email: TEST_PROVIDER_EMAIL,
        password: initialHashed,
        phonenumber: "+919876543211",
        profile_pic: "https://example.com/pic.jpg",
        authprovider: "EMAIL",
        experience: 5,
        cost: 1500,
        language: ["English", "Kannada"],
        review: [],
      },
    });
    assert(Boolean(testProvider.id), "Service Provider test account created in common_guide table");

    // ───────────────────────────────────────────────────────────────────────────
    // 2. CUSTOMER FORGOT PASSWORD TOKEN GENERATION & SECURITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- 2. CUSTOMER PANEL PASSWORD RESET TOKEN ---");

    // Test token generation with exact email
    const { rawToken: customerRawToken } = await createPasswordResetToken(
      TEST_CUSTOMER_EMAIL,
      "customer"
    );
    assert(Boolean(customerRawToken), "Raw token generated for registered customer");
    assert(customerRawToken.length === 64, "Raw token is a 64-character hex string (32 bytes)");

    // Verify token hash is stored, NOT the raw token
    const tokenRecord = await prisma.password_reset_token.findFirst({
      where: { ownerEmail: TEST_CUSTOMER_EMAIL, panel: "customer" },
    });
    assert(Boolean(tokenRecord), "Token record persisted in password_reset_token table");
    assert(tokenRecord.tokenHash !== customerRawToken, "Raw token is NEVER stored directly in the database");
    assert(tokenRecord.tokenHash.length === 64, "Token stored as a SHA-256 hash");
    assert(tokenRecord.used === false, "New token initialized with used = false");
    assert(tokenRecord.expiresAt > new Date(), "Token has future expiration date (1 hour)");

    // Test verifyResetToken
    const isCustomerTokenValid = await verifyResetToken(customerRawToken);
    assert(isCustomerTokenValid === true, "verifyResetToken confirms raw token is valid");

    const isGarbageValid = await verifyResetToken("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef");
    assert(isGarbageValid === false, "verifyResetToken rejects random nonexistent token");

    // Test case-insensitive lookup
    const { rawToken: upperToken } = await createPasswordResetToken(
      TEST_CUSTOMER_EMAIL.toUpperCase(),
      "customer"
    );
    assert(Boolean(upperToken), "Case-insensitive email lookup succeeds for customer");

    // ───────────────────────────────────────────────────────────────────────────
    // 3. SERVICE PROVIDER PASSWORD RESET TOKEN & ISOLATION
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- 3. SERVICE PROVIDER PANEL TOKEN & PANEL ISOLATION ---");

    // Try customer panel for provider email -> must fail silently
    const { rawToken: crossToken } = await createPasswordResetToken(
      TEST_PROVIDER_EMAIL,
      "customer"
    );
    assert(crossToken === null, "Provider email requested on customer panel returns null (panel isolation)");

    // Try provider panel for provider email -> succeeds
    const { rawToken: providerRawToken } = await createPasswordResetToken(
      TEST_PROVIDER_EMAIL,
      "provider"
    );
    assert(Boolean(providerRawToken), "Raw token generated for registered service provider");

    const providerTokenRecord = await prisma.password_reset_token.findFirst({
      where: { ownerEmail: TEST_PROVIDER_EMAIL, panel: "provider" },
    });
    assert(providerTokenRecord?.panel === "provider", "Token scoped specifically to panel = 'provider'");

    // ───────────────────────────────────────────────────────────────────────────
    // 4. RESET PASSWORD EXECUTION & SINGLE-USE ENFORCEMENT
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- 4. PASSWORD RESET EXECUTION & SINGLE-USE ENFORCEMENT ---");

    const newSalt = await bcrypt.genSalt(10);
    const newHashed = await bcrypt.hash(NEW_PASSWORD, newSalt);

    // Reset customer password
    const customerResetSuccess = await resetPassword(upperToken, newHashed);
    assert(customerResetSuccess === true, "Customer password successfully updated using valid token");

    // Verify password was updated in database
    const updatedUser = await prisma.user.findUnique({
      where: { email: TEST_CUSTOMER_EMAIL },
    });
    const passwordMatches = await bcrypt.compare(NEW_PASSWORD, updatedUser.password);
    assert(passwordMatches === true, "Updated password verified with bcrypt.compare against database");

    // Single-use guarantee: Re-using the same token MUST fail
    const reusedAttempt = await resetPassword(upperToken, newHashed);
    assert(reusedAttempt === false, "Re-using the same token is rejected (single-use enforced)");

    // Token verification after use MUST return false
    const tokenValidAfterUse = await verifyResetToken(upperToken);
    assert(tokenValidAfterUse === false, "verifyResetToken returns false for already-used token");

    // Reset provider password
    const providerResetSuccess = await resetPassword(providerRawToken, newHashed);
    assert(providerResetSuccess === true, "Provider password successfully updated using valid token");

    const updatedProvider = await prisma.common_guide.findUnique({
      where: { email: TEST_PROVIDER_EMAIL },
    });
    const providerPasswordMatches = await bcrypt.compare(NEW_PASSWORD, updatedProvider.password);
    assert(providerPasswordMatches === true, "Provider password verified with bcrypt.compare against database");

    // ───────────────────────────────────────────────────────────────────────────
    // 5. EXPIRED TOKEN REJECTION
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- 5. EXPIRED TOKEN REJECTION ---");
    const { rawToken: expiredRawToken } = await createPasswordResetToken(
      TEST_CUSTOMER_EMAIL,
      "customer"
    );
    const expiredHash = (await prisma.password_reset_token.findFirst({
      where: { ownerEmail: TEST_CUSTOMER_EMAIL, used: false },
    })).tokenHash;

    // Artificially expire the token in database
    await prisma.password_reset_token.update({
      where: { tokenHash: expiredHash },
      data: { expiresAt: new Date(Date.now() - 60000) }, // 1 minute in the past
    });

    const isExpiredValid = await verifyResetToken(expiredRawToken);
    assert(isExpiredValid === false, "verifyResetToken rejects expired token");

    const expiredResetAttempt = await resetPassword(expiredRawToken, newHashed);
    assert(expiredResetAttempt === false, "resetPassword rejects expired token");

    // ───────────────────────────────────────────────────────────────────────────
    // 6. HTTP API ENDPOINTS VERIFICATION
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- 6. HTTP API ENDPOINTS VERIFICATION ---");

    // POST /api/auth/forgot-password with customer email
    const forgotRes = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_CUSTOMER_EMAIL, panel: "customer" }),
    });
    assert(forgotRes.status === 200, "POST /api/auth/forgot-password returns 200 OK");
    const forgotData = await forgotRes.json();
    assert(
      forgotData.message === "If that email address is registered with us, a reset link has been sent.",
      "Returns generic message that does not leak email existence"
    );

    // POST /api/auth/forgot-password with UNREGISTERED email -> exact same generic response
    const unregisteredRes = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent-user-12345@atlaswanders.com", panel: "customer" }),
    });
    assert(unregisteredRes.status === 200, "Unregistered email returns 200 OK (no user enumeration)");
    const unregisteredData = await unregisteredRes.json();
    assert(
      unregisteredData.message === forgotData.message,
      "Generic response matches registered response character-for-character"
    );

    // POST /api/auth/forgot-password with provider email on provider panel
    const forgotProviderRes = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_PROVIDER_EMAIL, panel: "provider" }),
    });
    assert(forgotProviderRes.status === 200, "POST /api/auth/forgot-password (panel: provider) returns 200 OK");

    // POST /api/auth/forgot-password with invalid email format -> 400 validation error
    const invalidEmailRes = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", panel: "customer" }),
    });
    assert(invalidEmailRes.status === 400, "Invalid email format rejected with 400 Validation Error");

    // GET /api/auth/verify-reset-token
    const latestTokenRecord = await prisma.password_reset_token.findFirst({
      where: { ownerEmail: TEST_CUSTOMER_EMAIL, used: false },
      orderBy: { createdAt: "desc" },
    });
    // We didn't capture raw token from HTTP request directly, but we can verify verify-reset-token with invalid token:
    const verifyBadRes = await fetch(`${API_BASE}/api/auth/verify-reset-token?token=badtoken`);
    assert(verifyBadRes.status === 400, "GET /api/auth/verify-reset-token with malformed token returns 400");

    // POST /api/auth/reset-password with short password -> 400
    const shortPassRes = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        password: "123",
      }),
    });
    assert(shortPassRes.status === 400, "Password under 6 chars rejected with 400 Validation Error");

    // POST /api/auth/reset-password with invalid token -> 400
    const invalidTokenRes = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        password: "ValidNewPassword123!",
      }),
    });
    assert(invalidTokenRes.status === 400, "Invalid/nonexistent token rejected with 400");

    // ───────────────────────────────────────────────────────────────────────────
    // 7. EXISTING SIGN-IN FUNCTIONALITY INTACT
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- 7. EXISTING SIGN-IN FLOW VERIFICATION ---");

    // Sign in with updated customer password
    const customerSignInRes = await fetch(`${API_BASE}/users/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_CUSTOMER_EMAIL, password: NEW_PASSWORD }),
    });
    assert(customerSignInRes.status === 200, "Customer successfully signs in with newly reset password");
    const customerSignInData = await customerSignInRes.json();
    assert(Boolean(customerSignInData.token), "Customer sign-in returns valid session token");

    // Sign in with old password -> MUST fail
    const oldPasswordSignInRes = await fetch(`${API_BASE}/users/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_CUSTOMER_EMAIL, password: INITIAL_PASSWORD }),
    });
    assert(oldPasswordSignInRes.status === 400, "Old password rejected after password reset");

  } finally {
    // ───────────────────────────────────────────────────────────────────────────
    // CLEANUP
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- CLEANING UP TEST DATA ---");
    try {
      await prisma.password_reset_token.deleteMany({
        where: { ownerEmail: { in: [TEST_CUSTOMER_EMAIL, TEST_PROVIDER_EMAIL] } },
      });
      await prisma.user.deleteMany({
        where: { email: TEST_CUSTOMER_EMAIL },
      });
      await prisma.common_guide.deleteMany({
        where: { email: TEST_PROVIDER_EMAIL },
      });
      console.log("  Cleaned up temporary test records.");
    } catch (cleanupErr) {
      console.error("  Cleanup warning:", cleanupErr.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log("\n===============================================================");
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================");

  await prisma.$disconnect();
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch(async (err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  await prisma.$disconnect();
  process.exit(1);
});
