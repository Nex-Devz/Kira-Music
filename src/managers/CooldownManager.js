class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  getKey(commandName, userId, guildId = null) {
    return `${commandName}:${userId}:${guildId || 'global'}`;
  }

  isOnCooldown(commandName, userId, guildId = null, cooldownSeconds = 3) {
    if (!cooldownSeconds || cooldownSeconds <= 0) return false;
    const key = this.getKey(commandName, userId, guildId);
    const now = Date.now();
    const expiration = this.cooldowns.get(key);

    if (expiration && now < expiration) {
      return (expiration - now) / 1000;
    }
    return false;
  }

  setCooldown(commandName, userId, guildId = null, cooldownSeconds = 3) {
    if (!cooldownSeconds || cooldownSeconds <= 0) return;
    const key = this.getKey(commandName, userId, guildId);
    const expiresAt = Date.now() + cooldownSeconds * 1000;
    this.cooldowns.set(key, expiresAt);

    // Only delete if this exact expiration is still the active one — a stale
    // timer from a previous cooldown must not wipe a newer refresh early.
    const timer = setTimeout(() => {
      if (this.cooldowns.get(key) === expiresAt) {
        this.cooldowns.delete(key);
      }
    }, cooldownSeconds * 1000 + 500);
    timer.unref?.();
  }
}

module.exports = new CooldownManager();
