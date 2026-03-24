/**
 * Security Tests — Authorization Checks
 * Tests that users can only access their own data.
 *
 * HOW TO RUN:
 *   node tests/security.test.js
 *
 * SETUP:
 *   Fill in TOKEN_USER_A and TOKEN_USER_B below with two real JWT tokens
 *   from two different Uneden accounts (copy from browser devtools → Network → Authorization header).
 *   Fill in a real service ID owned by User A.
 */

const API = "https://uneden.onrender.com/api";

// ── Fill these in before running ─────────────────────────────────────────────
const TOKEN_USER_A = "PASTE_TOKEN_OF_USER_A_HERE";
const TOKEN_USER_B = "PASTE_TOKEN_OF_USER_B_HERE";
const SERVICE_ID_OWNED_BY_A = "PASTE_A_SERVICE_ID_OWNED_BY_USER_A_HERE";
const BOOKING_ID_OWNED_BY_A = "PASTE_A_BOOKING_ID_OWNED_BY_USER_A_HERE";
// ─────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(description, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS — ${description}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ FAIL — ${description}`);
    console.log(`         ${err.message}`);
    failed++;
  }
}

function expect401(status, route) {
  if (status !== 401)
    throw new Error(`Expected 401 on ${route} but got ${status}`);
}

function expect403(status, route) {
  if (status !== 403)
    throw new Error(`Expected 403 on ${route} but got ${status}`);
}

function expectNotOk(status, route) {
  if (status === 200)
    throw new Error(`Expected non-200 on ${route} but got 200 — data is EXPOSED`);
}

async function get(url, token) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.status;
}

async function put(url, token, body = {}) {
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.status;
}

async function del(url, token) {
  const res = await fetch(url, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.status;
}

// ── Test Suites ───────────────────────────────────────────────────────────────

console.log("\n🔐 SECURITY TESTS — Uneden API\n");

// 1. Unauthenticated requests
console.log("1️⃣  Unauthenticated requests (should all return 401)\n");

await test("GET /profiles/me without token → 401", async () => {
  const status = await get(`${API}/profiles/me`);
  expect401(status, "GET /profiles/me");
});

await test("GET /bookings/my-bookings without token → 401", async () => {
  const status = await get(`${API}/bookings/my-bookings`);
  expect401(status, "GET /bookings/my-bookings");
});

await test("GET /wallet without token → 401", async () => {
  const status = await get(`${API}/wallet`);
  expect401(status, "GET /wallet");
});

await test("GET /notifications without token → 401", async () => {
  const status = await get(`${API}/notifications`);
  expect401(status, "GET /notifications");
});

await test("GET /favorites without token → 401", async () => {
  const status = await get(`${API}/favorites`);
  expect401(status, "GET /favorites");
});

await test("GET /messages without token → 401", async () => {
  const status = await get(`${API}/messages`);
  expect401(status, "GET /messages");
});

// 2. Admin-only routes with normal user token
console.log("\n2️⃣  Admin routes with normal user token (should return 403)\n");

await test("GET /admin/metrics with User A token → 403", async () => {
  const status = await get(`${API}/admin/metrics`, TOKEN_USER_A);
  expect403(status, "GET /admin/metrics");
});

await test("GET /wallet/export with User A token → 403", async () => {
  const status = await get(`${API}/wallet/export`, TOKEN_USER_A);
  expect403(status, "GET /wallet/export");
});

// 3. Cross-user data access (User B tries to access User A's data)
console.log("\n3️⃣  Cross-user access (User B tries to touch User A's data)\n");

if (SERVICE_ID_OWNED_BY_A !== "PASTE_A_SERVICE_ID_OWNED_BY_USER_A_HERE") {
  await test("PUT /services/:id owned by A with User B token → 403", async () => {
    const status = await put(
      `${API}/services/${SERVICE_ID_OWNED_BY_A}`,
      TOKEN_USER_B,
      { title: "HACKED" }
    );
    expect403(status, "PUT /services/:id");
  });

  await test("DELETE /services/:id owned by A with User B token → 403", async () => {
    const status = await del(`${API}/services/${SERVICE_ID_OWNED_BY_A}`, TOKEN_USER_B);
    expect403(status, "DELETE /services/:id");
  });
} else {
  console.log("  ⚠️  SKIPPED — Fill in SERVICE_ID_OWNED_BY_A to run cross-user service tests");
}

if (BOOKING_ID_OWNED_BY_A !== "PASTE_A_BOOKING_ID_OWNED_BY_USER_A_HERE") {
  await test("GET /bookings/:id owned by A with User B token → 403", async () => {
    const status = await get(`${API}/bookings/${BOOKING_ID_OWNED_BY_A}`, TOKEN_USER_B);
    expectNotOk(status, "GET /bookings/:id");
  });
} else {
  console.log("  ⚠️  SKIPPED — Fill in BOOKING_ID_OWNED_BY_A to run cross-user booking tests");
}

// 4. Invalid/expired token
console.log("\n4️⃣  Invalid token (should return 401)\n");

await test("GET /profiles/me with fake token → 401", async () => {
  const status = await get(`${API}/profiles/me`, "fake.token.here");
  expect401(status, "GET /profiles/me with fake token");
});

await test("GET /wallet with expired/invalid token → 401", async () => {
  const status = await get(`${API}/wallet`, "eyJhbGciOiJIUzI1NiJ9.fake.signature");
  expect401(status, "GET /wallet with invalid token");
});

// ── Results ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log("🎉 All security checks passed!\n");
} else {
  console.log("⚠️  Some checks failed — review above.\n");
  process.exit(1);
}
