/**
 * helpers/componentsV2.js - Discord Components V2 helpers
 * Chuyển Embed/ActionRow hiện có sang Container + TextDisplay + Separator + ActionRow.
 */

const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MediaGalleryBuilder,
  MessageFlags
} = require('discord.js');

const BRAND_FOOTER = 'kingmc.vn・axolotl stats・ntkhanh';

function normalizeColor(color) {
  if (typeof color === 'number' && Number.isFinite(color)) return color;
  if (typeof color === 'string') {
    const clean = color.replace(/^#/, '').trim();
    if (/^[0-9a-f]{6}$/i.test(clean)) return parseInt(clean, 16);
  }
  return null;
}

function buildTextParts(embedData) {
  const parts = [];

  if (embedData?.title) {
    parts.push(`## ${embedData.title}`);
  }

  if (embedData?.description) {
    parts.push(String(embedData.description));
  }

  if (Array.isArray(embedData?.fields)) {
    for (const field of embedData.fields) {
      if (!field) continue;
      const name = field.name ? String(field.name) : '';
      const value = field.value ? String(field.value) : '';
      if (name && value) {
        parts.push(`**${name}**\n${value}`);
      } else if (value) {
        parts.push(value);
      } else if (name) {
        parts.push(`**${name}**`);
      }
    }
  }

  if (embedData?.footer?.text && embedData.footer.text !== BRAND_FOOTER) {
    parts.push(`*${embedData.footer.text}*`);
  }

  parts.push(`**${BRAND_FOOTER}**`);
  return parts;
}

function chunkText(text, maxLength = 3900) {
  const value = String(text || '').trim();
  if (!value) return [];
  if (value.length <= maxLength) return [value];

  const chunks = [];
  let remaining = value;
  while (remaining.length > maxLength) {
    let cut = remaining.lastIndexOf('\n', maxLength);
    if (cut < Math.floor(maxLength * 0.5)) cut = remaining.lastIndexOf(' ', maxLength);
    if (cut < Math.floor(maxLength * 0.5)) cut = maxLength;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function toComponentsV2({
  embed = null,
  actionRow = null,
  imageAttachmentName = null,
  imageUrl = null,
  extraText = null,
  accentColor = null
} = {}) {
  const embedData = embed?.toJSON ? embed.toJSON() : (embed || {});
  const container = new ContainerBuilder();

  const color = normalizeColor(accentColor ?? embedData.color);
  if (color !== null) container.setAccentColor(color);

  const textParts = buildTextParts(embedData);
  if (extraText) textParts.push(String(extraText));

  for (const part of textParts) {
    for (const chunk of chunkText(part)) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(chunk)
      );
    }
  }

  const resolvedImageUrl = imageAttachmentName
    ? `attachment://${imageAttachmentName}`
    : (imageUrl || embedData?.image?.url || null);

  if (resolvedImageUrl) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder({
        items: [
          {
            media: { url: resolvedImageUrl }
          }
        ]
      })
    );
  }

  if (actionRow) {
    container.addSeparatorComponents(
      new SeparatorBuilder({
        divider: true,
        spacing: SeparatorSpacingSize.Small
      })
    );
    container.addActionRowComponents(actionRow);
  }

  return container;
}

function v2Payload(options = {}) {
  const payload = {
    flags: MessageFlags.IsComponentsV2,
    components: [toComponentsV2(options)]
  };

  if (Array.isArray(options.files) && options.files.length > 0) {
    payload.files = options.files;
  }
  if (options.ephemeral) {
    payload.flags = MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral;
  }

  return payload;
}

function v2RawPayload(components, { files = null, ephemeral = false } = {}) {
  const payload = {
    flags: ephemeral
      ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      : MessageFlags.IsComponentsV2,
    components: Array.isArray(components) ? components : [components]
  };
  if (Array.isArray(files) && files.length > 0) {
    payload.files = files;
  }
  return payload;
}

function v2Text(text, { actionRow = null, accentColor = null, ephemeral = false } = {}) {
  const container = new ContainerBuilder();
  if (accentColor !== null) {
    const color = normalizeColor(accentColor);
    if (color !== null) container.setAccentColor(color);
  }

  for (const chunk of chunkText(text)) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(chunk)
    );
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`**${BRAND_FOOTER}**`)
  );

  if (actionRow) {
    container.addSeparatorComponents(
      new SeparatorBuilder({
        divider: true,
        spacing: SeparatorSpacingSize.Small
      })
    );
    container.addActionRowComponents(actionRow);
  }

  return {
    flags: ephemeral
      ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
      : MessageFlags.IsComponentsV2,
    components: [container]
  };
}

module.exports = {
  BRAND_FOOTER,
  toComponentsV2,
  v2Payload,
  v2RawPayload,
  v2Text,
  chunkText
};
