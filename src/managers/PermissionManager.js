const { PermissionsBitField } = require('discord.js');
const guildRepo = require('../database/repositories/GuildRepository');
const config = require('../config');

class PermissionManager {
  isOwner(userId) {
    return config.client.owners.includes(userId);
  }

  isDeveloper(userId) {
    return config.client.developers.includes(userId) || this.isOwner(userId);
  }

  isAdmin(member) {
    if (!member) return false;
    if (this.isOwner(member.id)) return true;
    return member.permissions.has(PermissionsBitField.Flags.Administrator) ||
           member.permissions.has(PermissionsBitField.Flags.ManageGuild);
  }

  isDJ(member, guildId) {
    if (!member) return false;
    if (this.isAdmin(member)) return true;

    const guildData = guildRepo.get(guildId);
    if (!guildData || !guildData.dj_role_id) return true; // If no DJ role configured, allow all

    return member.roles.cache.has(guildData.dj_role_id);
  }

  canControlPlayback(member, player) {
    if (!member) return false;
    if (this.isAdmin(member)) return true;
    if (this.isDJ(member, member.guild.id)) return true;

    // If user is alone with the bot in the voice channel
    if (player && player.voiceChannelId) {
      const voiceChannel = member.guild.channels.cache.get(player.voiceChannelId);
      if (voiceChannel) {
        const nonBots = voiceChannel.members.filter(m => !m.user.bot);
        if (nonBots.size === 1 && nonBots.has(member.id)) {
          return true;
        }
      }
    }

    // Check if the member was the requester of the current track
    if (player && player.currentTrack && player.currentTrack.requesterId === member.id) {
      return true;
    }

    return false;
  }

  checkBotVoicePermissions(voiceChannel, botMember) {
    const permissions = voiceChannel.permissionsFor(botMember);
    if (!permissions.has(PermissionsBitField.Flags.Connect)) {
      return { allowed: false, reason: 'I do not have permission to Connect to your voice channel.' };
    }
    if (!permissions.has(PermissionsBitField.Flags.Speak)) {
      return { allowed: false, reason: 'I do not have permission to Speak in your voice channel.' };
    }
    return { allowed: true };
  }

  checkBotTextPermissions(textChannel, botMember) {
    const permissions = textChannel.permissionsFor(botMember);
    if (!permissions.has(PermissionsBitField.Flags.SendMessages)) {
      return { allowed: false, reason: 'I do not have permission to Send Messages in this channel.' };
    }
    if (!permissions.has(PermissionsBitField.Flags.AttachFiles)) {
      return { allowed: false, reason: 'I do not have permission to Attach Files in this channel.' };
    }
    return { allowed: true };
  }
}

module.exports = new PermissionManager();
