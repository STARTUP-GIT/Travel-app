import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";

const BASE_URL = "http://localhost:8080";
const JWT_SECRET = process.env.JWT_SECRET;
const adminToken = jwt.sign({ userId: "admin-test-id", role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

async function test() {
  console.log("=== Testing GET /api/admin/settings/client ===");
  const r1 = await fetch(`${BASE_URL}/api/admin/settings/client`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log("Status:", r1.status);
  console.log("Body:", await r1.json());

  console.log("\n=== Testing GET /api/admin/settings/service ===");
  const r2 = await fetch(`${BASE_URL}/api/admin/settings/service`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log("Status:", r2.status);
  console.log("Body:", await r2.json());

  console.log("\n=== Testing GET /api/settings (Public Client) ===");
  const r3 = await fetch(`${BASE_URL}/api/settings`);
  console.log("Status:", r3.status);
  console.log("Body:", await r3.json());

  console.log("\n=== Testing GET /api/service-settings (Public Service) ===");
  const r4 = await fetch(`${BASE_URL}/api/service-settings`);
  console.log("Status:", r4.status);
  console.log("Body:", await r4.json());
}

test();
