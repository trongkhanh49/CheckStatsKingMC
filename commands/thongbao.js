const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  OverwriteType
} = require('discord.js');

const OWNER_ID = (process.env.ADMIN_ID || process.env.OWNER_ID || '').trim();
const CHANNEL_NAME = 'kingx-update';
const UPDATE_MS = 1200;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function progress(stage, sent, total, startedAt, extra = '') {
  const pct = total ? Math.floor(sent / total * 100) : 0;
  const width = 20;
  const filled = Math.round(pct / 100 * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);

  return [
    '📢 **THÔNG BÁO KINGX**',
    '',
    `**Trạng thái:** ${stage}`,
    `**Kênh:** #${CHANNEL_NAME}`,
    `**Tiến trình:** ${sent}/${total} (${pct}%)`,
    bar,
    `🖼️ Ảnh: **${total}**`,
    `⏱️ Thời gian: **${elapsed}s**`,
    extra
  ].filter(Boolean).join('\n');
}

async function getOrCreateUpdateChannel(guild, client) {
  let channel = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.name === CHANNEL_NAME
  );

  if (channel) return { channel, created: false };

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  // Các role có Manage Server được xem kênh.
  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.roles.everyone.id || role.managed) continue;
    if (role.permissions.has(PermissionFlagsBits.ManageGuild)) {
      overwrites.push({
        id: role.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
      });
    }
  }

  // Chủ server luôn được xem.
  overwrites.push({
    id: guild.ownerId,
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
  });

  channel = await guild.channels.create({
    name: CHANNEL_NAME,
    type: ChannelType.GuildText,
    topic: 'Kênh thông báo chính thức của KingX',
    permissionOverwrites: overwrites,
    reason: 'Tự động tạo kênh KingX Update cho /thongbao'
  });

  return { channel, created: true };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thongbao')
    .setDescription('Gửi thông báo vào kênh kingx-update.')
    .addStringOption(o => o.setName('noidung').setDescription('Nội dung thông báo').setRequired(true).setMaxLength(2000))
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
      return interaction.reply({ content: '❌ Chỉ chủ bot mới có thể sử dụng /thongbao.', ephemeral: true });
    }

    if (!interaction.guild) {
      return interaction.reply({ content: '❌ Lệnh này chỉ dùng trong server.', ephemeral: true });
    }

    const content = interaction.options.getString('noidung', true);
    const files = [];

    for (let i = 1; i <= 10; i++) {
      const a = interaction.options.getAttachment(`anh${i}`);
      if (a) files.push(a.url);
    }

    await interaction.deferReply({ ephemeral: true });
    const startedAt = Date.now();

    try {
      const result = await getOrCreateUpdateChannel(interaction.guild, interaction.client);
      const channel = result.channel;

      await interaction.editReply(
        progress(result.created ? 'Đã tạo kênh, đang chuẩn bị gửi...' : 'Đã tìm thấy kênh, đang chuẩn bị gửi...', 0, files.length, startedAt)
      );

      // Discord cho phép gửi tối đa 10 attachment trong một message.
      // Một thông báo được gửi thành một message duy nhất.
      await sleep(250);

      const message = await channel.send({
        content,
        files
      });

      await interaction.editReply(
        progress('Đã gửi thông báo thành công.', files.length, files.length, startedAt,
          `\n📨 Message ID: **${message.id}**\n${result.created ? '🆕 Kênh vừa được tạo.' : '♻️ Sử dụng kênh đã có.'}`)
      );
    } catch (err) {
      console.error('[THONGBAO]', err);
      await interaction.editReply(
        progress('Gửi thất bại.', 0, files.length, startedAt, `\n❌ **Lỗi:** ${err.message}`)
      );
    }
  }
};
