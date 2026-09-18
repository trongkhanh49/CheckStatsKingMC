/**
 * commands/leaderboard.js - /leaderboard <query>
 * Map natural-language queries to the exact KingMC leaderboard identifiers.
 */
const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const { renderLeaderboardImage } = require('../helpers/renderHelper');

const LEADERBOARD_NAMES = [
  'blocks_mined',
  'blocks_placed',
  'breed',
  'buy_total',
  'deaths',
  'kills',
  'mob_kills',
  'money',
  'played',
  'sell_total',
  'shards'
];

const ALIASES = new Map([
  ['block mine', 'blocks_mined'],
  ['blocks mined', 'blocks_mined'],
  ['blocks_mined', 'blocks_mined'],
  ['block mined', 'blocks_mined'],
  ['block placed', 'blocks_placed'],
  ['blocks placed', 'blocks_placed'],
  ['blocks_placed', 'blocks_placed'],
  ['animals breed', 'breed'],
  ['animal breed', 'breed'],
  ['breed', 'breed'],
  ['shop buy', 'buy_total'],
  ['buy total', 'buy_total'],
  ['buy_total', 'buy_total'],
  ['shop sell', 'sell_total'],
  ['sell total', 'sell_total'],
  ['sell_total', 'sell_total'],
  ['mob kills', 'mob_kills'],
  ['mob_kill', 'mob_kills'],
  ['mob_kills', 'mob_kills'],
  ['shard', 'shards'],
  ['shards', 'shards'],
  ['money', 'money'],
  ['deaths', 'deaths'],
  ['kills', 'kills'],
  ['played', 'played']
]);

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/\s+/g, ' ');
}

function resolveLeaderboardName(query) {
  const normalized = normalize(query);
  return ALIASES.get(normalized) || (LEADERBOARD_NAMES.includes(normalized) ? normalized : null);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Xem Top 1-10 leaderboard KingMC')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Tên leaderboard, ví dụ: blocks_mined, shards')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = normalize(interaction.options.getString('query'));
    const choices = LEADERBOARD_NAMES
      .filter(name => !focused || name.includes(focused))
      .slice(0, 25)
      .map(name => ({ name, value: name }));

    // Khi người dùng gõ tự nhiên, vẫn đưa các tên server thật vào gợi ý.
    if (choices.length === 0) {
      for (const name of LEADERBOARD_NAMES) {
        choices.push({ name, value: name });
        if (choices.length >= 25) break;
      }
    }

    await interaction.respond(choices);
  },

  async execute(interaction, queueDispatcher) {
    const rawQuery = interaction.options.getString('query', true).trim();
    const leaderboard = resolveLeaderboardName(rawQuery);

    await interaction.deferReply();

    if (!leaderboard) {
      return interaction.editReply({
        content:
          '❌ Leaderboard không hợp lệ.\n' +
          `Tên được hỗ trợ: ${LEADERBOARD_NAMES.map(name => `\`${name}\``).join(', ')}`
      });
    }

    const timeoutMs = parseInt(process.env.BOT_CHECK_TIMEOUT, 10) || 20000;

    try {
      const result = await queueDispatcher.enqueueTask('leaderboard', leaderboard, timeoutMs);
      const entries = Array.isArray(result?.entries) ? result.entries.slice(0, 10) : [];

      if (entries.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`🏆 Leaderboard: ${leaderboard}`)
              .setDescription('⚠️ Không đọc được dữ liệu Top 1-10 từ bảng leaderboard.')
              .setColor('#ef4444')
              .setTimestamp()
              .setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })
          ]
        });
      }

      try {
        const imageBuffer = await renderLeaderboardImage(leaderboard, entries);
        const attachment = new AttachmentBuilder(imageBuffer, {
          name: `leaderboard_${leaderboard}.png`
        });

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setImage(`attachment://leaderboard_${leaderboard}.png`)
              .setColor('#2b2d31')
              .setTimestamp()
              .setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })
          ],
          files: [attachment]
        });
      } catch (renderError) {
        console.error(`[Discord-Bot] Render leaderboard thất bại: ${renderError.message}`);
        const lines = entries.map((entry, index) =>
          `**#${index + 1}** ${entry.player || 'Unknown'} — **${entry.value || 'N/A'}**`
        );
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle(`🏆 Leaderboard: ${leaderboard}`)
              .setDescription(lines.join('\n'))
              .setColor('#2b2d31')
              .setTimestamp()
              .setFooter({ text: 'KingX • Thiết kế bởi ntkhanh' })
          ]
        });
      }
    } catch (error) {
      console.error(`[Discord-Bot] Lỗi leaderboard ${leaderboard}:`, error.message);
      return interaction.editReply({
        content: `❌ Không thể lấy leaderboard \`${leaderboard}\`: ${error.message}`
      });
    }
  }
};
