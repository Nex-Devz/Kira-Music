const musicManager = require('../../managers/MusicManager');
const premiumManager = require('../../managers/PremiumManager');
const uiTemplates = require('../../ui/templates');

class FilterSelectHandler {
  async handle(interaction, selectedValue) {
    const guildId = interaction.guildId;
    const player = musicManager.getPlayer(guildId);

    if (!player) {
      return interaction.reply(uiTemplates.buildErrorMessage('No active player in this server.'));
    }

    const canFilter = premiumManager.canUseFilter(selectedValue, guildId, interaction.user.id);
    if (!canFilter && selectedValue !== 'none') {
      return interaction.reply({
        ...uiTemplates.buildErrorMessage(`The **${selectedValue}** audio filter requires an upgraded Premium tier. Use \`/premium\` to view plans.`),
        ephemeral: true
      });
    }

    await musicManager.applyFilter(guildId, selectedValue);
    await interaction.update(uiTemplates.buildMoreControlsView(player));
  }
}

module.exports = new FilterSelectHandler();
