const premiumRepo = require('../database/repositories/PremiumRepository');
const { PREMIUM_TIERS } = require('../config/constants');
const config = require('../config');

class PremiumManager {
  /**
   * Determine active tier for user or guild
   */
  getTier(userId, guildId = null) {
    // Developers and owners are automatically Diamond
    if (userId && (config.client.owners.includes(userId) || config.client.developers.includes(userId))) {
      return PREMIUM_TIERS.DIAMOND;
    }

    // Check guild premium first
    if (guildId) {
      const guildPrem = premiumRepo.get(guildId);
      if (guildPrem) {
        const tierObj = PREMIUM_TIERS[guildPrem.tier.toUpperCase()];
        if (tierObj) return tierObj;
      }
    }

    // Check user premium
    if (userId) {
      const userPrem = premiumRepo.get(userId);
      if (userPrem) {
        const tierObj = PREMIUM_TIERS[userPrem.tier.toUpperCase()];
        if (tierObj) return tierObj;
      }
    }

    return PREMIUM_TIERS.FREE;
  }

  getEntitlement(targetId) {
    return premiumRepo.get(targetId);
  }

  setEntitlement(targetId, targetType, tierName, grantedBy = 'system', durationMs = 0) {
    const tier = tierName.toUpperCase();
    if (!PREMIUM_TIERS[tier]) {
      throw new Error(`Invalid tier "${tierName}". Valid tiers: FREE, SILVER, GOLD, DIAMOND`);
    }
    return premiumRepo.set(targetId, targetType, tier, grantedBy, durationMs);
  }

  removeEntitlement(targetId) {
    return premiumRepo.remove(targetId);
  }

  hasNoPrefix(userId, guildId = null) {
    const tier = this.getTier(userId, guildId);
    return Boolean(tier.noPrefix);
  }

  canUse247(guildId, userId = null) {
    const tier = this.getTier(userId, guildId);
    return Boolean(tier.mode247);
  }

  canUseAutoplay(guildId, userId = null) {
    const tier = this.getTier(userId, guildId);
    return Boolean(tier.autoplay);
  }

  canUseFilter(filterName, guildId, userId = null) {
    const tier = this.getTier(userId, guildId);
    if (tier.filters.includes('all')) return true;
    return tier.filters.includes(filterName.toLowerCase());
  }

  getMaxQueueSize(guildId, userId = null) {
    const tier = this.getTier(userId, guildId);
    return tier.maxQueueSize || 100;
  }

  getMaxPlaylists(userId) {
    const tier = this.getTier(userId);
    return tier.maxPlaylists || 3;
  }

  getMaxTracksPerPlaylist(userId) {
    const tier = this.getTier(userId);
    return tier.maxTracksPerPlaylist || 50;
  }
}

module.exports = new PremiumManager();
