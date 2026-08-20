const dbManager = require('../index');

class PremiumRepository {
  constructor() {
    this.db = dbManager.getDb();
    this.getStmt = this.db.prepare('SELECT * FROM premium WHERE target_id = ? AND is_active = 1');
    this.setStmt = this.db.prepare(`
      INSERT INTO premium (target_id, target_type, tier, granted_by, starts_at, expires_at, features, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(target_id) DO UPDATE SET
        target_type = excluded.target_type,
        tier = excluded.tier,
        granted_by = excluded.granted_by,
        starts_at = excluded.starts_at,
        expires_at = excluded.expires_at,
        features = excluded.features,
        is_active = 1
    `);
    this.removeStmt = this.db.prepare('UPDATE premium SET is_active = 0 WHERE target_id = ?');
    this.listAllStmt = this.db.prepare('SELECT * FROM premium WHERE is_active = 1 ORDER BY starts_at DESC');
  }

  get(targetId) {
    if (!targetId) return null;
    const row = this.getStmt.get(targetId);
    if (!row) return null;

    // Check expiration
    if (row.expires_at && row.expires_at > 0 && Date.now() > row.expires_at) {
      this.remove(targetId);
      return null;
    }

    return {
      ...row,
      features: JSON.parse(row.features || '[]')
    };
  }

  set(targetId, targetType, tier, grantedBy = 'system', durationMs = 0, customFeatures = []) {
    const now = Date.now();
    const expiresAt = durationMs > 0 ? now + durationMs : 0;

    this.setStmt.run(
      targetId,
      targetType,
      tier.toLowerCase(),
      grantedBy,
      now,
      expiresAt,
      JSON.stringify(customFeatures)
    );

    return this.get(targetId);
  }

  remove(targetId) {
    return this.removeStmt.run(targetId).changes > 0;
  }

  listAll() {
    return this.listAllStmt.all().map(row => ({
      ...row,
      features: JSON.parse(row.features || '[]')
    }));
  }
}

module.exports = new PremiumRepository();
