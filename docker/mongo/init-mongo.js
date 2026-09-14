// Switch context to the application database
db = db.getSiblingDB('kilosunlad');

// 1. Create the application user matching your .env credentials
db.createUser({
  user: 'app_user',
  pwd: 'AppUserPassword2026!',
  roles: [
    { role: 'readWrite', db: 'kilosunlad' }
  ]
});

// 2. Pre-create the 6 core system collections
db.createCollection('users');
db.createCollection('beneficiaries');
db.createCollection('external_records');
db.createCollection('verification_tasks');
db.createCollection('audit_logs');
db.createCollection('system_configs');

// 3. Pre-create Unique and Query Indexes

// Users collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });

// Beneficiaries collection indexes (Unique ID, National ID, and 2dsphere GPS mapping)
db.beneficiaries.createIndex({ household_id: 1 }, { unique: true });
db.beneficiaries.createIndex({ "head_of_household.national_id": 1 }, { unique: true });
db.beneficiaries.createIndex({ "address.coordinates": "2dsphere" });
db.beneficiaries.createIndex({ "risk_assessment.is_flagged": 1, "address.municipality": 1 });

// External records indexes (Mock registries cross-matching)
db.external_records.createIndex({ matched_household_id: 1 }, { unique: true });
db.external_records.createIndex({ national_id: 1 });

// Verification tasks indexes (For Municipal Link tablet assignments)
db.verification_tasks.createIndex({ task_id: 1 }, { unique: true });
db.verification_tasks.createIndex({ assigned_worker_id: 1, task_status: 1 });

// Audit logs indexes (For the cryptographic hash chain verification)
db.audit_logs.createIndex({ sequence_index: 1 }, { unique: true });
db.audit_logs.createIndex({ entry_hash: 1 }, { unique: true });

print(">> [KilosUnlad] MongoDB initialized successfully with secure app_user and core indexes.");