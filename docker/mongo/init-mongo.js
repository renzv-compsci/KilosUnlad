db = db.getSiblingDB('admin');

db.createRole({
  role: 'kilosUnladAppRole',
  privileges: [
    // Non-audit collections — full CRUD + createIndex
    {
      resource: { db: 'kilosunlad', collection: 'users' },
      actions: ['find', 'insert', 'update', 'remove', 'createIndex'],
    },
    {
      resource: { db: 'kilosunlad', collection: 'beneficiaries' },
      actions: ['find', 'insert', 'update', 'remove', 'createIndex'],
    },
    {
      resource: { db: 'kilosunlad', collection: 'external_records' },
      actions: ['find', 'insert', 'update', 'remove', 'createIndex'],
    },
    {
      resource: { db: 'kilosunlad', collection: 'verification_tasks' },
      actions: ['find', 'insert', 'update', 'remove', 'createIndex'],
    },
    {
      resource: { db: 'kilosunlad', collection: 'system_configs' },
      actions: ['find', 'insert', 'update', 'remove', 'createIndex'],
    },

    // Audit logs — append-only
    {
      resource: { db: 'kilosunlad', collection: 'audit_logs' },
      actions: ['find', 'insert'],
    },
  ],
  roles: [],
});

db = db.getSiblingDB('kilosunlad');

db.createUser({
  user: 'app_user',
  pwd: 'AppUserPassword2026!',
  roles: [{ role: 'kilosUnladAppRole', db: 'admin' }],
});

db.createCollection('users');
db.createCollection('beneficiaries');
db.createCollection('external_records');
db.createCollection('verification_tasks');
db.createCollection('audit_logs');
db.createCollection('system_configs');

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

// Beneficiaries collection indexes (unique ID, national ID, 2dsphere GPS mapping)
db.beneficiaries.createIndex({ household_id: 1 }, { unique: true });
db.beneficiaries.createIndex({ 'head_of_household.national_id': 1 }, { unique: true });
db.beneficiaries.createIndex({ 'address.coordinates': '2dsphere' });
db.beneficiaries.createIndex({ 'risk_assessment.is_flagged': 1, 'address.municipality': 1 });

// External records indexes (mock registries cross-matching)
db.external_records.createIndex({ matched_household_id: 1 }, { unique: true });
db.external_records.createIndex({ national_id: 1 });

// Verification tasks indexes (for Municipal Link tablet assignments)
db.verification_tasks.createIndex({ task_id: 1 }, { unique: true });
db.verification_tasks.createIndex({ assigned_worker_id: 1, task_status: 1 });

// Audit logs indexes (for the cryptographic hash chain verification)
db.audit_logs.createIndex({ sequence_index: 1 }, { unique: true });
db.audit_logs.createIndex({ entry_hash: 1 }, { unique: true });

print('>> [KilosUnlad] MongoDB initialized successfully with kilosUnladAppRole and core indexes.');