const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'botinfo',
  description: 'Display bot system information, uptime, memory, and Lavalink cluster health',
  aliases: ['info', 'about', 'system'],
  cooldown: 4,

  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display bot system information, uptime, memory, and Lavalink cluster health'),

  async execute(context) {
    const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const totalMem = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
    const uptimeSec = Math.floor(process.uptime());
    const uptimeStr = uiTemplates.formatDuration(uptimeSec * 1000);
    const guildsCount = context.client.guilds.cache.size;
    const usersCount = context.client.users.cache.size;
    const activePlayers = musicManager.kumo?.players?.size || 0;

    const info = [
      `• **Node.js:** \`${process.version}\``,
      `• **Memory Usage:** \`${memUsage} MB / ${totalMem} MB\``,
      `• **Process Uptime:** \`${uptimeStr}\``,
      `• **Guilds:** \`${guildsCount}\``,
      `• **Cached Users:** \`${usersCount}\``,
      `• **Active Music Players:** \`${activePlayers}\``,
      `• **Lavalink Engine:** \`YuKumo v4 Client\``,
      `• **UI Framework:** \`Discord Components V2\``
    ].join('\n');

    return context.reply(uiTemplates.buildSuccessMessage(`### Kira Music Bot System Information\n${info}`));
  }
};
