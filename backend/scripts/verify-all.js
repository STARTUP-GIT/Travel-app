import dotenv from "dotenv";
dotenv.config({ path: new URL("../.env", import.meta.url) });

import jwt from "jsonwebtoken";

const BASE_URL = "http://localhost:8080";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET not found in environment");
  process.exit(1);
}

const adminToken = jwt.sign({ userId: "admin-test-id", role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
const userToken = jwt.sign({ userId: "user-test-id", role: "user" }, JWT_SECRET, { expiresIn: "1h" });

async function runTests() {
  console.log("=================================================================");
  console.log("   ATLASWANDERS BRANDING & ADMIN SYNC — E2E VERIFICATION SUITE   ");
  console.log("=================================================================\n");

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

  // TEST 1: Unauthorized checks
  console.log("--- 1. SECURITY & ACCESS CONTROL CHECKS ---");
  try {
    const resNoToken = await fetch(`${BASE_URL}/api/admin/branding`);
    assert(resNoToken.status === 401, "GET /api/admin/branding without token returns 401 Unauthorized");

    const resPatchNoToken = await fetch(`${BASE_URL}/api/admin/branding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandName: "Hacked" }),
    });
    assert(resPatchNoToken.status === 401, "PATCH /api/admin/branding without token returns 401 Unauthorized");

    const resPublishNoToken = await fetch(`${BASE_URL}/api/admin/branding/publish`, {
      method: "POST",
    });
    assert(resPublishNoToken.status === 401, "POST /api/admin/branding/publish without token returns 401 Unauthorized");

    const resUserRole = await fetch(`${BASE_URL}/api/admin/branding`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert(resUserRole.status === 403, "Non-admin role (user) returns 403 Forbidden");
  } catch (err) {
    console.error("Test 1 error:", err);
    failed++;
  }

  // TEST 2: Authorized Admin Fetch
  console.log("\n--- 2. ADMIN BRANDING FETCH CHECKS ---");
  let originalPublished = null;
  try {
    const res = await fetch(`${BASE_URL}/api/admin/branding`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200, "Admin can fetch branding (HTTP 200)");
    const data = await res.json();
    assert(data.published !== undefined, "Response contains 'published' brand config");
    assert(data.draft !== undefined, "Response contains 'draft' brand config");
    assert(typeof data.hasUnpublishedChanges === "boolean", "Response contains 'hasUnpublishedChanges' boolean");
    originalPublished = data.published;
    console.log(`     Current Published Brand: "${data.published.brandName}" - "${data.published.tagline}"`);
    console.log(`     Current Draft Brand: "${data.draft.brandName}" - "${data.draft.tagline}"`);
  } catch (err) {
    console.error("Test 2 error:", err);
    failed++;
  }

  // TEST 3: Draft Editing & Isolation from Public Endpoints
  console.log("\n--- 3. DRAFT MODIFICATION & PUBLIC ISOLATION CHECKS ---");
  const testDraftTagline = "Discover Places. Experience Local. (DRAFT UNPUBLISHED TEST " + Date.now() + ")";
  try {
    const patchRes = await fetch(`${BASE_URL}/api/admin/branding`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tagline: testDraftTagline,
        primaryColor: "#0B2545",
      }),
    });
    assert(patchRes.status === 200, "PATCH /api/admin/branding returns 200");
    const patchData = await patchRes.json();
    assert(patchData.draft && patchData.draft.tagline === testDraftTagline, "Draft tagline updated in database");

    // Re-verify that admin sees the new draft
    const adminCheckRes = await fetch(`${BASE_URL}/api/admin/branding`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminCheckData = await adminCheckRes.json();
    assert(adminCheckData.draft.tagline === testDraftTagline, "Admin branding returns updated draft");
    assert(adminCheckData.published.tagline !== testDraftTagline, "Admin branding published version is intact");

    // CRITICAL: Public endpoints MUST NOT return the draft!
    const publicRes = await fetch(`${BASE_URL}/api/branding`);
    assert(publicRes.status === 200, "GET /api/branding returns 200");
    const publicData = await publicRes.json();
    assert(
      publicData.tagline !== testDraftTagline,
      "CRITICAL: Public GET /api/branding does NOT expose unpublished draft!"
    );

    const clientSettingsRes = await fetch(`${BASE_URL}/api/settings`);
    assert(clientSettingsRes.status === 200, "GET /api/settings returns 200");
    const clientSettingsData = await clientSettingsRes.json();
    assert(
      clientSettingsData.tagline !== testDraftTagline,
      "Customer frontend GET /api/settings does NOT expose unpublished draft!"
    );

    const serviceSettingsRes = await fetch(`${BASE_URL}/api/service-settings`);
    assert(serviceSettingsRes.status === 200, "GET /api/service-settings returns 200");
    const serviceSettingsData = await serviceSettingsRes.json();
    assert(
      serviceSettingsData.tagline !== testDraftTagline,
      "Service provider GET /api/service-settings does NOT expose unpublished draft!"
    );
  } catch (err) {
    console.error("Test 3 error:", err);
    failed++;
  }

  // TEST 4: Publish Flow & Propagation
  console.log("\n--- 4. PUBLISHING WORKFLOW & FRONTEND SYNC CHECKS ---");
  try {
    const publishRes = await fetch(`${BASE_URL}/api/admin/branding/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(publishRes.status === 200, "POST /api/admin/branding/publish returns 200");
    const publishData = await publishRes.json();
    assert(publishData.published !== undefined, "Publish returns published record");
    assert(publishData.published.tagline === testDraftTagline, "Published data now contains new tagline");
    assert(publishData.published.publishedAt !== null, "Published record has valid publishedAt timestamp");

    // Now public endpoints MUST immediately return the newly published branding
    const publicResAfter = await fetch(`${BASE_URL}/api/branding`);
    const publicDataAfter = await publicResAfter.json();
    assert(
      publicDataAfter.tagline === testDraftTagline,
      "Public GET /api/branding immediately reflects newly published tagline!"
    );

    const clientSettingsAfter = await fetch(`${BASE_URL}/api/settings`);
    const clientDataAfter = await clientSettingsAfter.json();
    assert(
      clientDataAfter.tagline === testDraftTagline,
      "Customer frontend GET /api/settings immediately reflects newly published tagline!"
    );

    const serviceSettingsAfter = await fetch(`${BASE_URL}/api/service-settings`);
    const serviceDataAfter = await serviceSettingsAfter.json();
    assert(
      serviceDataAfter.tagline === testDraftTagline,
      "Service provider GET /api/service-settings immediately reflects newly published tagline!"
    );
  } catch (err) {
    console.error("Test 4 error:", err);
    failed++;
  }

  // TEST 5: Resetting & Publishing Official Brand Standards
  console.log("\n--- 5. OFFICIAL BRAND STANDARDS RESET & RE-VERIFICATION ---");
  const officialBranding = {
    brandName: "ATLASWANDERS",
    tagline: "Discover Places. Experience Local.",
    primaryColor: "#0B2545",
    secondaryColor: "#087E8B",
    accentColor: "#D9A441",
    primaryLogoUrl: "/brand/atlaswanders-primary.svg",
    symbolLogoUrl: "/brand/atlaswanders-symbol.svg",
    lightLogoUrl: "/brand/atlaswanders-light.svg",
    darkLogoUrl: "/brand/atlaswanders-dark.svg",
    faviconUrl: "/brand/atlaswanders-favicon.svg",
    defaultTitle: "ATLASWANDERS | Discover Places. Experience Local.",
    titleFormat: "%s | ATLASWANDERS",
    defaultMetaDescription: "Discover Places. Experience Local. ATLASWANDERS connects travellers with Karnataka's and global top destinations, verified local tour guides, authentic stays, and dining experiences.",
    openGraphTitle: "ATLASWANDERS | Discover Places. Experience Local.",
    openGraphDescription: "Global travel discovery, local tourism marketplace, and travel-services platform.",
    openGraphImageUrl: "/brand/atlaswanders-og.jpg",
    brandDescription: "Global travel discovery and local-services marketplace connecting travellers with authentic experiences.",
  };

  try {
    // 1. Update draft with official values
    await fetch(`${BASE_URL}/api/admin/branding`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(officialBranding),
    });

    // 2. Publish official values
    const finalPublishRes = await fetch(`${BASE_URL}/api/admin/branding/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(finalPublishRes.status === 200, "Official branding published successfully");

    // 3. Verify public API
    const finalPublicRes = await fetch(`${BASE_URL}/api/branding`);
    const finalPublic = await finalPublicRes.json();

    assert(finalPublic.brandName === "ATLASWANDERS", "Brand name is ATLASWANDERS");
    assert(finalPublic.tagline === "Discover Places. Experience Local.", "Tagline is official tagline");
    assert(finalPublic.primaryColor === "#0B2545", "Primary color is Deep Navy (#0B2545)");
    assert(finalPublic.secondaryColor === "#087E8B", "Secondary color is Travel Teal (#087E8B)");
    assert(finalPublic.accentColor === "#D9A441", "Accent color is Warm Gold (#D9A441)");
    assert(finalPublic.primaryLogoUrl === "/brand/atlaswanders-primary.svg", "Primary logo SVG configured");
    assert(finalPublic.symbolLogoUrl === "/brand/atlaswanders-symbol.svg", "Symbol logo SVG configured");
    assert(finalPublic.faviconUrl === "/brand/atlaswanders-favicon.svg", "Favicon SVG configured");
    assert(finalPublic.titleFormat === "%s | ATLASWANDERS", "Title template configured for dynamic pages");
    assert(finalPublic.openGraphTitle === "ATLASWANDERS | Discover Places. Experience Local.", "OG title matches");
  } catch (err) {
    console.error("Test 5 error:", err);
    failed++;
  }

  // TEST 6: Error Handling & Security Sanitization
  console.log("\n--- 6. ERROR HANDLING & SECURITY SANITIZATION CHECKS ---");
  try {
    const badReqRes = await fetch(`${BASE_URL}/api/admin/branding`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ primaryColor: 12345 }), // Invalid type
    });
    const badJson = await badReqRes.json();
    assert(badReqRes.status === 400, "Malformed data returns HTTP 400 Bad Request");
    assert(typeof badJson.message === "string" && !badJson.message.includes("<html"), "Error response is friendly JSON and does NOT contain raw HTML");
  } catch (err) {
    console.error("Test 6 error:", err);
    failed++;
  }

  console.log("\n=================================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
