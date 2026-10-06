/**
 * Offline test suite — exercises command registration, the component router,
 * queue logic, and every Components V2 payload without touching Discord.
 *
 * Run with: npm test  (node --test test/)
 */
process.env.DATABASE_PATH = require('node:path').join(__dirname, 'test-offline.db');

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { MESSAGE_FLAGS, COMPONENT_TYPES, BUTTON_STYLES } = require(path.join(ROOT, 'src/config/constants'));

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function walkPayload(payload, visit, where = 'payload') {
  assert.ok(payload && typeof payload === 'object', `${where}: payload must be an object`);
  assert.ok(
    (payload.flags & MESSAGE_FLAGS.IS_COMPONENTS_V2) !== 0,
    `${where}: missing IS_COMPONENTS_V2 flag`
  );
  assert.ok(!('content' in payload), `${where}: V2 payload must not carry content`);
  assert.ok(!('embeds' in payload), `${where}: V2 payload must not carry embeds`);
  visit(payload, where);

  const components = payload.components || [];
  assert.ok(Array.isArray(components), `${where}: components must be an array`);
  components.forEach((comp, i) => walkComponent(comp, visit, `${where}.components[${i}]`));
}

function walkComponent(comp, visit, where) {
  assert.ok(comp && typeof comp === 'object', `${where}: component must be an object`);
  assert.ok(typeof comp.type === 'number', `${where}: component missing numeric type`);
  visit(comp, where);

  if (comp.type === COMPONENT_TYPES.ACTION_ROW) {
    assert.ok(Array.isArray(comp.components), `${where}: action row missing components`);
    assert.ok(comp.components.length <= 5, `${where}: action row holds more than 5 children`);
    comp.components.forEach((child, i) => walkComponent(child, visit, `${where}[${i}]`));
  }

  if (comp.type === COMPONENT_TYPES.SECTION) {
    assert.ok(Array.isArray(comp.components) && comp.components.length > 0, `${where}: empty section`);
    comp.components.forEach((child, i) => walkComponent(child, visit, `${where}.components[${i}]`));
    if (comp.accessory) {
      assert.ok(
        [COMPONENT_TYPES.THUMBNAIL, COMPONENT_TYPES.MEDIA_GALLERY, COMPONENT_TYPES.FILE].includes(comp.accessory.type),
        `${where}: invalid section accessory type ${comp.accessory.type}`
      );
      walkComponent(comp.accessory, visit, `${where}.accessory`);
    }
  }

  // Containers hold every actionable component — without this recursion the
  // button/select assertions below would silently never run.
  if (comp.type === COMPONENT_TYPES.CONTAINER) {
    assert.ok(Array.isArray(comp.components) && comp.components.length > 0, `${where}: empty container`);
    comp.components.forEach((child, i) => walkComponent(child, visit, `${where}.components[${i}]`));
  }
}

function validatePayload(payload, label) {
  const ids = { buttons: [], selects: [] };
  walkPayload(payload, (comp, where) => {
    if (comp.type === COMPONENT_TYPES.BUTTON) {
      assert.ok(typeof comp.label === 'string' && comp.label.length > 0, `${where}: button missing label`);
      assert.ok(comp.label.length <= 80, `${where}: button label too long`);
      if (comp.style === BUTTON_STYLES.LINK) {
        assert.ok(typeof comp.url === 'string' && comp.url.startsWith('http'), `${where}: link button missing url`);
      } else {
        assert.ok(typeof comp.custom_id === 'string', `${where}: button missing custom_id`);
        assert.ok(comp.custom_id.length <= 100, `${where}: custom_id exceeds 100 chars`);
        assert.match(comp.custom_id, /^[a-z0-9]+:[a-z0-9]+(:[^:]+)*$/i, `${where}: custom_id not namespaced`);
        ids.buttons.push(comp.custom_id);
      }
    }

    if (comp.type === COMPONENT_TYPES.STRING_SELECT) {
      assert.ok(typeof comp.custom_id === 'string' && comp.custom_id.length <= 100, `${where}: bad select custom_id`);
      assert.ok(Array.isArray(comp.options) && comp.options.length >= 1 && comp.options.length <= 25,
        `${where}: select must have 1-25 options`);
      for (const opt of comp.options) {
        assert.ok(opt.label && opt.label.length <= 100, `${where}: option label invalid`);
        assert.ok(opt.value !== undefined && String(opt.value).length <= 100, `${where}: option value invalid`);
        if (opt.description) assert.ok(opt.description.length <= 100, `${where}: option description too long`);
      }
      ids.selects.push(comp.custom_id);
    }

    if (comp.type === COMPONENT_TYPES.FILE) {
      assert.ok(
        comp.file && typeof comp.file.url === 'string' && comp.file.url.startsWith('attachment://'),
        `${where}: file component must reference an attachment:// url`
      );
    }
  }, label);
  return ids;
}

