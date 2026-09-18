const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');

const OWNER_ID = (process.env.ADMIN_ID || process.env.OWNER_ID || '').trim();
const CHANNEL_NAME = 'kingx-update';

function getAttachments(interaction) {
  const files = [];
  for (let i = 1; i <= 10; i++) {
    const attachment = interaction.options.getAttachment(`anh${i}`);
    if (attachment) files.push(attachment.url);
  }
  return files;
}

function progress(status, startedAt, created = false, error = '') {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  return [
    '📢 **THÔNG BÁO KINGX**',
    `**Trạng thái:** ${status}`,
    `**Kênh:** #${CHANNEL_NAME}`,
    `**Tiến trình:** ${status.includes('thành công') ? '1/1 (100%)' : '0/1 (0%)'}`,
    status.includes('thành công') ? '████████████████████' : '░░░░░░░░░░░░░░░░░░░░',
    `⏱️ Thời gian: **${elapsed}s**`,
    created ? '🆕 Đã tạo kênh mới.' : '',
    error ? `\n❌ **Lỗi:** ${error}` : ''
  ].filter(Boolean).join('\n');
}

async function findOrCreateUpdateChannel(guild, client) {
  const existing = guild.channels.cache.find(
    channel => channel.type === ChannelType.GuildText &&
      channel.name.toLowerCase() === CHANNEL_NAME
  );

  if (existing) return { channel: existing, created: false };

  // Use IDs only. Do not pass User/Role objects to the permission resolver.
  const everyoneId = guild.roles.everyone.id;
  const ownerId = guild.ownerId;
  const botId = client.user.id;

  const permissionOverwrites = [
    {
      id: everyoneId,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: botId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory
      ]
    },
    {
      id: ownerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  // Add every non-managed role that has Manage Server permission.
  for (const [roleId, role] of guild.roles.cache) {
    if (roleId === everyoneId || role.managed) continue;
    if (role.permissions.has(PermissionFlagsBits.ManageGuild)) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }
  }

  const channel = await guild.channels.create({
    name: CHANNEL_NAME,
    type: ChannelType.GuildText,
    topic: 'Kênh thông báo KingX',
    permissionOverwrites,
    reason: 'Tạo kênh kingx-update cho /thongbao'
  });

  return { channel, created: true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thongbao')
    .setDescription('Gửi thông báo vào kênh kingx-update.')
    .addStringOption(o =>
      o.setName('noidung')
        .setDescription('Nội dung thông báo')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addAttachmentOption(o => o.setName('anh1').setDescription('Ảnh 1'))
    .addAttachmentOption(o => o.setName('anh2').setDescription('Ảnh 2'))
    .addAttachmentOption(o => o.setName('anh3').setDescription('Ảnh 3'))
    .addAttachmentOption(o => o.setName('anh4').setDescription('Ảnh 4'))
    .addAttachmentOption(o => o.setName('anh5').setDescription('Ảnh 5'))
    .addAttachmentOption(o => o.setName('anh6').setDescription('Ảnh 6'))
    .addAttachmentOption(o => o.setName('anh7').setDescription('Ảnh 7'))
    .addAttachmentOption(o => o.setName('anh8').setDescription('Ảnh 8'))
    .addAttachmentOption(o => o.setName('anh9').setDescription('Ảnh 9'))
    .addAttachmentOption(o => o.setName('anh10').setDescription('Ảnh 10')),

  async execute(interaction) {
    if (!OWNER_ID || interaction.user.id !== OWNER_ID) {
      return interaction.reply({
        content: '❌ Chỉ chủ bot mới có thể sử dụng /thongbao.',
        ephemeral: true
      });
    }

    if (!interaction.guild) {
      return interaction.reply({
        content: '❌ Lệnh này chỉ dùng trong server.',
        ephemeral: true
      });
    }

    const content = interaction.options.getString('noidung', true);
    const files = getAttachments(interaction);
    const startedAt = Date.now();

    await interaction.deferReply({ ephemeral: true });

    try {
      const { channel, created } =
        await findOrCreateUpdateChannel(interaction.guild, interaction.client);

      await interaction.editReply(
        progress(
          created ? 'Đã tạo kênh, đang gửi...' : 'Đã tìm thấy kênh, đang gửi...',
          startedAt,
          created
        )
      );

      const sent = await channel.send({
        content,
        files,
        allowedMentions: { parse: [] }
      });

      await interaction.editReply(
        progress('Gửi thành công.', startedAt, created) +
        `\n🖼️ Ảnh: **${files.length}/10**\n📨 Message ID: **${sent.id}**`
      );
    } catch (error) {
      console.error('[THONGBAO]', error);

      await interaction.editReply(
        progress('Gửi thất bại.', startedAt, false, error.message)
      );
    }
  }
};
