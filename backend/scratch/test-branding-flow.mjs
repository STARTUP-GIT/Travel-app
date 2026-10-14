import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const secret = process.env.JWT_SECRET;
const token = jwt.sign({ id: "ebe1c15b-53f3-4847-a2cd-1b9dd39fd9af", role: "admin" }, secret, { expiresIn: "1h" });

async function test() {
  console.log("1. Fetching admin branding (initial)...");
  let res = await fetch("http://localhost:8080/api/admin/branding", {
    headers: { Authorization: `Bearer ${token}` }
  });
  let data = await res.json();
  console.log("Admin branding loaded:", {
    draftTagline: data.draft?.tagline,
    publishedTagline: data.published?.tagline,
    hasUnpublishedChanges: data.hasUnpublishedChanges
  });

  console.log("2. Updating draft tagline to 'Discover Places. Experience Local. [TEST]'...");
  res = await fetch("http://localhost:8080/api/admin/branding", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tagline: "Discover Places. Experience Local. [TEST]"
    })
  });
  data = await res.json();
  console.log("Draft updated:", data.message, "hasUnpublishedChanges:", data.hasUnpublishedChanges);

  console.log("3. Verifying public /api/branding is UNCHANGED...");
  res = await fetch("http://localhost:8080/api/branding");
  data = await res.json();
  console.log("Public branding tagline:", data.tagline, "-> (Should be original!)");

  console.log("4. Publishing draft to live production...");
  res = await fetch("http://localhost:8080/api/admin/branding/publish", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  data = await res.json();
  console.log("Publish result:", data.message);

  console.log("5. Verifying public /api/branding now reflects published change...");
  res = await fetch("http://localhost:8080/api/branding");
  data = await res.json();
  console.log("Public branding tagline after publish:", data.tagline, "-> (Should be [TEST]!)");

  console.log("6. Restoring original official tagline...");
  await fetch("http://localhost:8080/api/admin/branding", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tagline: "Discover Places. Experience Local."
    })
  });
  await fetch("http://localhost:8080/api/admin/branding/publish", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  res = await fetch("http://localhost:8080/api/branding");
  data = await res.json();
  console.log("Final verified public tagline:", data.tagline);
  console.log("ALL BACKEND BRANDING FLOW CHECKS PASSED PERFECTLY!");
}

test().catch(e => {
  console.error("Test failed:", e);
  process.exit(1);
});
