const { SlashCommandBuilder } = require('discord.js');
const guildRepo = require('../../database/repositories/GuildRepository');

module.exports = {
  name: 'prefix',
  description: 'Change or view the server command prefix',
  aliases: ['setprefix'],
  argNames: ['new_prefix'],
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Change or view server command prefix')
    .addStringOption(opt =>
      opt.setName('new_prefix').setDescription('New prefix string (e.g. !, ?, k!)')
    ),

  async execute(context) {
    const newPrefix = context.getString('new_prefix');
    const guildData = guildRepo.get(context.guildId);

    if (!newPrefix) {
      return context.replySuccess(`Current server prefix is: \`${guildData.prefix || '!'}\``);
    }

    if (!context.member.permissions.has('ManageGuild')) {
      return context.replyError('You need Manage Server permissions to change the prefix.');
    }

    if (newPrefix.length > 5) {
      return context.replyError('Prefix length cannot exceed 5 characters.');
    }

    guildRepo.update(context.guildId, { prefix: newPrefix });
    return context.replySuccess(`Server prefix updated to: \`${newPrefix}\``);
  }
};
