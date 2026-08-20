const { SlashCommandBuilder } = require('discord.js');
const userRepo = require('../../database/repositories/UserRepository');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'history',
  description: 'View your recent listening history',
  aliases: ['recent', 'played'],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your recent listening history'),

  async execute(context) {
    const history = userRepo.getHistory(context.userId, 15);
    if (history.length === 0) {
      return context.replyError('You have no listening history recorded yet.');
    }

    const list = history.map((h, i) => {
      const timeAgo = Math.floor((Date.now() - h.played_at) / (1000 * 60));
      return `\`${i + 1}.\` **${h.title}** - ${h.author} (${timeAgo}m ago)`;
    }).join('\n');

    return context.reply(uiTemplates.buildSuccessMessage(`### Listening History\n${list}`));
  }
};
