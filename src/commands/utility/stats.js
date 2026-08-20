const { SlashCommandBuilder } = require('discord.js');
const statsRepo = require('../../database/repositories/StatsRepository');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'stats',
  description: 'View server and global music listening statistics',
  aliases: ['serverstats', 'leaderboard'],
  guildOnly: true,
  cooldown: 4,

  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View server and global music listening statistics'),

  async execute(context) {
    const statsData = statsRepo.getGuildStats(context.guildId);
    const payload = uiTemplates.buildStatsView(statsData);
    return context.reply(payload);
  }
};
