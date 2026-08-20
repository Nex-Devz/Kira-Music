const recommendCommand = require('./recommend');

module.exports = {
  ...recommendCommand,
  name: 'related',
  description: 'Find related songs to the current track',
  aliases: ['similartracks']
};