function makeMember(overrides = {}) {
  return {
    id: 'user1',
    permissions: { has: () => true },
    roles: { cache: { has: () => true } },
    voice: { channel: { id: 'vc1' } },
    guild: {
      id: 'g1',
      channels: { cache: new Map([['vc1', { id: 'vc1', members: new Map() }]]) },
      members: { me: {} }
    },
    ...overrides
  };
}

class MockInteraction {
  constructor(opts = {}) {
    this.kind = opts.kind || 'button';
    this.customId = opts.customId;
    this.values = opts.values || [];
    this.fieldValues = opts.fieldValues || {};
    this.user = opts.user || { id: 'user1', username: 'Tester' };
    this.member = opts.member || makeMember();
    this.guildId = 'g1';
    this.channelId = 'c1';
    this.message = { id: 'msg1' };
    this.guild = {
      id: 'g1',
      roles: { create: async () => ({ id: 'role1', name: 'DJ' }) },
      channels: { cache: new Map([['vc1', { id: 'vc1', members: new Map() }]]) },
      members: { me: {} }
    };
    this.acks = [];
    this.deferred = false;
    this.replied = false;
    this.fields = { getTextInputValue: (k) => this.fieldValues[k] ?? '' };
  }

  isAutocomplete() { return this.kind === 'autocomplete'; }
  isButton() { return this.kind === 'button'; }
  isStringSelectMenu() { return this.kind === 'select'; }
  isModalSubmit() { return this.kind === 'modal'; }
  isRepliable() { return true; }

  reply(payload) { this.acks.push({ method: 'reply', payload }); this.replied = true; return Promise.resolve(); }
  update(payload) { this.acks.push({ method: 'update', payload }); return Promise.resolve(); }
  deferUpdate() { this.acks.push({ method: 'deferUpdate' }); this.deferred = true; return Promise.resolve(); }
  editReply(payload) { this.acks.push({ method: 'editReply', payload }); return Promise.resolve(); }
  showModal(modal) { this.acks.push({ method: 'showModal', modal }); return Promise.resolve(); }
  respond(choices) { this.acks.push({ method: 'respond', choices }); return Promise.resolve(); }
}

// Mock player wrapping a real yukumo Queue so queue math is exercised for real.
const { Queue } = require('yukumo');
function makeTrack(title) {
  return { title, author: 'Artist', duration: 180000, uri: `https://example.com/${title}`, info: { length: 180000 } };
}
function makePlayer(titles = ['Now Playing']) {
  const queue = new Queue();
  titles.slice(1).forEach(t => queue.enqueue(makeTrack(t)));
  const current = makeTrack(titles[0]);
  queue.start(); // puts first track in current position when available
  return {
    queue,
    currentTrack: queue.currentTrack || current,
    position: 5000,
    paused: false,
    loop: 'off',
    autoplay: false,
    is247: false,
    volume: 80,
    status: 'playing',
    voiceChannelId: 'vc1',
    textChannelId: 'c1',
    voiceId: 'vc1',
    textId: 'c1'
  };
}

after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    const f = process.env.DATABASE_PATH + suffix;
    try { fs.unlinkSync(f); } catch (e) {}
  }
});

// ---------------------------------------------------------------------------
// 1. command registration
// ---------------------------------------------------------------------------

