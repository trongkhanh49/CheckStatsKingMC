const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');

const OWNER_ID = (process.env.ADMIN_ID || process.env.OWNER_ID || '').trim();
const CHANNEL_NAME = 'kingx-update';

function getFiles(interaction) {
  const files = [];
  for (let i = 1; i <= 10; i++) {
    const a = interaction.options.getAttachment(`anh${i}`);
    if (a) files.push(a.url);
  }
  return files;
}

function statusText(status, files, startedAt, extra = '') {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const done = status === 'Gửi thành công.' ? 1 : 0;
  return [
    '📢 **THÔNG BÁO KINGX**',
    `**Trạng thái:** ${status}`,
    `**Kênh:** #${CHANNEL_NAME}`,
    `**Tiến trình:** ${done}/1 (${done ? 100 : 0}%)`,
    done ? '████████████████████' : '░░░░░░░░░░░░░░░░░░░░',
    `🖼️ Ảnh: **${files.length}/10**`,
    `⏱️ Thời gian: **${elapsed}s**`,
    extra
  ].filter(Boolean).join('\n');
}

async function findOrCreateChannel(guild, client) {
  // Always search by name first.
  const existing = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText &&
         c.name.toLowerCase() === CHANNEL_NAME
  );
  if (existing) return { channel: existing, created: false };

  // Fetch the actual cached objects before putting them into permissionOverwrites.
  // This avoids "Supplied parameter is not a cached User or Role".
  const [botMember, ownerMember, roles] = await Promise.all([
          guild.members.fetch(client.user.id),
          guild.members.fetch(guild.ownerId),
          guild.roles.fetch()
        ]);

        const everyoneRole = roles?.everyone || null;
        const overwrites = [];

        // Có @everyone: ẩn kênh với tất cả thành viên.
        if (everyoneRole) {
          overwrites.push({
            id: everyoneRole.id,
            deny: [PermissionFlagsBits.ViewChannel]
          });

          // Bot luôn được xem/gửi tin nhắn/ảnh.
          overwrites.push({
            id: botMember.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });

          // Server Owner được xem kênh.
          overwrites.push({
            id: ownerMember.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.ReadMessageHistory
            ]
          });

          // Role có Manage Server được xem kênh.
          for (const role of roles.values()) {
            if (
              role.id !== everyoneRole.id &&
              role.permissions.has(PermissionFlagsBits.ManageGuild)
            ) {
              overwrites.push({
                id: role.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              });
            }
          }
        }

        // Nếu không lấy được @everyone thì KHÔNG làm command crash:
        // tạo public channel theo yêu cầu.
        channel = await guild.channels.create({
          name: "kingx-update",
          type: ChannelType.GuildText,
          ...(overwrites.length ? { permissionOverwrites: overwrites } : {})
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
    const files = getFiles(interaction);
    const startedAt = Date.now();

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await findOrCreateChannel(
        interaction.guild,
        interaction.client
      );

      await interaction.editReply(
        statusText(
          result.created
            ? 'Đã tạo kênh, đang gửi...'
            : 'Đã tìm thấy kênh, đang gửi...',
          files,
          startedAt
        )
      );

      const sent = await result.channel.send({
        content,
        files,
        allowedMentions: { parse: [] }
      });

      await interaction.editReply(
        statusText(
          'Gửi thành công.',
          files,
          startedAt,
          `${result.created ? '🆕 Kênh vừa được tạo.' : '♻️ Dùng kênh đã có.'}\n📨 Message ID: **${sent.id}**`
        )
      );
    } catch (error) {
      console.error('[THONGBAO]', error);
      await interaction.editReply(
        statusText('Gửi thất bại.', files, startedAt, `❌ **Lỗi:** ${error.message}`)
      );
    }
  }
};
