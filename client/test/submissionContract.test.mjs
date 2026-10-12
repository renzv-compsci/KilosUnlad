import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

// STR-02: a queued draft must map onto the frozen field-task-submission.json
// request. The mapped body is validated with the server's own Joi preparation.
const require = createRequire(import.meta.url);
const { prepareSubmission } = require('../../server/src/services/sync.service.js');
const contract = require('../../docs/contracts/field-tablet/field-task-submission.json');

const bundled = await build({
  stdin: { contents: "export { toSubmissionContract, DraftIncompleteError, API_BASE_URL } from './src/services/api';",
    resolveDir: new URL('..', import.meta.url).pathname, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'browser', write: false,
  define: { 'import.meta.env.VITE_API_URL': '"http://localhost:5000/api/v1"', 'process.env.NODE_ENV': '"test"' },
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));

const HASH = 'a4f5d2e7b8c9a1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
const draft = {
  task_id: 'TSK-2026-00001', household_id: '4PS-04A-2026-00129', timestamp: '2026-09-10T10:20:00Z',
  wall_construction: 3, roof_construction: 3, water_access: 2,
  is_motorcycle_present: true, is_productive_asset: true, proof_type: 'MOVEIT', franchise_number: 'MV-2026-99120',
  physical_card_presented: true, card_matches_beneficiary: true, pawning_suspected: false,
  evidence_attachments: [{ photo_url: 'data:image/png;base64,iVBORw0KGgo=', captured_at: '2026-09-10T10:15:30Z',
    gps_readout: { latitude: 14.2145, longitude: 121.1651, accuracy_m: 4.2 }, client_side_hash: HASH }],
  verified_swdi_level: 3, worker_recommendation: 'RECOMMEND_GRADUATION',
  narrative_report: 'Active MoveIt delivery business.', sync_status: 'PENDING_SYNC',
};

test('mapped draft passes the server Joi schema and matches the contract keys', () => {
  const body = mod.toSubmissionContract(draft);
  assert.deepEqual(Object.keys(body).sort(), Object.keys(contract.request).sort());
  const prepared = prepareSubmission(body, draft.task_id);
  assert.equal(prepared.field_findings.client_geolocation.accuracy_meters, 4.2);
  assert.equal(body.evidence_attachments[0].media_type, 'image/png');
  assert.equal(body.evidence_attachments[0].storage_url, `${mod.API_BASE_URL}/evidence/${HASH}`);
});

test('local-only fields never leave the device', () => {
  const mapped = mod.toSubmissionContract(draft);
  assert.equal(mapped.timestamp, undefined); // the draft save time is local; exif_metadata.timestamp is the contract's
  const body = JSON.stringify(mapped);
  for (const field of ['wall_construction', 'sync_status', 'photo_url', 'gps_readout', 'client_side_hash']) {
    assert.ok(!body.includes(`"${field}"`), field);
  }
});

test('legacy drafts without a verified level or evidence are rejected locally', () => {
  const { verified_swdi_level, ...legacy } = draft;
  assert.throws(() => mod.toSubmissionContract(legacy), mod.DraftIncompleteError);
  assert.throws(() => mod.toSubmissionContract({ ...draft, evidence_attachments: [] }), mod.DraftIncompleteError);
});

test('motorcycle absent maps to proof_type NONE and empty franchise', () => {
  const body = mod.toSubmissionContract({ ...draft, is_motorcycle_present: false, is_productive_asset: false,
    proof_type: undefined, franchise_number: undefined });
  assert.deepEqual(body.livelihood_asset_verification,
    { is_motorcycle_present: false, is_productive_asset: false, proof_type: 'NONE', franchise_number: '' });
  prepareSubmission(body, draft.task_id);
});