test('loads all commands with unique names, aliases and valid slash data', () => {
  const commandHandler = require(path.join(ROOT, 'src/handlers/CommandHandler'));
  commandHandler.loadCommands(path.join(ROOT, 'src/commands'));

  assert.ok(commandHandler.commands.size >= 40, `expected >= 40 commands, got ${commandHandler.commands.size}`);

  const seen = new Set();
  for (const [key, cmd] of commandHandler.commands) {
    assert.equal(key, cmd.name.toLowerCase(), `command key mismatch for ${cmd.name}`);
    assert.equal(typeof cmd.execute, 'function', `${cmd.name} missing execute()`);
    assert.ok(!seen.has(cmd.name), `duplicate command name ${cmd.name}`);
    seen.add(cmd.name);

    if (cmd.data) {
      const json = typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data;
      assert.equal(json.name, cmd.name.toLowerCase(), `${cmd.name}: slash name mismatch`);
      assert.ok(json.description && json.description.length > 0, `${cmd.name}: slash description missing`);
      JSON.stringify(json); // must serialize
    }
  }

  for (const [alias, target] of commandHandler.aliases) {
    assert.ok(commandHandler.commands.has(target), `alias "${alias}" points at missing command "${target}"`);
  }

  assert.ok(commandHandler.slashCommandData.length >= 30, 'expected slash registration payload entries');
  JSON.stringify(commandHandler.slashCommandData);
});

// ---------------------------------------------------------------------------
// 2. event modules
// ---------------------------------------------------------------------------

test('event modules expose the event names the installed discord.js emits', () => {
  const { Events } = require('discord.js');
  const eventsDir = path.join(ROOT, 'src/events');
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));
  assert.ok(files.length >= 6, 'expected at least 6 event modules');

  const expected = {
    'ready.js': Events.ClientReady,
    'interactionCreate.js': Events.InteractionCreate,
    'messageCreate.js': Events.MessageCreate,
    'voiceStateUpdate.js': Events.VoiceStateUpdate,
    'guildCreate.js': Events.GuildCreate,
    'guildDelete.js': Events.GuildDelete,
    'error.js': Events.Error
  };

  for (const file of files) {
    const ev = require(path.join(eventsDir, file));
    assert.equal(typeof ev.name, 'string', `${file} missing name`);
    assert.equal(typeof ev.execute, 'function', `${file} missing execute()`);
    if (expected[file]) {
      assert.equal(ev.name, expected[file], `${file} registers "${ev.name}" but discord.js emits "${expected[file]}"`);
    }
  }
});

// ---------------------------------------------------------------------------
// 3. payload structure for every template
// ---------------------------------------------------------------------------

