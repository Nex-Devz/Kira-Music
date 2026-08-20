const guildRepo = require('../../database/repositories/GuildRepository');
const permissionManager = require('../../managers/PermissionManager');
const uiTemplates = require('../../ui/templates');

class SetupButtonHandler {
  async handle(interaction, action, param1) {
    const guildId = interaction.guildId;
    if (!permissionManager.isAdmin(interaction.member)) {
      return interaction.reply(uiTemplates.buildErrorMessage('Only administrators can configure setup.'));
    }

    if (action === 'channel') {
      if (param1 === 'current') {
        guildRepo.update(guildId, { music_channel_id: interaction.channelId, player_channel_id: interaction.channelId });
      } else {
        guildRepo.update(guildId, { music_channel_id: null, player_channel_id: null });
      }
      await interaction.update(uiTemplates.buildSetupWizard(2));
    } else if (action === 'dj') {
      if (param1 === 'create') {
        try {
          const role = await interaction.guild.roles.create({
            name: 'DJ',
            color: 0x5865f2,
            reason: 'Kira Music Bot DJ Role'
          });
          guildRepo.update(guildId, { dj_role_id: role.id });
        } catch (e) {}
      } else {
        guildRepo.update(guildId, { dj_role_id: null });
      }
      await interaction.update(uiTemplates.buildSetupWizard(3));
    }
  }
}

module.exports = new SetupButtonHandler();
