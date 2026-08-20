const permissionManager = require('../../managers/PermissionManager');
const uiTemplates = require('../../ui/templates');

class HelpSelectHandler {
  async handle(interaction, selectedValue) {
    const isDev = permissionManager.isDeveloper(interaction.user.id);
    await interaction.update(uiTemplates.buildHelpMenu(selectedValue, isDev));
  }
}

module.exports = new HelpSelectHandler();
