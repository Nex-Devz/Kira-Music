const uiTemplates = require('../../ui/templates');
const playlistRepo = require('../../database/repositories/PlaylistRepository');

class ModalRouter {
  async handle(interaction) {
    const customId = interaction.customId;

    if (customId === 'modal:playlist:create') {
      const name = interaction.fields.getTextInputValue('playlist_name');
      const desc = interaction.fields.getTextInputValue('playlist_desc') || '';
      try {
        const created = playlistRepo.create(interaction.user.id, interaction.guildId, name, desc);
        return interaction.reply({
          ...uiTemplates.buildSuccessMessage(`Created playlist **${created.name}**.`),
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({
          ...uiTemplates.buildErrorMessage(err.message),
          ephemeral: true
        });
      }
    }

    return interaction.reply({
      ...uiTemplates.buildSuccessMessage('Action processed successfully.'),
      ephemeral: true
    });
  }
}

module.exports = new ModalRouter();
