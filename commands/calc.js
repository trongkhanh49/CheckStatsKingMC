/**
 * /calc spawners - Máy tính xương từ số lượng spawner.
 */
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { renderSpawnerCalculator } = require('../helpers/renderHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('Máy tính lợi nhuận và sản lượng KingMC')
    .addSubcommand(sub => sub
      .setName('spawners')
      .setDescription('Tính sản lượng Xương từ số lượng Spawner')
      .addIntegerOption(o => o.setName('spawners').setDescription('Số lượng Spawner').setRequired(true).setMinValue(1))
      .addNumberOption(o => o.setName('bone_per_spawner').setDescription('Xương trung bình / Spawner').setRequired(false).setMinValue(0))
      .addNumberOption(o => o.setName('bone_price').setDescription('Giá bán 1 Xương').setRequired(false).setMinValue(0))
      .addNumberOption(o => o.setName('cost').setDescription('Chi phí tổng').setRequired(false).setMinValue(0))
    ),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      if (interaction.options.getSubcommand() !== 'spawners') {
        return interaction.editReply({ content: '❌ Subcommand không hợp lệ.' });
      }
      const spawners = interaction.options.getInteger('spawners', true);
      const bonePerSpawner = interaction.options.getNumber('bone_per_spawner') ?? Number(process.env.BONE_PER_SPAWNER || 1);
      const bonePrice = interaction.options.getNumber('bone_price') ?? Number(process.env.BONE_PRICE || 160);
      const cost = interaction.options.getNumber('cost') ?? Number(process.env.BONE_CALC_COST || 0);
      const drops = spawners * bonePerSpawner;
      const revenue = drops * bonePrice;
      const profit = revenue - cost;
      const ratio = spawners > 0 ? drops / spawners : 0;

      const image = await renderSpawnerCalculator({ spawners, drops, ratio, profit, title: 'Máy Tính Xương' });
      const attachment = new AttachmentBuilder(image, { name: 'calc_spawners.png' });
      return interaction.editReply({ embeds: [new EmbedBuilder().setImage('attachment://calc_spawners.png').setColor('#2b2d31')], files: [attachment] });
    } catch (error) {
      console.error('[Calc] Lỗi /calc spawners:', error);
      return interaction.editReply({ content: `❌ Không thể tính: ${error.message}` });
    }
  }
};
