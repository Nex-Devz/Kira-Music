const { SlashCommandBuilder } = require('discord.js');
const musicManager = require('../../managers/MusicManager');
const premiumManager = require('../../managers/PremiumManager');
const uiTemplates = require('../../ui/templates');

module.exports = {
  name: 'filters',
  description: 'Apply audio effects (Bassboost, Nightcore, Vaporwave, 8D, Karaoke, Timescale)',
  aliases: ['fx', 'filter', 'effects'],
  argNames: ['preset'],
  voiceRequired: true,
  playerRequired: true,
  guildOnly: true,
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('filters')
    .setDescription('Apply audio effects and filter presets')
    .addStringOption(option =>
      option
        .setName('preset')
        .setDescription('Filter preset to apply')
        .addChoices(
          { name: 'Reset / None', value: 'none' },
          { name: 'Bass Boost', value: 'bassboost' },
          { name: 'Nightcore', value: 'nightcore' },
          { name: 'Vaporwave', value: 'vaporwave' },
          { name: '8D Audio', value: '8d' },
          { name: 'Karaoke', value: 'karaoke' },
          { name: 'Timescale', value: 'timescale' }
        )
    ),

  async execute(context) {
    const preset = context.getString('preset');
    const player = musicManager.getPlayer(context.guildId);

    if (!preset) {
      // Return interactive more controls / filter panel
      return context.reply(uiTemplates.buildMoreControlsView(player));
    }

    if (preset !== 'none') {
      const canUse = premiumManager.canUseFilter(preset, context.guildId, context.userId);
      if (!canUse) {
        return context.replyError(`The **${preset}** audio filter requires an upgraded Premium tier. Use \`/premium\` to view plans.`);
      }
    }

    await musicManager.applyFilter(context.guildId, preset);
    return context.replySuccess(`Applied filter preset: **${preset.toUpperCase()}**.`);
  }
};
