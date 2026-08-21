import { GET } from "@/app/api/courses/route";
import { NextRequest } from "next/server";

async function runApiTests() {
  console.log("🌐 Starting GET /api/courses Integration Verification...\n");

  // 1. Basic public fetch without query params
  const req1 = new NextRequest("http://localhost:3000/api/courses");
  const res1 = await GET(req1);
  const json1 = await res1.json();
  if (res1.status !== 200 || !json1.success || !Array.isArray(json1.data)) {
    throw new Error(`FAIL: Basic fetch failed with status ${res1.status}`);
  }
  console.log(`✅ 1. GET /api/courses returned 200 with ${json1.data.length} published courses.`);

  // 2. Query with category filter
  const req2 = new NextRequest("http://localhost:3000/api/courses?category=web-development");
  const res2 = await GET(req2);
  const json2 = await res2.json();
  if (res2.status !== 200 || !json2.success) {
    throw new Error(`FAIL: Category query failed with status ${res2.status}`);
  }
  console.log(`✅ 2. GET /api/courses?category=web-development returned 200 with ${json2.data.length} items.`);

  // 3. Query with invalid sort param (should return 400 validation error)
  const req3 = new NextRequest("http://localhost:3000/api/courses?sort=invalid_sort_param");
  const res3 = await GET(req3);
  const json3 = await res3.json();
  if (res3.status !== 400 || json3.success !== false || json3.error?.code !== "VALIDATION_ERROR") {
    throw new Error(`FAIL: Expected 400 VALIDATION_ERROR for invalid sort, got ${res3.status}`);
  }
  console.log("✅ 3. GET /api/courses?sort=invalid_sort_param correctly returned 400 VALIDATION_ERROR.");

  // 4. Query with limit & cursor meta
  const req4 = new NextRequest("http://localhost:3000/api/courses?limit=2");
  const res4 = await GET(req4);
  const json4 = await res4.json();
  if (res4.status !== 200 || json4.data.length > 2 || typeof json4.meta?.hasNext !== "boolean") {
    throw new Error("FAIL: Pagination limit/meta failed");
  }
  console.log(`✅ 4. GET /api/courses?limit=2 returned 200 with hasNext=${json4.meta.hasNext}.`);

  console.log("\n🎉 ALL API INTEGRATION TESTS PASSED!\n");
}

runApiTests().catch((err) => {
  console.error("❌ API Test failed:", err);
  process.exit(1);
});