test('every UI template produces a structurally valid Components V2 payload', async () => {
  const templates = require(path.join(ROOT, 'src/ui/templates'));
  const { PREMIUM_TIERS } = require(path.join(ROOT, 'src/config/constants'));

  const player = makePlayer(['Neon Skyline', 't2', 't3', 't4', 't5']);
  const clientMock = { user: { id: 'bot1', username: 'Kira' }, ws: { ping: 42 } };
  const guildMock = { name: 'Test Server' };

  const payloads = {
    player: await templates.buildPlayerView(player),
    emptyPlayer: templates.buildEmptyPlayerView(),
    moreControls: templates.buildMoreControlsView(player),
    queue: templates.buildQueueView(player, 1),
    queueLastPage: templates.buildQueueView(player, 99),
    search: templates.buildSearchResultsView('query', [makeTrack('a'), makeTrack('b')]),
    lyrics: templates.buildLyricsView('Song', 'Artist', 'line1\nline2', 1),
    playlistList: templates.buildPlaylistListView([]),
    playlistDetails: templates.buildPlaylistDetailsView({ id: 7, name: 'Mix', tracks: [] }),
    settings: templates.buildSettingsDashboard({ prefix: '!' }),
    setup1: templates.buildSetupWizard(1),
    setup2: templates.buildSetupWizard(2),
    setup3: templates.buildSetupWizard(3),
    premium: templates.buildPremiumDashboard(PREMIUM_TIERS.FREE, null, null),
    mention: templates.buildMentionView(clientMock, guildMock, '!'),
    helpHome: templates.buildHelpMenu('home', false),
    helpDev: templates.buildHelpMenu('dev', true),
    helpMusic: templates.buildHelpMenu('music', false),
    success: templates.buildSuccessMessage('done'),
    error: templates.buildErrorMessage('boom'),
    loading: templates.buildLoadingMessage('wait'),
    confirm: templates.buildConfirmMessage('sure?', 'settings:reset:confirm', 'settings:reset:cancel'),
    stats: templates.buildStatsView({ totalUsers: 1, totalTracks: 2, totalPlayTimeMs: 3, topUsers: [] }),
    profile: await templates.buildProfileView({ totalPlayed: 12, totalDurationMs: 3600000 }, { username: 'Tester' })
  };

  const allIds = { buttons: [], selects: [] };
  for (const [name, payload] of Object.entries(payloads)) {
    const ids = validatePayload(payload, name);
    allIds.buttons.push(...ids.buttons);
    allIds.selects.push(...ids.selects);
  }

  // Profile image must be referenced by a file component or it never renders.
  const profileFileComp = JSON.stringify(payloads.profile).includes('attachment://profile.png');
  assert.ok(profileFileComp, 'profile payload must reference attachment://profile.png');

  // Every button customId must route to a known namespace.
  const knownNamespaces = new Set(['player', 'queue', 'lyrics', 'playlist', 'setup', 'premium', 'search', 'help', 'settings']);
  for (const id of allIds.buttons) {
    const ns = id.split(':')[0];
    assert.ok(knownNamespaces.has(ns), `button customId "${id}" has no router namespace`);
    if (ns === 'help') assert.ok(id.startsWith('help:cat:'), `help button "${id}" must use help:cat:<category>`);
    if (ns === 'settings') {
      assert.ok(['channel', 'dj', 'reset', 'view'].includes(id.split(':')[1]), `unexpected settings button "${id}"`);
    }
  }

  // Selects must match the router's exact customIds.
  const routedSelects = new Set(['filter:select', 'search:select', 'playlist:select', 'help:category', 'settings:category']);
  for (const id of allIds.selects) {
    assert.ok(routedSelects.has(id), `select "${id}" is not handled by InteractionRouter`);
  }

  // Template sanity: the broken duplicate mention view must not come back.
  const src = fs.readFileSync(path.join(ROOT, 'src/ui/templates.js'), 'utf8');
  assert.equal((src.match(/buildMentionView\(/g) || []).length, 1, 'buildMentionView should be defined exactly once');
  assert.ok(!src.includes('.setURL('), 'ButtonBuilder has setUrl, not setURL');
});

// ---------------------------------------------------------------------------
// 4. component router acknowledges every interaction
// ---------------------------------------------------------------------------

test('router acknowledges button interactions for every routed namespace', async () => {
  const router = require(path.join(ROOT, 'src/handlers/InteractionRouter'));

  const cases = [
    'player:pause', 'player:resume', 'player:skip', 'player:previous', 'player:stop',
    'player:queue', 'player:lyrics', 'player:favorite', 'player:more', 'player:refresh',
    'player:shuffle', 'player:loop:track', 'player:autoplay:true', 'player:vol:up',
    'player:seek:fwd', 'player:247:toggle', 'player:help', 'player:favorites',
    'queue:page:2', 'queue:clear', 'queue:shuffle',
    'lyrics:page:1', 'lyrics:page:2',
    'playlist:play:12345', 'playlist:delete:12345', 'playlist:list', 'playlist:create:btn',
    'setup:channel:current', 'setup:channel:any', 'setup:dj:create', 'setup:dj:none',
    'premium:perks',
    'search:cancel',
    'help:cat:home', 'help:cat:music', 'help:cat:queue', 'help:cat:library', 'help:cat:premium', 'help:cat:dev',
    'settings:channel:current', 'settings:dj:none', 'settings:reset:confirm', 'settings:reset:cancel',
    'settings:view',
    'bogus:action' // unknown namespace must still be acknowledged
  ];

  for (const customId of cases) {
    const interaction = new MockInteraction({ customId });
    await router.handle(interaction); // must not throw
    assert.ok(interaction.acks.length >= 1, `button "${customId}" was never acknowledged`);
  }

  // The two previously-dead buttons must produce a visible response.
  const createBtn = new MockInteraction({ customId: 'playlist:create:btn' });
  await router.handle(createBtn);
  assert.equal(createBtn.acks[0]?.method, 'showModal', 'playlist:create:btn must open the create modal');
  assert.equal(createBtn.acks[0]?.modal.data.custom_id, 'modal:playlist:create');

  const viewBtn = new MockInteraction({ customId: 'settings:view' });
  await router.handle(viewBtn);
  assert.equal(viewBtn.acks[0]?.method, 'update', 'settings:view must render the settings dashboard');
});

test('router acknowledges select menus and shows modals for settings actions', async () => {
  const router = require(path.join(ROOT, 'src/handlers/InteractionRouter'));

  const selects = [
    { id: 'help:category', values: ['music'] },
    { id: 'filter:select', values: ['bassboost'] },
    { id: 'search:select', values: ['0'] },
    { id: 'playlist:select', values: ['nope'] }
  ];

  for (const s of selects) {
    const interaction = new MockInteraction({ kind: 'select', customId: s.id, values: s.values });
    await router.handle(interaction);
    assert.ok(interaction.acks.length >= 1, `select "${s.id}" was never acknowledged`);
  }

  // Settings select: prefix and volume open modals, others update in place.
  for (const [value, expectedMethod] of [
    ['prefix', 'showModal'],
    ['volume', 'showModal'],
    ['channels', 'update'],
    ['reset', 'update']
  ]) {
    const interaction = new MockInteraction({ kind: 'select', customId: 'settings:category', values: [value] });
    await router.handle(interaction);
    assert.equal(interaction.acks[0]?.method, expectedMethod, `settings:${value} should ${expectedMethod}`);
  }

  // Unsupported component types must not hang.
  const roleSelect = new MockInteraction({ kind: 'other' });
  roleSelect.isButton = () => false;
  roleSelect.isStringSelectMenu = () => false;
  roleSelect.isModalSubmit = () => false;
  roleSelect.isAutocomplete = () => false;
  await router.handle(roleSelect);
  assert.ok(roleSelect.acks.length >= 1, 'unsupported component type was never acknowledged');
});

test('settings modals validate input and update the dashboard', async () => {
  const router = require(path.join(ROOT, 'src/handlers/InteractionRouter'));

  const ok = new MockInteraction({
    kind: 'modal',
    customId: 'modal:settings:prefix',
    fieldValues: { settings_prefix: '>>' }
  });
  await router.handle(ok);
  assert.equal(ok.acks[0]?.method, 'update', 'valid prefix modal should update the dashboard');

  const bad = new MockInteraction({
    kind: 'modal',
    customId: 'modal:settings:volume',
    fieldValues: { settings_volume: '9999' }
  });
  await router.handle(bad);
  assert.equal(bad.acks[0]?.method, 'reply', 'invalid volume must be rejected with a reply');
  assert.ok(
    JSON.stringify(bad.acks[0].payload).includes('Error'),
    'invalid volume reply should be an error payload'
  );
});

// ---------------------------------------------------------------------------
// 5. queue logic against a real yukumo Queue
// ---------------------------------------------------------------------------

test('queue view pagination reflects real queue state', () => {
  const templates = require(path.join(ROOT, 'src/ui/templates'));
  const titles = ['Now Playing'];
  for (let i = 1; i <= 25; i++) titles.push(`Track ${i}`);
  const player = makePlayer(titles);

  const page1 = templates.buildQueueView(player, 1);
  const page1Json = JSON.stringify(page1);
  assert.ok(page1Json.includes('Page 1/'), 'page 1 header missing');
  assert.ok(page1Json.includes('Track 1'), 'upcoming tracks should be listed');

  const last = templates.buildQueueView(player, 99);
  const lastJson = JSON.stringify(last);
  assert.ok(lastJson.includes('Page 3/'), `expected 3 pages for 25 upcoming tracks, got: ${lastJson.match(/Page \d+\/\d+/)?.[0]}`);
});

test('queue index math used by /queue remove and move targets the right track', () => {
  const queue = new Queue();
  queue.enqueue(makeTrack('current'));
  queue.enqueue(makeTrack('t1'));
  queue.enqueue(makeTrack('t2'));
  queue.start();
  assert.equal(queue.currentTrack.title, 'current');

  // With current at index 0, upcoming position N maps to queue index N.
  const upcomingCount = queue.tracks.length - 1;
  const pos = 2;
  assert.ok(pos >= 1 && pos <= upcomingCount, 'position must be in range');
  const removed = queue.remove(pos, 1)[0];
  assert.equal(removed.title, 't2', 'position #2 should remove t2');
  assert.deepEqual(queue.tracks.map(t => t.title), ['current', 't1']);
});

test('native queue.previous() rewinds correctly (MusicManager.previous contract)', () => {
  const queue = new Queue();
  queue.enqueue(makeTrack('a'));
  queue.enqueue(makeTrack('b'));
  queue.start();
  assert.equal(queue.currentTrack.title, 'a');

  queue.next();
  assert.equal(queue.currentTrack.title, 'b');

  const prev = queue.previous();
  assert.equal(prev.title, 'a', 'previous() should return the history track');
  assert.equal(queue.currentTrack.title, 'a', 'previous() should restore it as current');
});

test('MusicManager.previous uses the queue cursor and plays the restored track', async () => {
  const musicManager = require(path.join(ROOT, 'src/managers/MusicManager'));
  const originalGetPlayer = musicManager.getPlayer.bind(musicManager);

  const queue = new Queue();
  queue.enqueue(makeTrack('a'));
  queue.enqueue(makeTrack('b'));
  queue.start();
  queue.next(); // now on 'b', history has 'a'

  let played = null;
  const fake = { queue, play: async (t) => { played = t; } };

  musicManager.getPlayer = () => fake;
  try {
    await musicManager.previous('g1');
  } finally {
    musicManager.getPlayer = originalGetPlayer;
  }

  assert.equal(played?.title, 'a', 'previous() should play the restored track');
  assert.equal(queue.currentTrack.title, 'a', 'queue cursor should point at the restored track');
});

test('MusicManager no longer double-handles empty queues via playerEmpty', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/managers/MusicManager.js'), 'utf8');
  assert.ok(!src.includes("on('playerEmpty'"), 'playerEmpty must not be registered — it aliases queueEnd');
  assert.ok(src.includes("on('queueEnd'"), 'queueEnd handler is required');
});

