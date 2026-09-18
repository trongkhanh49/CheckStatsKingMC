/**
 * /smoker - Máy tính lợi nhuận Blaze + Bone, render HTML -> PNG.
 */
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { renderSmokerCalculator } = require('../helpers/renderHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('smoker')
    .setDescription('Máy tính lợi nhuận qua Blaze và Bone')
    .addIntegerOption(o => o.setName('spawners').setDescription('Số lượng Spawner').setRequired(true).setMinValue(1))
    .addNumberOption(o => o.setName('blaze_per_spawner').setDescription('Que Blaze / Spawner').setRequired(false).setMinValue(0))
    .addNumberOption(o => o.setName('bone_per_spawner').setDescription('Xương / Spawner').setRequired(false).setMinValue(0))
    .addNumberOption(o => o.setName('blaze_price').setDescription('Giá bán 1 Que Blaze').setRequired(false).setMinValue(0))
    .addNumberOption(o => o.setName('bone_price').setDescription('Giá bán 1 Xương').setRequired(false).setMinValue(0))
    .addNumberOption(o => o.setName('cost').setDescription('Chi phí tổng').setRequired(false).setMinValue(0)),

  async execute(interaction) {
    await interaction.deferReply();
    try {
      const spawners = interaction.options.getInteger('spawners', true);
      const blazePerSpawner = interaction.options.getNumber('blaze_per_spawner') ?? Number(process.env.BLAZE_PER_SPAWNER || 1);
      const bonePerSpawner = interaction.options.getNumber('bone_per_spawner') ?? Number(process.env.BONE_PER_SPAWNER || 1);
      const blazePrice = interaction.options.getNumber('blaze_price') ?? Number(process.env.BLAZE_PRICE || 150);
      const bonePrice = interaction.options.getNumber('bone_price') ?? Number(process.env.BONE_PRICE || 160);
      const cost = interaction.options.getNumber('cost') ?? Number(process.env.SMOKER_COST || 0);

      const blaze = spawners * blazePerSpawner;
      const bone = spawners * bonePerSpawner;
      const revenue = blaze * blazePrice + bone * bonePrice;
      const profit = revenue - cost;
      const totalOutput = blaze + bone;
      const ratio = totalOutput / spawners;

      const image = await renderSmokerCalculator({
        spawners, blaze, bone, totalOutput, ratio, blazePrice, bonePrice, cost, revenue, profit,
        title: 'Máy Tính Lợi Nhuận'
      });
      const attachment = new AttachmentBuilder(image, { name: 'smoker.png' });
      return interaction.editReply({ embeds: [new EmbedBuilder().setImage('attachment://smoker.png').setColor('#2b2d31')], files: [attachment] });
    } catch (error) {
      console.error('[Smoker] Lỗi /smoker:', error);
      return interaction.editReply({ content: `❌ Không thể tính: ${error.message}` });
    }
  }
};
