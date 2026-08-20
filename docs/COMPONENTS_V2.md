# Discord Components V2 — Architecture & Implementation Guide

This guide details how Kira completely replaces legacy Discord embeds with the native **Discord Components V2** UI paradigm.

---

## 1. What is Discord Components V2?

Discord Components V2 is the modern message layout system that deprecates legacy Embed structures in favor of modular, hierarchical components with native containers, sections, and structured typography.

### Message Flag Requirement
To render top-level containers and Component V2 layouts properly, Kira sends the `IS_COMPONENTS_V2` message flag:
```javascript
flags: 1 << 15 // 32768
```

---

## 2. Component Types & Layout Model

Kira defines and implements all core Components V2 structures:

| Component Type | Integer Value | Description |
| :--- | :---: | :--- |
| **ActionRow** | `1` | Container holding up to 5 interactive buttons or 1 select menu |
| **Button** | `2` | Interactive button (Primary, Secondary, Success, Danger, Link) |
| **StringSelect** | `3` | Dropdown menu allowing selection of one or multiple options |
| **TextInput** | `4` | Modal text input field |
| **UserSelect** | `5` | Dropdown selector for Discord users |
| **RoleSelect** | `6` | Dropdown selector for server roles |
| **ChannelSelect** | `8` | Dropdown selector for server channels |
| **Section** | `9` | Grouping containing TextDisplay and optional accessory components |
| **TextDisplay** | `10` | Markdown text display without legacy embed length constraints |
| **Thumbnail** | `11` | Image preview thumbnail |
| **Separator** | `14` | Visual divider line with configurable spacing (`1` or `2`) |
| **Container** | `17` | Root or nested card container with optional accent colors and spoiler tags |

---

## 3. Builder Classes (`src/ui/componentsV2.js`)

Kira provides a lightweight, pure JS builder library:

```javascript
const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectBuilder,
  createV2Payload
} = require('./src/ui/componentsV2');
```

### Example: Constructing a Modern Card

```javascript
const container = new ContainerBuilder(0x5865F2)
  .addComponents(
    new TextDisplayBuilder('### Audio Stream Active\nNow streaming high-fidelity audio.'),
    new SeparatorBuilder(true, 1),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('player:pause').setLabel('Pause').setStyle('PRIMARY'),
      new ButtonBuilder().setCustomId('player:skip').setLabel('Skip').setStyle('SECONDARY')
    )
  );

const payload = createV2Payload(container, { ephemeral: false });
// Returns: { flags: 32768, components: [ ... ] }
```

---

## 4. UI Patterns Implemented Across Kira

1. **Persistent Music Player**: Outer `Container` (`0x5865F2`), Attached Skia Canvas Banner, Track Metadata `TextDisplay`, `Separator`, Primary Playback Controls `ActionRow`, and Auxiliary Tools `ActionRow`.
2. **Paginated Server Queue**: Header with queue statistics, `Separator`, numbered track entries `TextDisplay`, `Separator`, and Pagination Controls `ActionRow`.
3. **Settings Dashboard**: Server configuration summary, `Separator`, and multi-option category `StringSelect`.
4. **Interactive Setup Wizard**: Dynamic step progression cards with action buttons.
5. **Interactive Help Browser**: Domain category selector updating the same message without chat clutter.
6. **Error & Notification Cards**: Clean, dark cards (`0xE74C3C` Danger, `0x2ECC71` Success, `0xF1C40F` Warning) with zero unnecessary emojis.
