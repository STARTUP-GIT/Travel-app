import path from "path";
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });

import jwt from "jsonwebtoken";

const BASE_URL = "http://localhost:8080";
const CLIENT_WEB_URL = "http://localhost:3000";
const SERVICE_WEB_URL = "http://localhost:3001";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET not found in environment");
  process.exit(1);
}

const adminToken = jwt.sign({ userId: "admin-master-test", role: "admin" }, JWT_SECRET, { expiresIn: "1h" });
const userToken = jwt.sign({ userId: "user-unauthorized", role: "user" }, JWT_SECRET, { expiresIn: "1h" });

async function run() {
  console.log("==========================================================================");
  console.log("   ATLASWANDERS MANDATORY ACCEPTANCE TEST SUITE (TESTS A THROUGH F)       ");
  console.log("==========================================================================\n");

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

  function htmlContains(html, text) {
    if (!text) return true;
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return html.includes(text) || html.includes(escaped);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST A — CLIENT APP TEXT
  // ───────────────────────────────────────────────────────────────────────────
  console.log("--- TEST A: CLIENT APP TEXT UPDATES & SYNC ---");
  const testClientName = "ATLASWANDERS Discovery " + Date.now();
  const testClientTitle = "ATLASWANDERS | Discover Incredible India & Beyond";
  const testClientTagline = "Discover Places. Experience Local. Authentic Journeys.";
  const testClientDesc = "Explore handpicked destinations, local guides, multi-stop itineraries and hotels across Karnataka.";

  try {
    // 1. Save Client App settings via admin API
    const patchRes = await fetch(`${BASE_URL}/api/admin/settings/client`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_name: testClientName,
        webTitle: testClientTitle,
        text: testClientTagline,
        app_description: testClientDesc,
      }),
    });
    assert(patchRes.status === 200, "Admin can PATCH /api/admin/settings/client (HTTP 200)");

    // 2. Refresh / reload admin settings from backend
    const getAdminRes = await fetch(`${BASE_URL}/api/admin/settings/client`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminData = await getAdminRes.json();
    assert(adminData.settings.app_name === testClientName, "Saved app_name persists in database for Client scope");
    assert(adminData.settings.webTitle === testClientTitle, "Saved webTitle persists in database for Client scope");
    assert(adminData.settings.text === testClientTagline, "Saved tagline (text) persists in database for Client scope");

    // 3. Verify public Client App configuration (/api/settings)
    const pubRes = await fetch(`${BASE_URL}/api/settings`);
    const pubData = await pubRes.json();
    assert(pubData.app_name === testClientName, "Public /api/settings serves saved Client app_name");
    assert(pubData.webTitle === testClientTitle, "Public /api/settings serves saved Client webTitle");
    assert(pubData.tagline === testClientTagline, "Public /api/settings serves saved Client tagline");
    assert(pubData.app_description === testClientDesc, "Public /api/settings serves saved Client app_description");

    // 4. Verify rendered customer web frontend HTML
    const webRes = await fetch(CLIENT_WEB_URL);
    const webHtml = await webRes.text();
    assert(webRes.status === 200, "Customer web frontend returns HTTP 200");
    assert(htmlContains(webHtml, testClientName), "Customer web frontend renders updated app name");
    assert(htmlContains(webHtml, testClientTitle), "Customer web frontend renders updated web title");
    assert(htmlContains(webHtml, testClientTagline), "Customer web frontend renders updated tagline without truncation");
  } catch (err) {
    console.error("Test A Error:", err);
    failed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST B — SERVICE APP TEXT
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST B: SERVICE APP TEXT UPDATES & SYNC ---");
  const testServiceName = "ATLASWANDERS Partner Portal " + Date.now();
  const testServiceTitle = "ATLASWANDERS | Guides & Hotel Owners Hub";
  const testServiceTagline = "Empowering Local Guides & Hospitality Partners Worldwide";
  const testServiceDesc = "Manage tour bookings, guest reservations, availability calendar, and payout preferences seamlessly.";

  try {
    // 1. Save Service App settings via admin API
    const patchRes = await fetch(`${BASE_URL}/api/admin/settings/service`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_name: testServiceName,
        webTitle: testServiceTitle,
        text: testServiceTagline,
        app_description: testServiceDesc,
      }),
    });
    assert(patchRes.status === 200, "Admin can PATCH /api/admin/settings/service (HTTP 200)");

    // 2. Refresh / reload admin settings from backend
    const getAdminRes = await fetch(`${BASE_URL}/api/admin/settings/service`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminData = await getAdminRes.json();
    assert(adminData.settings.app_name === testServiceName, "Saved app_name persists in database for Service scope");
    assert(adminData.settings.webTitle === testServiceTitle, "Saved webTitle persists in database for Service scope");
    assert(adminData.settings.text === testServiceTagline, "Saved tagline persists in database for Service scope");

    // 3. Verify public Service App configuration (/api/service-settings)
    const pubRes = await fetch(`${BASE_URL}/api/service-settings`);
    const pubData = await pubRes.json();
    assert(pubData.app_name === testServiceName, "Public /api/service-settings serves saved Service app_name");
    assert(pubData.webTitle === testServiceTitle, "Public /api/service-settings serves saved Service webTitle");
    assert(pubData.tagline === testServiceTagline, "Public /api/service-settings serves saved Service tagline");
    assert(pubData.app_description === testServiceDesc, "Public /api/service-settings serves saved Service app_description");

    // 4. Verify rendered service-provider web frontend HTML
    const webRes = await fetch(SERVICE_WEB_URL);
    const webHtml = await webRes.text();
    assert(webRes.status === 200, "Service-provider web frontend returns HTTP 200");
    assert(htmlContains(webHtml, testServiceName), "Service-provider web frontend renders updated provider app name");
    assert(htmlContains(webHtml, testServiceTagline), "Service-provider web frontend renders updated provider tagline without truncation");
  } catch (err) {
    console.error("Test B Error:", err);
    failed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST C — SCOPE ISOLATION (ZERO CROSS-APPLICATION CONTAMINATION)
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST C: SCOPE ISOLATION CHECKS ---");
  try {
    const pubClient = await (await fetch(`${BASE_URL}/api/settings`)).json();
    const pubService = await (await fetch(`${BASE_URL}/api/service-settings`)).json();

    assert(pubClient.app_name !== pubService.app_name, "Client app_name and Service app_name are distinct and isolated");
    assert(pubClient.tagline !== pubService.tagline, "Client tagline and Service tagline are distinct and isolated");
    assert(pubClient.webTitle !== pubService.webTitle, "Client webTitle and Service webTitle are distinct and isolated");
    assert(pubClient.app_description !== pubService.app_description, "Client app_description and Service app_description are isolated");

    // Changing Client tagline must NOT change Service tagline
    const newClientTagline = "Unique Client Tagline " + Date.now();
    await fetch(`${BASE_URL}/api/admin/settings/client`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: newClientTagline }),
    });

    const verifyServiceAfterClientEdit = await (await fetch(`${BASE_URL}/api/service-settings`)).json();
    assert(
      verifyServiceAfterClientEdit.tagline === testServiceTagline,
      "CRITICAL: Changing Client App tagline did NOT alter Service App tagline!"
    );

    // Changing Service tagline must NOT change Client tagline
    const newServiceTagline = "Unique Service Tagline " + Date.now();
    await fetch(`${BASE_URL}/api/admin/settings/service`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: newServiceTagline }),
    });

    const verifyClientAfterServiceEdit = await (await fetch(`${BASE_URL}/api/settings`)).json();
    assert(
      verifyClientAfterServiceEdit.tagline === newClientTagline,
      "CRITICAL: Changing Service App tagline did NOT alter Client App tagline!"
    );
  } catch (err) {
    console.error("Test C Error:", err);
    failed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST D — LOGO & ICON INDEPENDENT SYNCHRONIZATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST D: LOGO & ICON INDEPENDENT SYNCHRONIZATION ---");
  const clientIconAsset = "/brand/client-custom-icon-" + Date.now() + ".svg";
  const serviceIconAsset = "/brand/service-custom-icon-" + Date.now() + ".svg";

  try {
    // 1. Upload/save icon for Client App
    await fetch(`${BASE_URL}/api/admin/settings/client`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ icon: clientIconAsset }),
    });

    const clientConf = await (await fetch(`${BASE_URL}/api/settings`)).json();
    assert(clientConf.icon === clientIconAsset, "Client App public settings return new Client icon asset");

    // 2. Upload/save icon for Service App
    await fetch(`${BASE_URL}/api/admin/settings/service`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ icon: serviceIconAsset }),
    });

    const serviceConf = await (await fetch(`${BASE_URL}/api/service-settings`)).json();
    assert(serviceConf.icon === serviceIconAsset, "Service App public settings return new Service icon asset");
    assert(serviceConf.icon !== clientConf.icon, "Client icon and Service icon remain completely independent");

    // Re-check Client icon was not replaced by Service icon edit
    const clientConfRecheck = await (await fetch(`${BASE_URL}/api/settings`)).json();
    assert(clientConfRecheck.icon === clientIconAsset, "Client icon was preserved when Service icon changed");
  } catch (err) {
    console.error("Test D Error:", err);
    failed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST E — PERSISTENCE & CACHING
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST E: PERSISTENCE & CACHE FRESHNESS ---");
  try {
    // Refresh admin settings repeatedly to verify database durability
    const r1 = await (await fetch(`${BASE_URL}/api/admin/settings/client`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    const r2 = await (await fetch(`${BASE_URL}/api/admin/settings/service`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();

    assert(r1.settings.icon === clientIconAsset, "Client settings persist across fresh read requests");
    assert(r2.settings.icon === serviceIconAsset, "Service settings persist across fresh read requests");

    // Reset official production assets
    const officialIcon = "/brand/atlaswanders-favicon.svg";
    const officialClientName = "ATLASWANDERS";
    const officialClientTagline = "Discover Places. Experience Local.";
    const officialServiceName = "ATLASWANDERS Service";
    const officialServiceTagline = "Partner & Service Provider Portal";

    await fetch(`${BASE_URL}/api/admin/settings/client`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        app_name: officialClientName,
        webTitle: "ATLASWANDERS | Discover Places. Experience Local.",
        text: officialClientTagline,
        icon: officialIcon,
      }),
    });

    await fetch(`${BASE_URL}/api/admin/settings/service`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        app_name: officialServiceName,
        webTitle: "Atlas Wanders | Service Portal",
        text: officialServiceTagline,
        icon: officialIcon,
      }),
    });

    const resetClient = await (await fetch(`${BASE_URL}/api/settings`)).json();
    const resetService = await (await fetch(`${BASE_URL}/api/service-settings`)).json();

    assert(resetClient.app_name === officialClientName, "Official Client app name restored");
    assert(resetClient.tagline === officialClientTagline, "Official Client tagline restored");
    assert(resetService.app_name === officialServiceName, "Official Service app name restored");
    assert(resetService.tagline === officialServiceTagline, "Official Service tagline restored");
  } catch (err) {
    console.error("Test E Error:", err);
    failed++;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST F — SECURITY & ERROR SANITIZATION
  // ───────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST F: SECURITY & ERROR SANITIZATION ---");
  try {
    const unauthClient = await fetch(`${BASE_URL}/api/admin/settings/client`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_name: "Hacked" }),
    });
    assert(unauthClient.status === 401, "Unauthenticated PATCH /api/admin/settings/client rejected with 401 Unauthorized");

    const unauthService = await fetch(`${BASE_URL}/api/admin/settings/service`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_name: "Hacked" }),
    });
    assert(unauthService.status === 401, "Unauthenticated PATCH /api/admin/settings/service rejected with 401 Unauthorized");

    const nonAdminRole = await fetch(`${BASE_URL}/api/admin/settings/client`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${userToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ app_name: "Hacked" }),
    });
    assert(nonAdminRole.status === 403, "Non-admin role (user) rejected with 403 Forbidden");

    // Verify public endpoints do not expose secrets or admin passwords
    const publicData = await (await fetch(`${BASE_URL}/api/settings`)).json();
    assert(publicData.password === undefined, "Public endpoint does not expose passwords");
    assert(publicData.admin === undefined, "Public endpoint does not expose admin details");
  } catch (err) {
    console.error("Test F Error:", err);
    failed++;
  }

  console.log("\n==========================================================================");
  console.log(`MANDATORY TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==========================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run();
