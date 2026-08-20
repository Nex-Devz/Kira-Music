const { COMPONENT_TYPES, BUTTON_STYLES, MESSAGE_FLAGS, COLORS } = require('../config/constants');

class TextDisplayBuilder {
  constructor(content = '') {
    this.type = COMPONENT_TYPES.TEXT_DISPLAY;
    this.content = content;
  }

  setContent(content) {
    this.content = String(content);
    return this;
  }

  toJSON() {
    return {
      type: this.type,
      content: this.content
    };
  }
}

class SeparatorBuilder {
  constructor(divider = true, spacing = 1) {
    this.type = COMPONENT_TYPES.SEPARATOR;
    this.divider = Boolean(divider);
    this.spacing = spacing; // 1 = Small, 2 = Large
  }

  setDivider(divider) {
    this.divider = Boolean(divider);
    return this;
  }

  setSpacing(spacing) {
    this.spacing = spacing;
    return this;
  }

  toJSON() {
    return {
      type: this.type,
      divider: this.divider,
      spacing: this.spacing
    };
  }
}

class SectionBuilder {
  constructor() {
    this.type = COMPONENT_TYPES.SECTION;
    this.components = [];
    this.accessory = null;
  }

  addText(content) {
    if (typeof content === 'string') {
      this.components.push(new TextDisplayBuilder(content).toJSON());
    } else if (content && typeof content.toJSON === 'function') {
      this.components.push(content.toJSON());
    } else if (content && content.type === COMPONENT_TYPES.TEXT_DISPLAY) {
      this.components.push(content);
    }
    return this;
  }

  setAccessory(accessory) {
    if (accessory && typeof accessory.toJSON === 'function') {
      this.accessory = accessory.toJSON();
    } else {
      this.accessory = accessory;
    }
    return this;
  }

  toJSON() {
    const data = {
      type: this.type,
      components: this.components
    };
    if (this.accessory) {
      data.accessory = this.accessory;
    }
    return data;
  }
}

class ButtonBuilder {
  constructor() {
    this.type = COMPONENT_TYPES.BUTTON;
    this.style = BUTTON_STYLES.SECONDARY;
    this.custom_id = null;
    this.label = '';
    this.url = null;
    this.disabled = false;
  }

  setStyle(style) {
    this.style = typeof style === 'string' ? (BUTTON_STYLES[style.toUpperCase()] || BUTTON_STYLES.SECONDARY) : style;
    return this;
  }

  setCustomId(id) {
    this.custom_id = String(id);
    return this;
  }

  setLabel(label) {
    this.label = String(label);
    return this;
  }

  setUrl(url) {
    this.url = String(url);
    this.style = BUTTON_STYLES.LINK;
    return this;
  }

  setDisabled(disabled = true) {
    this.disabled = Boolean(disabled);
    return this;
  }

  toJSON() {
    const data = {
      type: this.type,
      style: this.style,
      label: this.label,
      disabled: this.disabled
    };
    if (this.url) {
      data.url = this.url;
    } else if (this.custom_id) {
      data.custom_id = this.custom_id;
    }
    return data;
  }
}

class StringSelectBuilder {
  constructor() {
    this.type = COMPONENT_TYPES.STRING_SELECT;
    this.custom_id = '';
    this.placeholder = '';
    this.min_values = 1;
    this.max_values = 1;
    this.options = [];
    this.disabled = false;
  }

  setCustomId(id) {
    this.custom_id = String(id);
    return this;
  }

  setPlaceholder(placeholder) {
    this.placeholder = String(placeholder);
    return this;
  }

  setMinValues(min) {
    this.min_values = min;
    return this;
  }

  setMaxValues(max) {
    this.max_values = max;
    return this;
  }

  setDisabled(disabled = true) {
    this.disabled = Boolean(disabled);
    return this;
  }

  addOption(label, value, description = null, isDefault = false) {
    const opt = {
      label: String(label).substring(0, 100),
      value: String(value).substring(0, 100),
      default: Boolean(isDefault)
    };
    if (description) {
      opt.description = String(description).substring(0, 100);
    }
    this.options.push(opt);
    return this;
  }

  setOptions(options) {
    this.options = options.map(o => ({
      label: String(o.label).substring(0, 100),
      value: String(o.value).substring(0, 100),
      description: o.description ? String(o.description).substring(0, 100) : undefined,
      default: Boolean(o.default)
    }));
    return this;
  }

  toJSON() {
    return {
      type: this.type,
      custom_id: this.custom_id,
      placeholder: this.placeholder || undefined,
      min_values: this.min_values,
      max_values: this.max_values,
      options: this.options,
      disabled: this.disabled
    };
  }
}

class ActionRowBuilder {
  constructor() {
    this.type = COMPONENT_TYPES.ACTION_ROW;
    this.components = [];
  }

  addComponents(...components) {
    for (const comp of components) {
      if (Array.isArray(comp)) {
        this.addComponents(...comp);
      } else if (comp && typeof comp.toJSON === 'function') {
        this.components.push(comp.toJSON());
      } else if (comp && typeof comp === 'object') {
        this.components.push(comp);
      }
    }
    return this;
  }

  toJSON() {
    return {
      type: this.type,
      components: this.components
    };
  }
}

class ContainerBuilder {
  constructor(accentColor = COLORS.PRIMARY) {
    this.type = COMPONENT_TYPES.CONTAINER;
    this.accent_color = accentColor;
    this.spoiler = false;
    this.components = [];
  }

  setAccentColor(color) {
    this.accent_color = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
    return this;
  }

  setSpoiler(spoiler = true) {
    this.spoiler = Boolean(spoiler);
    return this;
  }

  addComponents(...components) {
    for (const comp of components) {
      if (Array.isArray(comp)) {
        this.addComponents(...comp);
      } else if (comp && typeof comp.toJSON === 'function') {
        this.components.push(comp.toJSON());
      } else if (comp && typeof comp === 'object') {
        this.components.push(comp);
      }
    }
    return this;
  }

  toJSON() {
    const data = {
      type: this.type,
      components: this.components
    };
    if (this.accent_color !== undefined && this.accent_color !== null) {
      data.accent_color = this.accent_color;
    }
    if (this.spoiler) {
      data.spoiler = true;
    }
    return data;
  }
}

/**
 * Builds standard V2 message structure with flags
 */
function createV2Payload(containerOrComponents, options = {}) {
  let componentsArray = [];
  if (Array.isArray(containerOrComponents)) {
    componentsArray = containerOrComponents.map(c => (typeof c.toJSON === 'function' ? c.toJSON() : c));
  } else if (containerOrComponents) {
    componentsArray = [typeof containerOrComponents.toJSON === 'function' ? containerOrComponents.toJSON() : containerOrComponents];
  }

  const payload = {
    flags: (options.ephemeral ? MESSAGE_FLAGS.EPHEMERAL : 0) | MESSAGE_FLAGS.IS_COMPONENTS_V2,
    components: componentsArray
  };

  if (options.content) payload.content = options.content;
  if (options.files) payload.files = options.files;

  return payload;
}

module.exports = {
  TextDisplayBuilder,
  SeparatorBuilder,
  SectionBuilder,
  ButtonBuilder,
  StringSelectBuilder,
  ActionRowBuilder,
  ContainerBuilder,
  createV2Payload
};
