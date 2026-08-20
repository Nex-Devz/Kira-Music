const premiumManager = require('../../managers/PremiumManager');
const uiTemplates = require('../../ui/templates');

class PremiumButtonHandler {
  async handle(interaction, action) {
    const guildId = interaction.guildId;
    if (action === 'perks') {
      const tier = premiumManager.getTier(interaction.user.id, guildId);
      await interaction.reply(
        uiTemplates.buildPremiumDashboard(tier, premiumManager.getEntitlement(interaction.user.id), premiumManager.getEntitlement(guildId))
      );
    }
  }
}

module.exports = new PremiumButtonHandler();
