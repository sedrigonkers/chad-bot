const { Telegraf } = require('telegraf')

const BOT_TOKEN = '5646501975:AAFZ37NppJplu4Ckgsk8iBs22gNNP-jVNDY'
const bot = new Telegraf(BOT_TOKEN)

bot.help((ctx) => ctx.reply('Send me a sticker'))

bot.launch()