const uiTemplates = require('../../ui/templates');
const playlistRepo = require('../../database/repositories/PlaylistRepository');
const guildRepo = require('../../database/repositories/GuildRepository');

class ModalRouter {
  async handle(interaction) {
    const customId = interaction.customId;

    if (customId === 'modal:settings:prefix') {
      const raw = interaction.fields.getTextInputValue('settings_prefix').trim();
      if (!raw || raw.length > 5) {
        return interaction.reply(uiTemplates.buildErrorMessage('Prefix must be between 1 and 5 characters.'));
      }
      guildRepo.update(interaction.guildId, { prefix: raw });
      return interaction.update(uiTemplates.buildSettingsDashboard(guildRepo.get(interaction.guildId)));
    }

    if (customId === 'modal:settings:volume') {
      const raw = interaction.fields.getTextInputValue('settings_volume').trim();
      const volume = parseInt(raw, 10);
      if (isNaN(volume) || volume < 0 || volume > 150) {
        return interaction.reply(uiTemplates.buildErrorMessage('Volume must be a number between 0 and 150.'));
      }
      guildRepo.update(interaction.guildId, { default_volume: volume });
      return interaction.update(uiTemplates.buildSettingsDashboard(guildRepo.get(interaction.guildId)));
    }

    if (customId === 'modal:playlist:create') {
      const name = interaction.fields.getTextInputValue('playlist_name');
      const desc = interaction.fields.getTextInputValue('playlist_desc') || '';
      try {
        const created = playlistRepo.create(interaction.user.id, interaction.guildId, name, desc);
        return interaction.reply(
          uiTemplates.buildSuccessMessage(`Created playlist **${created.name}**.`)
        );
      } catch (err) {
        return interaction.reply(
          uiTemplates.buildErrorMessage(err.message)
        );
      }
    }

    return interaction.reply(
      uiTemplates.buildSuccessMessage('Action processed successfully.')
    );
  }
}

module.exports = new ModalRouter();