test("loop state is normalized: YuKumo 'none' renders and cycles as 'off'", async () => {
  const templates = require(path.join(ROOT, 'src/ui/templates'));
  const musicManager = require(path.join(ROOT, 'src/managers/MusicManager'));

  // Player view must not leak 'none' into the UI.
  const player = {
    currentTrack: makeTrack('x'),
    position: 1000,
    paused: false,
    loop: 'none',
    volume: 80,
    queue: { tracksList: [makeTrack('y')], repeatMode: 'none' }
  };
  const playerJson = JSON.stringify(await templates.buildPlayerView(player));
  assert.ok(!playerJson.includes('`none`'), 'player view must not display loop: none');
  assert.ok(playerJson.includes('`OFF`'), 'player view should display loop: OFF');

  // More-controls loop button must offer track next (not point at 'off' again).
  const moreJson = JSON.stringify(templates.buildMoreControlsView(player));
  assert.ok(moreJson.includes('player:loop:track'), 'loop cycle from off/none must target track');
  assert.ok(moreJson.includes('Loop: OFF'), 'loop button label should read OFF');

  // setLoop stores our vocabulary, not YuKumo's.
  const originalGetPlayer = musicManager.getPlayer.bind(musicManager);
  const fake = { setLoop() {}, loop: 'off' };
  musicManager.getPlayer = () => fake;
  try {
    const returned = musicManager.setLoop('g1', 'none');
    assert.equal(fake.loop, 'off', "setLoop('none') must store 'off'");
    assert.equal(returned, 'off', "setLoop('none') must return 'off'");
  } finally {
    musicManager.getPlayer = originalGetPlayer;
  }
});

