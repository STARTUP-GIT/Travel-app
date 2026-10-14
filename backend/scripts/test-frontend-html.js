async function check(name, url) {
  try {
    const res = await fetch(url);
    console.log(`\n=== Testing ${name} (${url}) ===`);
    console.log("HTTP Status:", res.status);
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    console.log("Rendered Page Title:", titleMatch ? titleMatch[1] : "N/A");
    console.log("Includes Brand Name 'ATLASWANDERS':", html.includes("ATLASWANDERS"));
    console.log("Includes Tagline 'Discover Places. Experience Local.':", html.includes("Discover Places. Experience Local."));
  } catch (err) {
    console.error(`Error testing ${name}:`, err.message);
  }
}

async function run() {
  await check("Customer Frontend", "http://localhost:3000");
  await check("Service Provider Frontend", "http://localhost:3001");
}

run();
