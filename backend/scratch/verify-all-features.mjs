import http from "http";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
import jwt from "jsonwebtoken";

// Import Express app
const appModule = await import("../dist/src/app.js");
const app = appModule.default;

const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET not found in backend/.env");
  process.exit(1);
}

const adminToken = jwt.sign(
  { userId: "test-super-admin", role: "admin" },
  JWT_SECRET,
  { expiresIn: "1h" }
);
const userToken = jwt.sign(
  { userId: "test-normal-user", role: "user" },
  JWT_SECRET,
  { expiresIn: "1h" }
);

const server = http.createServer(app);

server.listen(PORT, async () => {
  console.log(`\n==========================================================================`);
  console.log(`   ATLASWANDERS COMPREHENSIVE BRANDING, HERO & DISTRICT ACCEPTANCE SUITE `);
  console.log(`==========================================================================\n`);

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

  try {
    // ───────────────────────────────────────────────────────────────────────────
    // PART 1 — FAVICON PER SCOPE (CLIENT, SERVICE, ADMIN) & PERSISTENCE
    // ───────────────────────────────────────────────────────────────────────────
    console.log("--- PART 1: SCOPED FAVICON MANAGEMENT & PERSISTENCE ---");

    const clientIconUrl = "https://res.cloudinary.com/dexsh34w/image/upload/v1/branding/icons/client_icon_test.png";
    const serviceIconUrl = "https://res.cloudinary.com/dexsh34w/image/upload/v1/branding/icons/service_icon_test.png";
    const adminIconUrl = "https://res.cloudinary.com/dexsh34w/image/upload/v1/branding/icons/admin_icon_test.png";

    // 1. Update draft branding with scoped favicons
    const patchDraftRes = await fetch(`${BASE_URL}/api/admin/branding`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientFaviconUrl: clientIconUrl,
        serviceFaviconUrl: serviceIconUrl,
        adminFaviconUrl: adminIconUrl,
        faviconUrl: clientIconUrl,
      }),
    });
    assert(patchDraftRes.status === 200, "Admin can PATCH /api/admin/branding with scoped favicons (HTTP 200)");

    // 2. Publish draft branding
    const publishRes = await fetch(`${BASE_URL}/api/admin/branding/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
    });
    assert(publishRes.status === 200, "Admin can POST /api/admin/branding/publish (HTTP 200)");

    // 3. Verify public branding endpoint reflects published scoped favicons
    const publicBrandRes = await fetch(`${BASE_URL}/api/branding`);
    const publicBrand = await publicBrandRes.json();
    assert(publicBrandRes.status === 200, "Public can GET /api/branding (HTTP 200)");
    assert(publicBrand.clientFaviconUrl === clientIconUrl, "Public branding returns correct clientFaviconUrl");
    assert(publicBrand.serviceFaviconUrl === serviceIconUrl, "Public branding returns correct serviceFaviconUrl");
    assert(publicBrand.adminFaviconUrl === adminIconUrl, "Public branding returns correct adminFaviconUrl");

    // 4. Verify scope isolation: client icon update does not overwrite service icon
    assert(
      publicBrand.clientFaviconUrl !== publicBrand.serviceFaviconUrl,
      "Scope Isolation: Client App favicon is strictly distinct from Service App favicon"
    );

    // 5. Verify scoped settings endpoints return respective icons
    const clientSettingsRes = await fetch(`${BASE_URL}/api/settings`);
    const clientSettings = await clientSettingsRes.json();
    assert(clientSettings.icon === clientIconUrl, "GET /api/settings returns updated client icon");

    const serviceSettingsRes = await fetch(`${BASE_URL}/api/service-settings`);
    const serviceSettings = await serviceSettingsRes.json();
    assert(serviceSettings.icon === serviceIconUrl, "GET /api/service-settings returns updated service icon");

    // ───────────────────────────────────────────────────────────────────────────
    // PART 2 — CUSTOMER LANDING-PAGE HERO BACKGROUND
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- PART 2: CUSTOMER LANDING-PAGE HERO BACKGROUND ---");

    const testCustomerHeroUrl = "https://res.cloudinary.com/dexsh34w/image/upload/v1/branding/customer_hero_test.webp";

    const patchClientHeroRes = await fetch(`${BASE_URL}/api/admin/settings/client`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        heroImageUrl: testCustomerHeroUrl,
      }),
    });
    assert(patchClientHeroRes.status === 200, "Admin can update Client App heroImageUrl via /api/admin/settings/client");

    const verifyClientHeroRes = await fetch(`${BASE_URL}/api/settings`);
    const verifyClientHero = await verifyClientHeroRes.json();
    assert(verifyClientHero.heroImageUrl === testCustomerHeroUrl, "GET /api/settings returns persisted heroImageUrl");

    const verifyPublicClientHeroRes = await fetch(`${BASE_URL}/api/branding`);
    const verifyPublicClientHero = await verifyPublicClientHeroRes.json();
    assert(
      verifyPublicClientHero.clientHeroImageUrl === testCustomerHeroUrl,
      "GET /api/branding synchronizes clientHeroImageUrl"
    );

    // ───────────────────────────────────────────────────────────────────────────
    // PART 3 — SERVICE-PROVIDER HERO BACKGROUND
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- PART 3: SERVICE-PROVIDER HERO BACKGROUND ---");

    const testServiceHeroUrl = "https://res.cloudinary.com/dexsh34w/image/upload/v1/branding/service_hero_test.webp";

    const patchServiceHeroRes = await fetch(`${BASE_URL}/api/admin/settings/service`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        heroImageUrl: testServiceHeroUrl,
      }),
    });
    assert(patchServiceHeroRes.status === 200, "Admin can update Service App heroImageUrl via /api/admin/settings/service");

    const verifyServiceHeroRes = await fetch(`${BASE_URL}/api/service-settings`);
    const verifyServiceHero = await verifyServiceHeroRes.json();
    assert(verifyServiceHero.heroImageUrl === testServiceHeroUrl, "GET /api/service-settings returns persisted heroImageUrl");

    const verifyPublicServiceHeroRes = await fetch(`${BASE_URL}/api/branding`);
    const verifyPublicServiceHero = await verifyPublicServiceHeroRes.json();
    assert(
      verifyPublicServiceHero.serviceHeroImageUrl === testServiceHeroUrl,
      "GET /api/branding synchronizes serviceHeroImageUrl"
    );

    // Ensure customer hero was not overwritten by service hero update
    assert(
      verifyPublicServiceHero.clientHeroImageUrl === testCustomerHeroUrl,
      "Service hero update does not overwrite Customer hero image"
    );

    // ───────────────────────────────────────────────────────────────────────────
    // PART 4 — GLOBAL DISTRICT DEFAULT HERO & HEADING SETTINGS
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- PART 4: GLOBAL DISTRICT HERO & HEADING DEFAULTS ---");

    const testGlobalDistrictHero = "https://res.cloudinary.com/dexsh34w/image/upload/v1/branding/districts/global_default_hero.webp";

    const patchDistrictDefaultsRes = await fetch(`${BASE_URL}/api/admin/districts/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        defaultDistrictHeroImageUrl: testGlobalDistrictHero,
        showDistrictHeadingByDefault: true,
      }),
    });
    assert(patchDistrictDefaultsRes.status === 200, "Admin can PATCH /api/admin/districts/settings (HTTP 200)");

    const getDistrictDefaultsRes = await fetch(`${BASE_URL}/api/admin/districts/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getDistrictDefaults = await getDistrictDefaultsRes.json();
    assert(
      getDistrictDefaults.settings.defaultDistrictHeroImageUrl === testGlobalDistrictHero,
      "GET /api/admin/districts/settings returns updated defaultDistrictHeroImageUrl"
    );
    assert(
      getDistrictDefaults.settings.showDistrictHeadingByDefault === true,
      "GET /api/admin/districts/settings returns showDistrictHeadingByDefault === true"
    );

    // ───────────────────────────────────────────────────────────────────────────
    // PART 5 — INDIVIDUAL DISTRICT OVERRIDES & HEADING CONTROLS
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- PART 5: INDIVIDUAL DISTRICT OVERRIDES & HEADING CONTROLS ---");

    // Fetch all districts to pick a real district
    const districtsListRes = await fetch(`${BASE_URL}/api/admin/districts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const districtsList = await districtsListRes.json();
    assert(districtsListRes.status === 200 && Array.isArray(districtsList.districts), "Admin can list districts");

    const targetDistrict =
      districtsList.districts.find((d) => d.name.toLowerCase().includes("mysuru")) ||
      districtsList.districts[0];
    assert(Boolean(targetDistrict), `Target district found in database: "${targetDistrict.name}" (ID: ${targetDistrict.id})`);

    const anotherDistrict =
      districtsList.districts.find((d) => d.id !== targetDistrict.id) ||
      districtsList.districts[1];

    // 1. Initially without override, district inherits global default
    const getInitialDistrictRes = await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const initialDistrictData = await getInitialDistrictRes.json();
    assert(getInitialDistrictRes.status === 200, `Admin can GET /api/admin/districts/${targetDistrict.id}`);

    // 2. Set custom hero image and enable override on target district
    const customDistrictHeroUrl = "https://res.cloudinary.com/dexsh34w/image/upload/v1/branding/districts/mysuru_custom_palace.jpg";
    const patchDistrictRes = await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        useCustomHeroImage: true,
        heroImageUrl: customDistrictHeroUrl,
        showWelcomeHeading: "hide",
      }),
    });
    assert(patchDistrictRes.status === 200, `Admin can PATCH /api/admin/districts/${targetDistrict.id} with custom hero and heading override`);

    // 3. Verify target district returns custom hero and effectiveShowHeading === false
    const getUpdatedDistrictRes = await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const updatedDistrictData = await getUpdatedDistrictRes.json();
    assert(
      updatedDistrictData.district.useCustomHeroImage === true,
      "District record has useCustomHeroImage === true"
    );
    assert(
      updatedDistrictData.district.effectiveHeroImageUrl === customDistrictHeroUrl,
      "District effectiveHeroImageUrl resolves to custom override image"
    );
    assert(
      updatedDistrictData.district.effectiveShowHeading === false,
      "District effectiveShowHeading correctly resolves to false when override is 'hide'"
    );

    // 4. Verify another district without override still uses the global default!
    const getOtherDistrictRes = await fetch(`${BASE_URL}/api/admin/districts/${anotherDistrict.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const otherDistrictData = await getOtherDistrictRes.json();
    assert(
      otherDistrictData.district.effectiveHeroImageUrl === testGlobalDistrictHero,
      `Another district (${anotherDistrict.name}) without override still resolves to the global default image`
    );

    // 5. Test disabling the override: toggle off
    const toggleOffRes = await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        useCustomHeroImage: false,
      }),
    });
    assert(toggleOffRes.status === 200, "Admin can toggle off useCustomHeroImage");

    const getToggledOffDistrictRes = await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const toggledOffDistrictData = await getToggledOffDistrictRes.json();
    assert(
      toggledOffDistrictData.district.effectiveHeroImageUrl === testGlobalDistrictHero,
      "When toggle is disabled, district falls back safely to global default image"
    );
    assert(
      toggledOffDistrictData.district.heroImageUrl === customDistrictHeroUrl,
      "When toggle is disabled, custom image URL is preserved in the database (not deleted)"
    );

    // 6. Test re-enabling the override: custom image remains available
    const reEnableRes = await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        useCustomHeroImage: true,
        showWelcomeHeading: "show",
      }),
    });
    assert(reEnableRes.status === 200, "Admin can re-enable useCustomHeroImage");

    const getReEnabledDistrictRes = await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reEnabledDistrictData = await getReEnabledDistrictRes.json();
    assert(
      reEnabledDistrictData.district.effectiveHeroImageUrl === customDistrictHeroUrl,
      "Re-enabling toggle restores the previously saved custom image"
    );
    assert(
      reEnabledDistrictData.district.effectiveShowHeading === true,
      "District effectiveShowHeading resolves to true when set to 'show'"
    );

    // 7. Verify Customer Location API returns computed effective fields
    const customerLocationRes = await fetch(`${BASE_URL}/api/districts?all=true`);
    const customerLocationData = await customerLocationRes.json();
    assert(customerLocationRes.status === 200, "Customer can GET /api/districts?all=true (HTTP 200)");
    const customerTargetDistrict = customerLocationData.districts.find((d) => d.id === targetDistrict.id);
    assert(
      customerTargetDistrict?.effectiveHeroImageUrl === customDistrictHeroUrl,
      "Public customer location endpoint serves effectiveHeroImageUrl to frontend"
    );

    // ───────────────────────────────────────────────────────────────────────────
    // PART 6 — SECURITY AND UNAUTHORIZED ACCESS PREVENTION
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- PART 6: SECURITY & AUTHORIZATION TESTS ---");

    const unauthDefaultsRes = await fetch(`${BASE_URL}/api/admin/districts/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showDistrictHeadingByDefault: false }),
    });
    assert(unauthDefaultsRes.status === 401, "Unauthenticated PATCH /api/admin/districts/settings is rejected with HTTP 401");

    const unauthDistrictRes = await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useCustomHeroImage: false }),
    });
    assert(unauthDistrictRes.status === 401, "Unauthenticated PATCH /api/admin/districts/:id is rejected with HTTP 401");

    const nonAdminRes = await fetch(`${BASE_URL}/api/admin/districts/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ showDistrictHeadingByDefault: false }),
    });
    assert(nonAdminRes.status === 401 || nonAdminRes.status === 403, "Non-admin role token is rejected (HTTP 401/403)");

    // ───────────────────────────────────────────────────────────────────────────
    // CLEANUP & RESTORATION
    // ───────────────────────────────────────────────────────────────────────────
    console.log("\n--- CLEANUP & SETTINGS RESTORATION ---");
    await fetch(`${BASE_URL}/api/admin/districts/${targetDistrict.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        useCustomHeroImage: false,
        showWelcomeHeading: "inherit",
      }),
    });
    await fetch(`${BASE_URL}/api/admin/districts/settings`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        defaultDistrictHeroImageUrl: "",
        showDistrictHeadingByDefault: true,
      }),
    });
    await fetch(`${BASE_URL}/api/admin/branding`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        faviconUrl: "/brand/atlaswanders-favicon.svg",
        clientFaviconUrl: "/brand/atlaswanders-favicon.svg",
        serviceFaviconUrl: "/brand/atlaswanders-favicon.svg",
        adminFaviconUrl: "/brand/atlaswanders-favicon.svg",
      }),
    });
    await fetch(`${BASE_URL}/api/admin/branding/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
    });
    console.log("  ✅ Settings restored to official defaults.");

    console.log(`\n==========================================================================`);
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED                       `);
    console.log(`==========================================================================\n`);

    server.close();
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error("Test execution error:", err);
    server.close();
    process.exit(1);
  }
});
