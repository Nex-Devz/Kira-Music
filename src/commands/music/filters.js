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
        .setAutocomplete(true)
    ),

  async execute(context) {
    const preset = context.getString('preset');
    const player = musicManager.getPlayer(context.guildId);

    if (!preset) {
      // Return interactive audio controls / filter panel
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