// ---------------------------------------------------------------------------
// 6. player patching + middleware against native queue semantics
// ---------------------------------------------------------------------------

test('patchPlayer leaves the native boolean queue.isEmpty getter intact', () => {
  const musicManager = require(path.join(ROOT, 'src/managers/MusicManager'));
  const { Queue } = require('yukumo');

  const fake = {
    queue: new Queue(),
    status: 'playing',
    voiceChannelId: 'vc1',
    textChannelId: 'c1',
    setVoiceChannel() {},
    stop() {},
    clearFilters() {},
    setEqualizer() {},
    setTimescale() {},
    setRotation() {},
    setKaraoke() {}
  };

  const patched = musicManager.patchPlayer(fake);

  assert.equal(typeof patched.queue.isEmpty, 'boolean', 'queue.isEmpty must stay a native boolean');
  assert.equal(patched.queue.isEmpty, true, 'fresh queue should be empty');
  assert.equal(patched.playing, true, 'playing getter should reflect status');
  assert.equal(typeof patched.setTextChannel, 'function', 'setTextChannel shim required');
  assert.equal(patched.voiceId, 'vc1');
  assert.equal(patched.textId, 'c1');

  // Array enqueue patch must add every track.
  patched.queue.enqueue([makeTrack('x'), makeTrack('y')]);
  assert.equal(patched.queue.size, 2, 'array enqueue should add all tracks');
  assert.equal(patched.queue.isEmpty, false);
});

