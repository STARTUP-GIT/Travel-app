import dotenv from "dotenv";
dotenv.config();

import prisma from "../dist/src/db/prisma.js";

async function main() {
  const configs = await prisma.app_config.findMany();
  console.log("=== APP_CONFIG ROWS ===");
  console.log(JSON.stringify(configs, null, 2));

  const brands = await prisma.brand_config.findMany();
  console.log("\n=== BRAND_CONFIG ROWS ===");
  console.log(JSON.stringify(brands, null, 2));
}

main().finally(() => prisma.$disconnect());
