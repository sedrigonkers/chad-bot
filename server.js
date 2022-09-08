const { Telegraf } = require('telegraf')
const fetch = require('node-fetch')
const axios = require('axios')

const BOT_TOKEN = '5646501975:AAFZ37NppJplu4Ckgsk8iBs22gNNP-jVNDY'
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

fetch(`${TELEGRAM_API}/sendMessage?chat_id=444198069&text=<b>hello</b>&parse_mode=HTML`)

const bot = new Telegraf(BOT_TOKEN)

bot.help((ctx) => ctx.reply('Send me a sticker'))

bot.on()

bot.start((ctx) => ctx.reply(
        `
    Приветствую тебя, дружище! Добро пожаловать в клуб.🤜🤛

    Здесь мы жестко гриндим, чтобы cтать лучшей версией себя.У всех нас свои причины для этого, и разные предыстории, но нас объеденяет одно - * желаение стать лучше * 🔥. * Ты - большой молодец *, если нашел этого бота.Мы будем помогать тебе не сбиться на этом длинном пути 💪

  Ну, готов ? `
    ))

bot.hears('а как жить?', ctx => ctx.reply('жить нужно так, чтобы не стыдно было'))
bot.on('photo', (ctx) => ctx.reply('nice selfie, bro'))

bot.launch()

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
