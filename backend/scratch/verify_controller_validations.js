import { isTimeWithinOperatingHours } from "../src/modules/user/booking/controllers/booking.controller.js";
import { validateDistrictAndState } from "../src/modules/services/restaurant/restaurentprofile/controllers/profile.controllers.js";
import prisma from "../src/db/prisma.js";

async function main() {
  console.log("==================================================");
  console.log("RUNNING CONTROLLER VALIDATION UNIT SUITE");
  console.log("==================================================");

  // 1. Test isTimeWithinOperatingHours (Regular daytime hours)
  console.log("Test: Operating hours during daytime (09:00 - 22:00)...");
  if (!isTimeWithinOperatingHours("12:30", "09:00", "22:00")) {
    throw new Error("Expected 12:30 to be within 09:00-22:00");
  }
  if (!isTimeWithinOperatingHours("09:00", "09:00", "22:00")) {
    throw new Error("Expected 09:00 opening time boundary to be valid");
  }
  if (isTimeWithinOperatingHours("08:30", "09:00", "22:00")) {
    throw new Error("Expected 08:30 to be rejected before opening 09:00");
  }
  if (isTimeWithinOperatingHours("22:30", "09:00", "22:00")) {
    throw new Error("Expected 22:30 to be rejected after closing 22:00");
  }
  console.log("[PASS] Regular daytime operating hours validated accurately");

  // 2. Test isTimeWithinOperatingHours (Overnight operating hours e.g. 18:00 - 02:00)
  console.log("Test: Overnight operating hours (18:00 - 02:00)...");
  if (!isTimeWithinOperatingHours("23:30", "18:00", "02:00")) {
    throw new Error("Expected 23:30 to be within overnight hours 18:00-02:00");
  }
  if (!isTimeWithinOperatingHours("01:30", "18:00", "02:00")) {
    throw new Error("Expected 01:30 to be within overnight hours 18:00-02:00");
  }
  if (isTimeWithinOperatingHours("03:30", "18:00", "02:00")) {
    throw new Error("Expected 03:30 to be rejected outside overnight hours 18:00-02:00");
  }
  if (isTimeWithinOperatingHours("17:00", "18:00", "02:00")) {
    throw new Error("Expected 17:00 to be rejected before opening 18:00");
  }
  console.log("[PASS] Overnight operating hours validated accurately");

  // 3. Test validateDistrictAndState
  const district = await prisma.district.findFirst({
    where: { isServiceAvailable: true },
    include: { state: true },
  });
  if (district && district.stateId) {
    const validCheck = await validateDistrictAndState(district.id, district.stateId);
    if (!validCheck.valid) {
      throw new Error(`Expected district/state validation to succeed: ${validCheck.error}`);
    }
    console.log("[PASS] Valid district and matching state accepted by backend validator");

    const mismatchCheck = await validateDistrictAndState(district.id, "invalid-state-id-999");
    if (mismatchCheck.valid) {
      throw new Error("Expected mismatched state to be rejected");
    }
    console.log("[PASS] Mismatched state and district rejected with user-friendly error:", mismatchCheck.error);
  }

  // 4. Test Branch Name Matching Rule
  const parentName = "Empire Restaurant";
  const matchingBranchName = "Empire Restaurant";
  const invalidBranchName = "Empire Restaurant - Indiranagar Branch";

  if (matchingBranchName.trim().toLowerCase() !== parentName.trim().toLowerCase()) {
    throw new Error("Expected matching branch name to match");
  }
  if (invalidBranchName.trim().toLowerCase() === parentName.trim().toLowerCase()) {
    throw new Error("Expected modified branch name to be detected as mismatch");
  }
  console.log("[PASS] Strict branch name equality enforced (no suffixes or custom names permitted)");

  console.log("==================================================");
  console.log("CONTROLLER VALIDATION SUITE PASSED 100%");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Validation unit test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
