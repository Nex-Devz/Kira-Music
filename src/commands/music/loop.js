const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');

module.exports = {
  name: 'loop',
  description: 'Toggle or set track/queue repeat mode',
  aliases: ['repeat'],
  argNames: ['mode'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 2,

  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle or set track/queue repeat mode')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Loop mode')
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )
    ),

  async execute(context) {
    const player = musicManager.getPlayer(context.guildId);
    let targetMode = context.getString('mode');

    if (!targetMode) {
      const cur = player.loop || 'off';
      targetMode = cur === 'off' ? 'track' : cur === 'track' ? 'queue' : 'off';
    }

    const setMode = musicManager.setLoop(context.guildId, targetMode);
    await musicManager.updatePlayerMessage(player);
    return context.replySuccess(`Loop mode set to **${setMode.toUpperCase()}**.`);
  }
};
