const blacklistRepo = require('../database/repositories/BlacklistRepository');
const permissionManager = require('../managers/PermissionManager');
const premiumManager = require('../managers/PremiumManager');
const cooldownManager = require('../managers/CooldownManager');
const musicManager = require('../managers/MusicManager');

class MiddlewarePipeline {
  /**
   * Run all pre-execution checks
   * @returns { allowed: boolean, reason?: string }
   */
  async execute(command, context) {
    const { userId, guildId, member, voiceChannel } = context;

    // 1. Blacklist Check
    if (blacklistRepo.isBlacklisted(userId)) {
      return { allowed: false, reason: 'You have been blacklisted from using this bot.' };
    }
    if (guildId && blacklistRepo.isBlacklisted(guildId)) {
      return { allowed: false, reason: 'This server has been blacklisted from using this bot.' };
    }

    // 2. Developer/Owner Only Commands
    if (command.developerOnly && !permissionManager.isDeveloper(userId)) {
      return { allowed: false, reason: 'This command is restricted to bot developers.' };
    }
    if (command.ownerOnly && !permissionManager.isOwner(userId)) {
      return { allowed: false, reason: 'This command is restricted to the bot owner.' };
    }

    // 3. Maintenance Mode Check
    if (musicManager.maintenance && !permissionManager.isDeveloper(userId)) {
      return { allowed: false, reason: 'The bot is currently undergoing scheduled maintenance. Please try again later.' };
    }

    // 4. Guild Only Check
    if (command.guildOnly && !guildId) {
      return { allowed: false, reason: 'This command can only be used inside a server.' };
    }

    // 5. Admin / DJ Permissions Check
    if (command.adminOnly && !permissionManager.isAdmin(member)) {
      return { allowed: false, reason: 'You need Administrator or Manage Server permissions to use this command.' };
    }

    if (command.djOnly && !permissionManager.isDJ(member, guildId)) {
      return { allowed: false, reason: 'You need the DJ role to use this command.' };
    }

    // 6. Voice Channel Checks
    if (command.voiceRequired) {
      if (!voiceChannel) {
        return { allowed: false, reason: 'You must be in a voice channel to use this command.' };
      }

      const botVoice = context.guild.members.me.voice?.channel;
      if (botVoice && botVoice.id !== voiceChannel.id) {
        return { allowed: false, reason: `You must be in the same voice channel as the bot (<#${botVoice.id}>).` };
      }

      // Check bot connect / speak permissions
      const botVoicePerms = permissionManager.checkBotVoicePermissions(voiceChannel, context.guild.members.me);
      if (!botVoicePerms.allowed) {
        return { allowed: false, reason: botVoicePerms.reason };
      }
    }

    // 7. Player Required Checks
    if (command.playerRequired) {
      const player = musicManager.getPlayer(guildId);
      if (!player || (!player.currentTrack && player.queue?.isEmpty?.())) {
        return { allowed: false, reason: 'There is no music currently playing in this server.' };
      }
    }

    // 8. Premium Required Check
    if (command.premiumOnly) {
      const tier = premiumManager.getTier(userId, guildId);
      if (tier.id === 'free') {
        return { allowed: false, reason: 'This feature requires an active **Premium Plan**. Use `/premium` to view plans.' };
      }
    }

    // 9. Cooldown Check
    const cooldownSecs = command.cooldown || 3;
    const remaining = cooldownManager.isOnCooldown(command.name, userId, guildId, cooldownSecs);
    if (remaining) {
      return { allowed: false, reason: `Please wait **${remaining.toFixed(1)}s** before reusing the \`/${command.name}\` command.` };
    }

    // Set cooldown
    cooldownManager.setCooldown(command.name, userId, guildId, cooldownSecs);

    return { allowed: true };
  }
}

module.exports = new MiddlewarePipeline();
