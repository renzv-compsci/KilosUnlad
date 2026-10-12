/**
 * test_int02_submission.js
 * Real-data integration test for INT-02: Task Submission Mounting.
 * 
 * Prerequisites: 
 * 1. Docker containers are running (db, server, ml-service).
 * 2. reset-demo.sh has been run, and the manual DB patch applied 
 *    to set DEMO-4PS-GRAD-0001 to FLAGGED_FOR_REVIEW.
 * 3. npm install axios form-data has been run in this directory.
 */

const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000/api/v1';
// Use director_test for dispatch as they have the exact matching jurisdiction (Region IV-A)
const DIRECTOR_CREDS = { username: 'director_test', password: 'DirectorTest2026!' }; 
const WORKER_CREDS = { username: 'case_worker_test', password: 'CaseWorkerTest2026!' };
const TARGET_HOUSEHOLD = 'DEMO-4PS-GRAD-0001';

// Helper to generate a real SHA-256 hash of a file buffer
function hashFileBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function runTest() {
  console.log('[START] INT-02 Real Data Integration Test\n');

  try {
    // 1. Director Login
    console.log('[1] Logging in as REGIONAL_DIRECTOR...');
    const directorRes = await axios.post(`${BASE_URL}/auth/login`, DIRECTOR_CREDS);
    const directorToken = directorRes.data.access_token;

    // 2. Worker Login
    console.log('[2] Logging in as CASE_WORKER...');
    const workerRes = await axios.post(`${BASE_URL}/auth/login`, WORKER_CREDS);
    const workerToken = workerRes.data.access_token;
    
    // Extract the user ID from the nested user object
    const workerId = workerRes.data.user.user_id || workerRes.data.user_id;
    if (!workerId) {
      console.error('[ERROR] Could not find Worker ID in login response!');
      console.log('Full Response Data:', JSON.stringify(workerRes.data, null, 2));
      process.exit(1);
    }
    console.log(`   [OK] Worker ID extracted: ${workerId}\n`);

    // 3. Director Dispatches Task
    console.log(`[3] Dispatching task for ${TARGET_HOUSEHOLD} to worker ${workerId}...`);
    const dispatchRes = await axios.post(`${BASE_URL}/tasks/dispatch`, {
      household_id: TARGET_HOUSEHOLD,
      assigned_worker_id: workerId,
      assignment_notes: 'INT-02 Integration Test: Verify MoveIt asset and LandBank card.',
      priority: 'HIGH',
      due_date: '2026-10-24T23:59:59.000Z'
    }, { headers: { Authorization: `Bearer ${directorToken}` } });
    
    const taskId = dispatchRes.data.task_id;
    console.log(`   [OK] Task dispatched: ${taskId}\n`);

    // 4. Prepare Multipart Submission
    console.log('[4] Preparing multipart submission with real file hash and geofence coords...');
    
    // Create a dummy 1x1 pixel PNG in memory to simulate a real photo
    const dummyImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const realSha256Hash = hashFileBuffer(dummyImageBuffer);
    
    const form = new FormData();
    form.append('task_id', taskId);
    form.append('household_id', TARGET_HOUSEHOLD);
    form.append('verified_swdi_level', 3); // Matches Demo Case A
    form.append('worker_recommendation', 'RECOMMEND_GRADUATION');
    form.append('narrative_report', 'Verified: Motorcycle is used for MoveIt delivery. LandBank card is in physical possession of the mother.');
    form.append('livelihood_asset_verification', JSON.stringify({
      is_motorcycle_present: true,
      is_productive_asset: true,
      proof_type: 'MOVEIT',
      franchise_number: ''
    }));
    form.append('landbank_card_inspection', JSON.stringify({
      physical_card_presented: true,
      card_matches_beneficiary: true,
      pawning_suspected: false
    }));
    form.append('client_geolocation', JSON.stringify({
      latitude: 14.2110, // Calamba, Laguna (Matches Demo Case A coords)
      longitude: 121.1578,
      accuracy_meters: 15.5,
      captured_at: new Date().toISOString()
    }));
    form.append('evidence_attachments', JSON.stringify([{
      media_type: 'image/png',
      storage_url: 'http://localhost:5000/uploads/mock-evidence.png',
      sha256_hash: realSha256Hash,
      exif_metadata: {
        timestamp: new Date().toISOString(),
        latitude: 14.2110,
        longitude: 121.1578
      }
    }]));
    
    // Append the actual file buffer (this is what triggers verifyEvidenceHash)
    form.append('evidence_files', dummyImageBuffer, {
      filename: 'evidence.png',
      contentType: 'image/png'
    });

    // 5. Execute Submission
    console.log('[5] Submitting task to POST /api/v1/tasks/:id/submit...');
    const submitRes = await axios.post(`${BASE_URL}/tasks/${taskId}/submit`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${workerToken}`
      }
    });

    console.log('\n[SUCCESS] INT-02 TEST PASSED!');
    console.log('Response Status:', submitRes.status);
    console.log('Response Data:', JSON.stringify(submitRes.data, null, 2));

  } catch (error) {
    console.error('\n[FAIL] INT-02 TEST FAILED!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

runTest();