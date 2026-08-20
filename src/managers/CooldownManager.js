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
    this.cooldowns.set(key, Date.now() + cooldownSeconds * 1000);

    // Auto cleanup
    setTimeout(() => {
      this.cooldowns.delete(key);
    }, cooldownSeconds * 1000 + 500);
  }
}

module.exports = new CooldownManager();
