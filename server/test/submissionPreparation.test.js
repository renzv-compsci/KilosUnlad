const test = require('node:test');
const assert = require('node:assert/strict');
const contract = require('../../docs/contracts/field-tablet/field-task-submission.json');
const { prepareSubmission } = require('../src/services/sync.service');
const copy = () => structuredClone(contract.request);

test('submission contract maps into existing field_findings without changing input', () => {
  const input = copy();
  const { task_id, household_id, ...findings } = copy();
  assert.deepEqual(prepareSubmission(input, task_id), { task_id, household_id, field_findings: findings });
  assert.deepEqual(input, contract.request);
});

test('submission rejects missing fields and mismatched route identity', () => {
  for (const key of Object.keys(contract.request)) {
    const input = copy(); delete input[key];
    assert.throws(() => prepareSubmission(input, contract.request.task_id), { code: 'INVALID_SUBMISSION_REQUEST', status: 400 });
  }
  for (const input of [null, undefined, [], {}]) {
    assert.throws(() => prepareSubmission(input, contract.request.task_id), { code: 'INVALID_SUBMISSION_REQUEST' });
  }
  assert.throws(() => prepareSubmission(copy(), 'another-task'), { code: 'INVALID_SUBMISSION_REQUEST' });
});

test('submission rejects coercion, malformed evidence, coordinates and privileged fields', () => {
  for (const mutate of [
    x => { x.verified_swdi_level = '3'; },
    x => { x.verified_swdi_level = 4; },
    x => { x.worker_recommendation = 'APPROVED_GRADUATION'; },
    x => { x.task_status = 'SUBMITTED'; },
    x => { x.assigned_worker_id = 'other'; },
    x => { x.client_geolocation.latitude = 91; },
    x => { x.client_geolocation.longitude = -181; },
    x => { x.client_geolocation.latitude = NaN; },
    x => { x.client_geolocation.accuracy_meters = -1; },
    x => { x.client_geolocation.captured_at = '2026-09-28'; },
    x => { x.landbank_card_inspection.pawning_suspected = 'false'; },
    x => { x.livelihood_asset_verification.proof_type = 'UNKNOWN'; },
    x => { x.evidence_attachments[0].sha256_hash = 'a'.repeat(63); },
    x => { x.evidence_attachments[0].storage_url = 'file:///private'; },
    x => { x.evidence_attachments[0].media_type = 'text/html'; },
    x => { x.evidence_attachments[0].exif_metadata.longitude = Infinity; },
    x => { x.evidence_attachments[0].verified = true; }
  ]) {
    const input = copy(); mutate(input);
    assert.throws(() => prepareSubmission(input, input.task_id), { code: 'INVALID_SUBMISSION_REQUEST' });
  }
});

test('preparation permits absent EXIF and empty evidence without claiming evidence verification', () => {
  const input = copy(); delete input.evidence_attachments[0].exif_metadata;
  assert.equal(prepareSubmission(input, input.task_id).field_findings.evidence_attachments.length, 1);
  input.evidence_attachments = [];
  assert.deepEqual(prepareSubmission(input, input.task_id).field_findings.evidence_attachments, []);
});
