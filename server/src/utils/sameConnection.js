// Resolves a frozen model on the caller's connection, so services that accept
// injected models keep a single transaction-capable connection by default.
function sameConnection(anchor, model) {
  return anchor.db.models[model.modelName] || anchor.db.model(model.modelName, model.schema);
}

module.exports = { sameConnection };