test('playerRequired middleware understands native queue.isEmpty', async () => {
  const musicManager = require(path.join(ROOT, 'src/managers/MusicManager'));
  const pipeline = require(path.join(ROOT, 'src/middleware/pipeline'));

  const emptyFake = { queue: new Queue(), currentTrack: null };
  const playingFake = { queue: new Queue(), currentTrack: makeTrack('a') };
  playingFake.queue.enqueue(makeTrack('b'));

  const context = {
    userId: 'user1',
    guildId: 'g1',
    member: makeMember(),
    voiceChannel: null,
    guild: { members: { me: {} } }
  };

  const originalGetPlayer = musicManager.getPlayer.bind(musicManager);
  try {
    musicManager.getPlayer = () => emptyFake;
    const emptyResult = await pipeline.execute({ name: 'test-empty', playerRequired: true }, context);
    assert.equal(emptyResult.allowed, false, 'empty queue must block playerRequired commands');

    musicManager.getPlayer = () => playingFake;
    const playingResult = await pipeline.execute({ name: 'test-playing', playerRequired: true }, context);
    assert.equal(playingResult.allowed, true, 'active track must allow playerRequired commands');
  } finally {
    musicManager.getPlayer = originalGetPlayer;
  }
});

// ---------------------------------------------------------------------------
// 6.5 regression guards for security / jump fixes
// ---------------------------------------------------------------------------

test('playlist delete enforces ownership and never wipes foreign tracks', () => {
  const playlistRepo = require(path.join(ROOT, 'src/database/repositories/PlaylistRepository'));
  const created = playlistRepo.create('owner-user', 'g1', 'Ownership Test List', '');
  playlistRepo.addTrack(created.id, makeTrack('keep-me'));

  // A foreign delete attempt must be a complete no-op.
  assert.equal(playlistRepo.delete(created.id, 'attacker-user'), false);
  const survived = playlistRepo.get(created.id);
  assert.ok(survived, 'playlist must survive a foreign delete attempt');
  assert.equal(survived.tracks.length, 1, 'foreign delete must not clear tracks');

  // The owner can still delete it (tracks included).
  assert.equal(playlistRepo.delete(created.id, 'owner-user'), true);
  assert.equal(playlistRepo.get(created.id), null);
});

