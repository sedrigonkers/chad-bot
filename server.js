const TelegramBot = require('node-telegram-bot-api')

const token = '5646501975:AAFZ37NppJplu4Ckgsk8iBs22gNNP-jVNDY'

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/motivation/, (msg, match) => {

  const chatId = msg.chat.id;
  const resp = match[1];

  bot.sendMessage(chatId, 'motivation phrase here');
  console.log(match)
});

bot.on('edited_message', (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'я все видел')
})