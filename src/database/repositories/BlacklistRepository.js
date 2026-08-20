const dbManager = require('../index');

class BlacklistRepository {
  constructor() {
    this.db = dbManager.getDb();
    this.getStmt = this.db.prepare('SELECT * FROM blacklist WHERE target_id = ?');
    this.addStmt = this.db.prepare(`
      INSERT INTO blacklist (target_id, target_type, reason, banned_by, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(target_id) DO UPDATE SET
        target_type = excluded.target_type,
        reason = excluded.reason,
        banned_by = excluded.banned_by,
        created_at = excluded.created_at
    `);
    this.removeStmt = this.db.prepare('DELETE FROM blacklist WHERE target_id = ?');
    this.listAllStmt = this.db.prepare('SELECT * FROM blacklist ORDER BY created_at DESC');
  }

  isBlacklisted(targetId) {
    if (!targetId) return false;
    return Boolean(this.getStmt.get(targetId));
  }

  get(targetId) {
    return this.getStmt.get(targetId) || null;
  }

  add(targetId, targetType, reason = 'No reason provided', bannedBy = 'system') {
    this.addStmt.run(targetId, targetType, reason, bannedBy, Date.now());
    return this.get(targetId);
  }

  remove(targetId) {
    return this.removeStmt.run(targetId).changes > 0;
  }

  listAll() {
    return this.listAllStmt.all();
  }
}

module.exports = new BlacklistRepository();
