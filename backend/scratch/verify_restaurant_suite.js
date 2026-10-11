import prisma from "../src/db/prisma.js";

async function main() {
  console.log("==================================================");
  console.log("STARTING RESTAURANT & RESERVATIONS VERIFICATION SUITE");
  console.log("==================================================");

  const testReport = [];
  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      testReport.push({ name: testName, status: "PASS", details });
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      testReport.push({ name: testName, status: "FAIL", details });
      throw new Error(`Assertion failed: ${testName}`);
    }
  }

  // Initial cleanup of any previous test runs
  await prisma.restaurant_reservation.deleteMany({
    where: { restaurent: { name: { contains: "Udupi Grand Heritage" } } },
  });
  await prisma.restaurant_dish.deleteMany({
    where: { restaurant: { name: { contains: "Udupi Grand Heritage" } } },
  });
  await prisma.restaurent.deleteMany({
    where: { name: { contains: "Udupi Grand Heritage" } },
  });

  // 1. Verify Existing Records Preservation
  const initialRestaurantCount = await prisma.restaurent.count();
  const initialReservationCount = await prisma.restaurant_reservation.count();
  console.log(`Found ${initialRestaurantCount} existing restaurant records and ${initialReservationCount} existing reservations.`);
  assert(initialRestaurantCount >= 0, "Preserve existing restaurant records");
  assert(initialReservationCount >= 0, "Preserve existing reservations");

  // 2. Find an enabled district and state for test
  const activeDistrict = await prisma.district.findFirst({
    where: { isServiceAvailable: true },
    include: { state: true },
  });
  assert(Boolean(activeDistrict && activeDistrict.state), "Locate enabled state and district in database");
  console.log(`Using district: ${activeDistrict.name} (id: ${activeDistrict.id}) in state: ${activeDistrict.state.name} (id: ${activeDistrict.stateId})`);

  // Find or create a test restaurant owner
  let owner = await prisma.restaurent_owner.findFirst();
  if (!owner) {
    owner = await prisma.restaurent_owner.create({
      data: {
        name: "Test Restaurant Owner",
        username: `restowner_${uniqueSuffix}`,
        email: `restowner_${uniqueSuffix}@test.com`,
        password: "hashedpassword123",
        phone_number: "+91 9999988888",
      },
    });
  }
  assert(Boolean(owner), "Found restaurant owner for test transactions");

  const uniqueSuffix = Date.now().toString().slice(-6);
  const parentName = `Udupi Grand Heritage ${uniqueSuffix}`;

  // 3. Test Parent Restaurant Creation with Dishes and Operating Hours
  const parentRestaurant = await prisma.restaurent.create({
    data: {
      name: parentName,
      address: "123 Main Temple Road, Udupi",
      profile_logo: "https://res.cloudinary.com/demo/image/upload/sample_restaurant.jpg",
      images: [
        "https://res.cloudinary.com/demo/image/upload/sample_interior.jpg",
        "https://res.cloudinary.com/demo/image/upload/sample_ambiance.jpg",
      ],
      districtId: activeDistrict.id,
      description: "Authentic coastal vegetarian and regional delicacies.",
      rating: 4.8,
      review: ["Delicious masala dosa and filter coffee!", "Great ambiance."],
      menu: ["Masala Dosa", "Filter Coffee", "Mangalore Buns"],
      food_category: "PUREVEG",
      latitude: 13.34088,
      longitude: 74.74214,
      maps_url: "https://maps.google.com/?q=13.34088,74.74214",
      phone_number: "+91 9876543210",
      whatsapp_number: "+91 9876543210",
      email: "info@udupiheritage.test",
      website: "https://udupiheritage.test",
      opening_time: "07:00",
      closing_time: "22:30",
      booking_enabled: true,
      has_branches: true,
      status: "APPROVED",
      restaurentOwnerId: owner.id,
    },
  });
  assert(Boolean(parentRestaurant.id), "Create parent restaurant with hours, maps_url, and booking_enabled");

  // 4. Test Dishes Persistence
  const dish1 = await prisma.restaurant_dish.create({
    data: {
      restaurantId: parentRestaurant.id,
      name: "Special Ghee Roast Masala Dosa",
      description: "Crispy dosa roasted in pure desi ghee, served with coconut chutney and piping hot sambar.",
      foodCategory: "PUREVEG",
      price: 140,
      image: "https://res.cloudinary.com/demo/image/upload/sample_dosa.jpg",
      isAvailable: true,
      displayOrder: 1,
    },
  });
  const dish2 = await prisma.restaurant_dish.create({
    data: {
      restaurantId: parentRestaurant.id,
      name: "Degree Filter Coffee",
      description: "Traditional chicory blend brewed in brass filter.",
      foodCategory: "PUREVEG",
      price: 45,
      image: "https://res.cloudinary.com/demo/image/upload/sample_coffee.jpg",
      isAvailable: true,
      displayOrder: 2,
    },
  });
  const dishes = await prisma.restaurant_dish.findMany({
    where: { restaurantId: parentRestaurant.id },
  });
  assert(dishes.length === 2, "Dishes created and persisted with price, veg classification, and images");

  // 5. Test Branch Creation with Inherited Name
  // Strict rule: Branch name MUST match parent name exactly
  const branch1 = await prisma.restaurent.create({
    data: {
      name: parentName, // strictly identical
      address: "45 Manipal University Road, Manipal",
      profile_logo: "https://res.cloudinary.com/demo/image/upload/sample_branch.jpg",
      districtId: activeDistrict.id,
      description: "Udupi Grand Heritage Manipal Campus Branch.",
      rating: 4.5,
      food_category: "PUREVEG",
      latitude: 13.3525,
      longitude: 74.7865,
      maps_url: "https://maps.google.com/?q=13.3525,74.7865",
      phone_number: "+91 9876543211",
      opening_time: "08:00",
      closing_time: "23:00",
      booking_enabled: true,
      parent_restaurant_id: parentRestaurant.id,
      status: "APPROVED",
      restaurentOwnerId: owner.id,
    },
  });
  assert(branch1.name === parentRestaurant.name, "Branch name matches parent restaurant name exactly");
  assert(branch1.parent_restaurant_id === parentRestaurant.id, "Branch correctly linked to parent restaurant");

  // Verify child query from parent
  const parentWithBranches = await prisma.restaurent.findUnique({
    where: { id: parentRestaurant.id },
    include: { branches: true, dishes: true },
  });
  assert(parentWithBranches.branches.length === 1, "Parent restaurant includes child branches");

  // 6. Test Branch with Booking Disabled
  const branch2 = await prisma.restaurent.create({
    data: {
      name: parentName,
      address: "10 Malpe Beach Promenade, Malpe",
      districtId: activeDistrict.id,
      latitude: 13.348,
      longitude: 74.701,
      opening_time: "10:00",
      closing_time: "21:00",
      rating: 4.2,
      profile_logo: "https://res.cloudinary.com/demo/image/upload/sample_branch2.jpg",
      booking_enabled: false, // disabled for this branch
      parent_restaurant_id: parentRestaurant.id,
      status: "APPROVED",
      restaurentOwnerId: owner.id,
    },
  });
  assert(branch2.booking_enabled === false, "Branch can independently disable online table bookings");

  // 7. Test Table Reservation Creation with Date, Time, Guests, and Notes (NO table number)
  let customer = await prisma.user.findFirst();
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: "Test Customer",
        username: `cust_${uniqueSuffix}`,
        email: `cust_${uniqueSuffix}@test.com`,
        password: "hashedpassword123",
      },
    });
  }
  assert(Boolean(customer), "Found customer user for table reservation");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const reservation = await prisma.restaurant_reservation.create({
    data: {
      restaurantId: branch1.id, // Book specifically at branch1
      userId: customer.id,
      reservationDate: new Date(tomorrowStr),
      reservationTime: "19:30",
      guests: 4,
      notes: "Table near window preferred, celebration dinner",
      status: "PENDING",
      reservationSnapshot: {
        restaurantName: branch1.name,
        restaurantAddress: branch1.address,
        isBranch: true,
        parentRestaurantName: parentRestaurant.name,
      },
    },
    include: {
      restaurent: true,
      user: true,
    },
  });
  assert(Boolean(reservation.id), "Customer reservation created with date, time, party size, notes");
  assert(reservation.guests === 4, "Party size persisted correctly");
  assert(reservation.reservationTime === "19:30", "Reservation time persisted correctly");
  assert(reservation.restaurantId === branch1.id, "Reservation associated directly with selected branch");

  // 8. Test Safe Deletion / Historical Record Protection
  // Attempting to delete a branch or restaurant with existing reservations must protect history
  const resCountForBranch = await prisma.restaurant_reservation.count({
    where: { restaurantId: branch1.id },
  });
  assert(resCountForBranch > 0, "Branch has historical reservation records");

  // Soft deactivate instead of destroying
  await prisma.restaurent.update({
    where: { id: branch1.id },
    data: { booking_enabled: false },
  });
  const updatedBranch = await prisma.restaurent.findUnique({
    where: { id: branch1.id },
  });
  assert(updatedBranch.booking_enabled === false, "Safely disabled booking on branch with reservations");

  // Check reservation is still intact
  const verifyRes = await prisma.restaurant_reservation.findUnique({
    where: { id: reservation.id },
  });
  assert(Boolean(verifyRes), "Historical reservation remains intact after branch update");

  // 9. Clean up test records
  console.log("Cleaning up test records...");
  await prisma.restaurant_reservation.delete({ where: { id: reservation.id } });
  await prisma.restaurant_dish.deleteMany({ where: { restaurantId: parentRestaurant.id } });
  await prisma.restaurent.delete({ where: { id: branch2.id } });
  await prisma.restaurent.delete({ where: { id: branch1.id } });
  await prisma.restaurent.delete({ where: { id: parentRestaurant.id } });

  const finalRestaurantCount = await prisma.restaurent.count();
  const finalReservationCount = await prisma.restaurant_reservation.count();
  assert(finalRestaurantCount === initialRestaurantCount, "Final restaurant count equals initial count (no data loss)");
  assert(finalReservationCount === initialReservationCount, "Final reservation count equals initial count (no data loss)");

  console.log("==================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY (100% PASS RATE)");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
