const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const premiumManager = require('../../managers/PremiumManager');
const cacheManager = require('../../managers/CacheManager');
const blacklistRepo = require('../../database/repositories/BlacklistRepository');
const guildRepo = require('../../database/repositories/GuildRepository');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'dev',
  description: 'Owner and Developer diagnostics, cluster management, and administrative controls',
  aliases: ['developer', 'adminbot'],
  argNames: ['subcommand', 'arg1', 'arg2', 'arg3', 'arg4'],
  developerOnly: true,
  cooldown: 0,

  data: new SlashCommandBuilder()
    .setName('dev')
    .setDescription('Developer controls and system diagnostics')
    .addSubcommand(sub =>
      sub
        .setName('nodes')
        .setDescription('View connected Lavalink node stats, CPU, memory, and latency')
    )
    .addSubcommand(sub =>
      sub
        .setName('guild')
        .setDescription('Inspect server settings and persistent state')
        .addStringOption(opt => opt.setName('guild_id').setDescription('Target Guild ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('player')
        .setDescription('Manage or destroy a player in a specific guild')
        .addStringOption(opt => opt.setName('guild_id').setDescription('Target Guild ID').setRequired(true))
        .addStringOption(opt => opt.setName('action').setDescription('Action: stop | destroy').setRequired(true).addChoices(
          { name: 'Stop Playback', value: 'stop' },
          { name: 'Destroy Player', value: 'destroy' }
        ))
    )
    .addSubcommand(sub =>
      sub
        .setName('premium')
        .setDescription('Grant or revoke premium entitlements')
        .addStringOption(opt => opt.setName('action').setDescription('grant or revoke').setRequired(true).addChoices(
          { name: 'Grant Premium', value: 'grant' },
          { name: 'Revoke Premium', value: 'revoke' }
        ))
        .addStringOption(opt => opt.setName('target_type').setDescription('user or guild').setRequired(true).addChoices(
          { name: 'User', value: 'user' },
          { name: 'Guild', value: 'guild' }
        ))
        .addStringOption(opt => opt.setName('target_id').setDescription('User ID or Guild ID').setRequired(true))
        .addStringOption(opt => opt.setName('tier').setDescription('Tier: silver, gold, diamond').addChoices(
          { name: 'Silver Tier', value: 'silver' },
          { name: 'Gold Tier', value: 'gold' },
          { name: 'Diamond Tier', value: 'diamond' }
        ))
        .addIntegerOption(opt => opt.setName('duration_days').setDescription('Duration in days (0 for lifetime)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('cache')
        .setDescription('Inspect memory caches or flush all cached items')
        .addStringOption(opt => opt.setName('action').setDescription('Action: inspect or flush').setRequired(true).addChoices(
          { name: 'Inspect Stats', value: 'inspect' },
          { name: 'Flush All Caches', value: 'flush' }
        ))
    )
    .addSubcommand(sub =>
      sub
        .setName('reload')
        .setDescription('Reload command modules and registry in real-time')
    )
    .addSubcommand(sub =>
      sub
        .setName('sync')
        .setDescription('Force sync slash commands globally with Discord REST API')
    )
    .addSubcommand(sub =>
      sub
        .setName('maintenance')
        .setDescription('Toggle global maintenance mode')
    )
    .addSubcommand(sub =>
      sub
        .setName('blacklist')
        .setDescription('Manage blacklisted users or guilds')
        .addStringOption(opt => opt.setName('action').setDescription('add or remove').setRequired(true).addChoices(
          { name: 'Add to Blacklist', value: 'add' },
          { name: 'Remove from Blacklist', value: 'remove' }
        ))
        .addStringOption(opt => opt.setName('target_type').setDescription('user or guild').setRequired(true).addChoices(
          { name: 'User', value: 'user' },
          { name: 'Guild', value: 'guild' }
        ))
        .addStringOption(opt => opt.setName('target_id').setDescription('User ID or Guild ID').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Blacklist reason'))
    ),

  async execute(context) {
    let subcommand = 'nodes';
    if (context.isInteraction) {
      subcommand = context.source.options.getSubcommand(false) || 'nodes';
    } else {
      const sub = context.getString('subcommand');
      if (sub) subcommand = sub.toLowerCase();
    }

    switch (subcommand) {
      case 'nodes': {
        if (!musicManager.kumo?.nodes?.size) {
          return context.replyError('No Lavalink nodes are currently registered.');
        }

        const nodeReports = [];
        for (const node of musicManager.kumo.nodes.values()) {
          const stats = node.stats || {};
          const cpu = stats.cpu ? `${(stats.cpu.lavalinkLoad * 100).toFixed(1)}%` : 'N/A';
          const mem = stats.memory ? `${Math.round(stats.memory.used / 1024 / 1024)}MB / ${Math.round(stats.memory.allocated / 1024 / 1024)}MB` : 'N/A';
          const players = stats.players || 0;
          const uptime = stats.uptime ? uiTemplates.formatDuration(stats.uptime) : 'N/A';

          nodeReports.push(
            `**Node: ${node.name}**\n` +
            `• Status: \`${node.connected ? 'Connected' : 'Disconnected'}\`\n` +
            `• Active Players: \`${players}\`\n` +
            `• CPU Load: \`${cpu}\`\n` +
            `• Memory: \`${mem}\`\n` +
            `• Uptime: \`${uptime}\`\n` +
            `• Host: \`${node.options.host}:${node.options.port}\``
          );
        }

        return context.reply(uiTemplates.buildSuccessMessage(`### Lavalink Node Health & Telemetry\n\n${nodeReports.join('\n\n')}`));
      }

      case 'guild': {
        const guildId = context.getString('guild_id') || context.getString('arg1');
        const guildData = guildRepo.get(guildId);
        const player = musicManager.getPlayer(guildId);

        const info = [
          `**Guild ID:** \`${guildId}\``,
          `• Prefix: \`${guildData?.prefix || '!'}\``,
          `• DJ Role: \`${guildData?.dj_role_id || 'None'}\``,
          `• Music Channel: \`${guildData?.music_channel_id || 'None'}\``,
          `• Persistent Player Channel: \`${guildData?.player_channel_id || 'None'}\``,
          `• 24/7 Mode: \`${guildData?.mode_247 ? 'Enabled' : 'Disabled'}\``,
          `• Active Player: \`${player ? 'Yes (Playing: ' + Boolean(player.currentTrack) + ')' : 'No'}\``
        ].join('\n');

        return context.reply(uiTemplates.buildSuccessMessage(`### Guild Inspection\n${info}`));
      }

      case 'player': {
        const guildId = context.getString('guild_id') || context.getString('arg1');
        const action = context.getString('action') || context.getString('arg2');
        const player = musicManager.getPlayer(guildId);

        if (!player) return context.replyError(`No active player found in guild \`${guildId}\`.`);

        if (action === 'stop') {
          await musicManager.stop(guildId);
          return context.replySuccess(`Stopped playback in guild \`${guildId}\`.`);
        } else if (action === 'destroy') {
          musicManager.kumo.players.destroy(guildId);
          return context.replySuccess(`Destroyed player in guild \`${guildId}\`.`);
        }
        break;
      }

      case 'premium': {
        const action = context.getString('action') || context.getString('arg1');
        const targetType = context.getString('target_type') || context.getString('arg2');
        const targetId = context.getString('target_id') || context.getString('arg3');
        const tier = context.getString('tier') || context.getString('arg4') || 'diamond';
        const durationDays = context.getInteger('duration_days') || 0;

        if (action === 'grant') {
          const durationMs = durationDays > 0 ? durationDays * 24 * 60 * 60 * 1000 : 0;
          premiumManager.setEntitlement(targetId, targetType, tier, context.userId, durationMs);
          return context.replySuccess(
            `Granted **${tier.toUpperCase()}** premium to ${targetType} \`${targetId}\` ${durationDays > 0 ? `for ${durationDays} days` : 'permanently'}.`
          );
        } else {
          premiumManager.removeEntitlement(targetId);
          return context.replySuccess(`Revoked premium entitlement from ${targetType} \`${targetId}\`.`);
        }
      }

      case 'cache': {
        const action = context.getString('action') || context.getString('arg1') || 'inspect';
        if (action === 'flush') {
          cacheManager.clearAll();
          return context.replySuccess('Flushed all artwork, lyrics, and metadata caches.');
        } else {
          const stats = cacheManager.getStats();
          return context.replySuccess(
            `### Memory Cache Telemetry\n• Cached Artwork Items: **${stats.artworkCount}**\n• Cached Lyrics Items: **${stats.lyricsCount}**\n• Cached Track Metadata: **${stats.trackInfoCount}**`
          );
        }
      }

      case 'reload': {
        const commandHandler = require('../CommandHandler');
        commandHandler.loadCommands();
        return context.replySuccess(`Reloaded command registry (${commandHandler.commands.size} commands active).`);
      }

      case 'sync': {
        const commandHandler = require('../CommandHandler');
        await context.deferReply();
        await commandHandler.registerSlashCommands(context.client);
        return context.replySuccess('Synchronized slash commands with Discord REST API.');
      }

      case 'maintenance': {
        musicManager.maintenance = !musicManager.maintenance;
        return context.replySuccess(`Maintenance mode is now **${musicManager.maintenance ? 'ENABLED' : 'DISABLED'}**.`);
      }

      case 'blacklist': {
        const action = context.getString('action') || context.getString('arg1');
        const targetType = context.getString('target_type') || context.getString('arg2');
        const targetId = context.getString('target_id') || context.getString('arg3');
        const reason = context.getString('reason') || 'Administrative blacklist';

        if (action === 'add') {
          blacklistRepo.add(targetId, targetType, reason, context.userId);
          return context.replySuccess(`Blacklisted ${targetType} \`${targetId}\` (Reason: ${reason}).`);
        } else {
          blacklistRepo.remove(targetId);
          return context.replySuccess(`Removed ${targetType} \`${targetId}\` from blacklist.`);
        }
      }
    }
  }
};
