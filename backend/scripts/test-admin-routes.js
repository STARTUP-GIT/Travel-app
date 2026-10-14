const routes = [
  "/platform/branding",
  "/platform/logo",
  "/platform/icon",
  "/platform/seo",
  "/platform/browser-title",
  "/platform/live-preview"
];

async function checkAdminRoutes() {
  console.log("\n=== Checking Admin Panel Routes (http://localhost:3002) ===");
  for (const route of routes) {
    try {
      const res = await fetch(`http://localhost:3002${route}`, { redirect: "manual" });
      console.log(`Route ${route.padEnd(25)} -> Status ${res.status}`);
    } catch (err) {
      console.error(`Route ${route} error:`, err.message);
    }
  }
}

checkAdminRoutes();