test('/queue jump drives player.skipTo instead of skipping past the target', async () => {
  const queueCmd = require(path.join(ROOT, 'src/commands/queue/queue.js'));
  const musicManager = require(path.join(ROOT, 'src/managers/MusicManager'));

  const queue = new Queue();
  queue.enqueue(makeTrack('current'));
  queue.enqueue(makeTrack('t1'));
  queue.enqueue(makeTrack('t2'));
  queue.start();

  const fakePlayer = {
    queue,
    currentTrack: queue.currentTrack,
    skipToCalls: [],
    async skipTo(index) {
      this.skipToCalls.push(index);
      return queue.skipTo(index);
    }
  };

  const replies = [];
  const context = {
    isInteraction: true,
    guildId: 'g1',
    user: { id: 'user1' },
    source: {
      options: {
        getSubcommand: () => 'jump',
        getInteger: (name) => (name === 'position' ? 2 : null),
        getString: () => null
      }
    },
    getString: () => null,
    getInteger: (name) => (name === 'position' ? 2 : null),
    replySuccess: async (msg) => replies.push(['success', msg]),
    replyError: async (msg) => replies.push(['error', msg]),
    reply: async (payload) => replies.push(['reply', payload])
  };

  const originalGetPlayer = musicManager.getPlayer.bind(musicManager);
  musicManager.getPlayer = () => fakePlayer;
  try {
    await queueCmd.execute(context);
  } finally {
    musicManager.getPlayer = originalGetPlayer;
  }

  assert.deepEqual(fakePlayer.skipToCalls, [2], 'jump must call player.skipTo with the mapped queue index');
  assert.equal(queue.currentTrack.title, 't2', 'the jumped-to track must be the one playing');
  assert.equal(replies[0]?.[0], 'success', `expected a success reply, got: ${JSON.stringify(replies)}`);
});

// ---------------------------------------------------------------------------
// 6.6 cooldown timer correctness
// ---------------------------------------------------------------------------

test('a stale cooldown timer cannot wipe a newer cooldown early', async () => {
  const cooldownManager = require(path.join(ROOT, 'src/managers/CooldownManager'));
  const key = cooldownManager.getKey('cd-test', 'user1', 'g1');

  // First cooldown: 0.05s. Schedule its cleanup timer.
  cooldownManager.setCooldown('cd-test', 'user1', 'g1', 0.05);
  assert.ok(cooldownManager.isOnCooldown('cd-test', 'user1', 'g1', 0.05) > 0);

  // Wait for it to lapse, then set a much longer cooldown from the same key.
  await new Promise((r) => setTimeout(r, 70));
  cooldownManager.setCooldown('cd-test', 'user1', 'g1', 30);

  // The old timer fires ~120ms in. The long cooldown must survive it.
  await new Promise((r) => setTimeout(r, 150));
  const remaining = cooldownManager.isOnCooldown('cd-test', 'user1', 'g1', 30);
  assert.ok(remaining > 29, `new cooldown wiped by stale timer (remaining=${remaining})`);

  // Cleanup
  cooldownManager.cooldowns.delete(key);
});

// ---------------------------------------------------------------------------
// 7. autocomplete never hangs
// ---------------------------------------------------------------------------

test('autocomplete always responds, even with odd values', async () => {
  const autocomplete = require(path.join(ROOT, 'src/handlers/autocomplete/AutocompleteRouter'));

  const interaction = new MockInteraction({ kind: 'autocomplete', customId: undefined });
  interaction.commandName = 'help';
  interaction.options = { getFocused: () => ({ name: 'category', value: '' }) };

  await autocomplete.handle(interaction);
  assert.equal(interaction.acks[0]?.method, 'respond', 'autocomplete must respond');

  // A responder that throws once must fall back instead of hanging.
  const flaky = new MockInteraction({ kind: 'autocomplete' });
  flaky.commandName = 'help';
  flaky.options = { getFocused: () => ({ name: 'category', value: '' }) };
  let calls = 0;
  flaky.respond = () => {
    calls += 1;
    if (calls === 1) return Promise.reject(new Error('already acknowledged'));
    flaky.acks.push({ method: 'respond' });
    return Promise.resolve();
  };
  await autocomplete.handle(flaky);
  assert.equal(flaky.acks[0]?.method, 'respond', 'failed first respond must retry with []');
});
