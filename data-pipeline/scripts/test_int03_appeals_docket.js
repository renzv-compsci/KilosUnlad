/**
 * test_int03_appeals_docket.js
 * Real-data integration test for INT-03: Appeals Docket Mounting.
 * 
 * Tests the filing of an appeal during the 15-day statutory notice window.
 * 
 * Prerequisites:
 * 1. Docker containers running.
 * 2. Demo Case A (DEMO-4PS-GRAD-0001) patched to NOTICE_OF_INELIGIBILITY status.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
const DIRECTOR_CREDS = { username: 'director_test', password: 'DirectorTest2026!' };
const TARGET_HOUSEHOLD = 'DEMO-4PS-GRAD-0001';

async function runTest() {
  console.log('[START] INT-03 Appeals Docket Integration Test\n');

  try {
    // 1. Login as Regional Director
    console.log('[1] Logging in as REGIONAL_DIRECTOR...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, DIRECTOR_CREDS);
    const token = loginRes.data.access_token;

    // 2. File an appeal for the household
    console.log(`[2] Filing appeal for household ${TARGET_HOUSEHOLD}...`);
    const appealPayload = {
      household_id: TARGET_HOUSEHOLD,
      appeal_reason: 'BENEFICIARY_DISPUTE',
      supporting_evidence: 'Beneficiary claims motorcycle is used for MoveIt delivery, not a personal asset.'
    };

    const appealRes = await axios.post(
      `${BASE_URL}/appeals/docket`,
      appealPayload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('   [OK] Appeal filed successfully.');
    console.log('   Appeal ID:', appealRes.data.appeal_id);
    console.log('   Status:', appealRes.data.status);

    // 3. Verify the 15-day appeal deadline is correctly calculated
    console.log('[3] Verifying 15-day appeal window calculation...');
    const noticeAt = new Date(appealRes.data.notice_at);
    const deadline = new Date(appealRes.data.appeal_deadline);
    const expectedDeadline = new Date(noticeAt.getTime() + (15 * 24 * 60 * 60 * 1000));
    
    if (Math.abs(deadline.getTime() - expectedDeadline.getTime()) > 1000) {
      throw new Error(`Deadline mismatch. Expected ${expectedDeadline.toISOString()}, got ${deadline.toISOString()}`);
    }
    console.log('   [OK] Appeal deadline correctly set to 15 days from notice.');

    // 4. Verify double-filing is blocked (Idempotency/Safety check)
    console.log('[4] Verifying double-filing is blocked...');
    try {
      await axios.post(`${BASE_URL}/appeals/docket`, appealPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      throw new Error('Expected 409 CONFLICT for double-filing, but request succeeded.');
    } catch (error) {
      if (error.response && error.response.status === 409 && error.response.data.error.code === 'APPEAL_ALREADY_EXISTS') {
        console.log('   [OK] Double-filing correctly blocked with 409 APPEAL_ALREADY_EXISTS.');
      } else {
        throw error;
      }
    }

    console.log('\n[SUCCESS] INT-03 TEST PASSED!');
    console.log('Response Data:', JSON.stringify(appealRes.data, null, 2));

  } catch (error) {
    console.error('\n[FAIL] INT-03 TEST FAILED!');
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