import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema/users";
import { encrypt, decrypt } from "@/lib/crypto";
import { liveOAuthService } from "@/lib/services/live-oauth.service";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function runLiveOAuthTests() {
  console.log("🧪 Starting Slice 6.1 Teacher Live OAuth & Encryption Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Test AES-256-GCM Encryption / Decryption
  console.log("1️⃣ Testing AES-256-GCM encryption & decryption helpers...");
  const samplePlaintext = "zoom_oauth_access_secret_token_!@#$1234";
  const encrypted1 = encrypt(samplePlaintext);
  const encrypted2 = encrypt(samplePlaintext);

  if (!encrypted1.includes(".") || encrypted1.split(".").length !== 3) {
    throw new Error(`❌ Encrypted string does not match iv.tag.enc format: ${encrypted1}`);
  }
  if (encrypted1 === samplePlaintext) {
    throw new Error("❌ Plaintext was not encrypted!");
  }
  if (encrypted1 === encrypted2) {
    throw new Error("❌ Encryption must produce unique ciphertexts across calls (random IV)");
  }

  const decrypted1 = decrypt(encrypted1);
  if (decrypted1 !== samplePlaintext) {
    throw new Error(`❌ Decryption failed: expected "${samplePlaintext}", got "${decrypted1}"`);
  }

  // Test tampering detection
  let tamperingDetected = false;
  try {
    const [iv, tag, enc] = encrypted1.split(".");
    const corruptedEnc = enc.substring(0, enc.length - 2) + "ff";
    decrypt(`${iv}.${tag}.${corruptedEnc}`);
  } catch (err) {
    tamperingDetected = true;
  }
  if (!tamperingDetected) {
    throw new Error("❌ Tampered ciphertext did not trigger authentication error!");
  }
  console.log("   ✅ AES-256-GCM encryption, decryption, and tampering detection verified");

  // 2. Create a test teacher in Turso
  console.log("2️⃣ Creating test teacher user in Turso DB...");
  const testUserId = `test-teacher-${runId}`;
  await db.insert(users).values({
    id: testUserId,
    email: `teacher_${runId}@example.com`,
    fullName: `Teacher Tester ${runId}`,
    role: "TEACHER",
    status: "ACTIVE",
  });

  // Verify initial integration status
  const initialStatus = await liveOAuthService.getIntegrationStatus(testUserId);
  if (initialStatus.zoom.connected || initialStatus.googleMeet.connected) {
    throw new Error("❌ Expected initial integration status to be disconnected");
  }
  console.log("   ✅ Initial status: Zoom disconnected, Google Meet disconnected");

  // 3. Test Zoom Token Persistence & Encryption at Rest
  console.log("3️⃣ Testing Zoom token persistence with AES-256-GCM encryption...");
  const rawZoomAccess = `zoom_acc_${runId}_sample_token_value`;
  const rawZoomRefresh = `zoom_ref_${runId}_refresh_token_value`;
  const zoomUserId = `zoom_user_${runId}@zoom.mock`;

  await liveOAuthService.saveZoomTokens(testUserId, {
    accessToken: rawZoomAccess,
    refreshToken: rawZoomRefresh,
    expiresIn: 3600,
    userId: zoomUserId,
  });

  // Inspect raw database record
  const dbUserAfterZoom = await db.query.users.findFirst({
    where: eq(users.id, testUserId),
  });

  if (!dbUserAfterZoom?.zoomAccessToken) {
    throw new Error("❌ zoomAccessToken was not persisted to database");
  }
  if (dbUserAfterZoom.zoomAccessToken === rawZoomAccess) {
    throw new Error("❌ CRITICAL: Raw Zoom access token was stored in plaintext!");
  }
  if (dbUserAfterZoom.zoomRefreshToken === rawZoomRefresh) {
    throw new Error("❌ CRITICAL: Raw Zoom refresh token was stored in plaintext!");
  }
  if (!dbUserAfterZoom.zoomAccessToken.includes(".")) {
    throw new Error("❌ Stored Zoom access token is not in iv.tag.enc format");
  }

  // Retrieve decrypted Zoom token
  const retrievedZoomToken = await liveOAuthService.getDecryptedZoomToken(testUserId);
  if (retrievedZoomToken !== rawZoomAccess) {
    throw new Error(`❌ Decrypted Zoom token mismatch: got "${retrievedZoomToken}"`);
  }

  const statusAfterZoom = await liveOAuthService.getIntegrationStatus(testUserId);
  if (!statusAfterZoom.zoom.connected || statusAfterZoom.zoom.email !== zoomUserId) {
    throw new Error("❌ Integration status did not reflect connected Zoom account");
  }
  console.log("   ✅ Zoom tokens successfully stored encrypted and decrypted at runtime");

  // 4. Test Google Meet Token Persistence & Encryption
  console.log("4️⃣ Testing Google Meet token persistence with AES-256-GCM encryption...");
  const rawGoogleAccess = `google_acc_${runId}_sample_token_value`;
  const rawGoogleRefresh = `mock_google_refresh_${runId}`;

  await liveOAuthService.saveGoogleTokens(testUserId, {
    accessToken: rawGoogleAccess,
    refreshToken: rawGoogleRefresh,
    expiresIn: 3600,
  });

  const dbUserAfterGoogle = await db.query.users.findFirst({
    where: eq(users.id, testUserId),
  });

  if (!dbUserAfterGoogle?.googleAccessToken) {
    throw new Error("❌ googleAccessToken was not persisted to database");
  }
  if (dbUserAfterGoogle.googleAccessToken === rawGoogleAccess) {
    throw new Error("❌ CRITICAL: Raw Google access token was stored in plaintext!");
  }

  const retrievedGoogleToken = await liveOAuthService.getDecryptedGoogleToken(testUserId);
  if (retrievedGoogleToken !== rawGoogleAccess) {
    throw new Error(`❌ Decrypted Google token mismatch: got "${retrievedGoogleToken}"`);
  }

  const statusAfterBoth = await liveOAuthService.getIntegrationStatus(testUserId);
  if (!statusAfterBoth.zoom.connected || !statusAfterBoth.googleMeet.connected) {
    throw new Error("❌ Both Zoom and Google Meet should show connected in status");
  }
  console.log("   ✅ Google Meet tokens successfully encrypted, persisted, and retrieved");

  // 5. Test Automatic Token Refresh on Expiry
  console.log("5️⃣ Testing automatic token refresh when token is expired...");
  // Manually backdate zoom token expiry to 10 minutes in the past
  const pastExpiry = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await db
    .update(users)
    .set({ zoomTokenExpiry: pastExpiry })
    .where(eq(users.id, testUserId));

  const refreshedToken = await liveOAuthService.getDecryptedZoomToken(testUserId);
  if (!refreshedToken || refreshedToken === rawZoomAccess) {
    // If mock refresh executed, new access token starts with mock_refreshed_zoom_access
    console.log(`   ~ Refreshed token returned: ${refreshedToken}`);
  }

  // Verify new expiry is in the future
  const dbUserAfterRefresh = await db.query.users.findFirst({
    where: eq(users.id, testUserId),
  });
  if (new Date(dbUserAfterRefresh!.zoomTokenExpiry!).getTime() <= Date.now()) {
    throw new Error("❌ Token expiry was not updated to future after refresh");
  }
  console.log("   ✅ Automatic token refresh triggered and new expiry updated successfully");

  // 6. Test Disconnect Operations
  console.log("6️⃣ Testing platform disconnection...");
  await liveOAuthService.disconnectZoom(testUserId);
  await liveOAuthService.disconnectGoogleMeet(testUserId);

  const statusAfterDisconnect = await liveOAuthService.getIntegrationStatus(testUserId);
  if (statusAfterDisconnect.zoom.connected || statusAfterDisconnect.googleMeet.connected) {
    throw new Error("❌ Disconnect failed to set platform status to false");
  }

  const dbUserAfterDisconnect = await db.query.users.findFirst({
    where: eq(users.id, testUserId),
  });
  if (
    dbUserAfterDisconnect?.zoomAccessToken !== null ||
    dbUserAfterDisconnect?.zoomRefreshToken !== null ||
    dbUserAfterDisconnect?.googleAccessToken !== null
  ) {
    throw new Error("❌ Disconnect did not nullify OAuth columns in users table");
  }

  let zoomErrThrown = false;
  try {
    await liveOAuthService.getDecryptedZoomToken(testUserId);
  } catch (err: any) {
    if (err.code === "ZOOM_NOT_CONNECTED") zoomErrThrown = true;
  }
  if (!zoomErrThrown) {
    throw new Error("❌ getDecryptedZoomToken should throw ZOOM_NOT_CONNECTED after disconnect");
  }

  let googleErrThrown = false;
  try {
    await liveOAuthService.getDecryptedGoogleToken(testUserId);
  } catch (err: any) {
    if (err.code === "GOOGLE_NOT_CONNECTED") googleErrThrown = true;
  }
  if (!googleErrThrown) {
    throw new Error("❌ getDecryptedGoogleToken should throw GOOGLE_NOT_CONNECTED after disconnect");
  }
  console.log("   ✅ Disconnect successfully cleared all columns and enforced disconnected state");

  // 7. Cleanup
  console.log("\n🧹 Cleaning up test user...");
  await db.delete(users).where(eq(users.id, testUserId));

  console.log("\n🎉 ALL Slice 6.1 Teacher Live OAuth & Encryption Tests PASSED Successfully!\n");
}

runLiveOAuthTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
