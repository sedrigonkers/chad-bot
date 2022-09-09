const TelegramBot = require('node-telegram-bot-api')
const { getFirestore, collection, getDocs, doc } = require("firebase/firestore")

const { db } = require('./firebase')

// async function getCollection() {
//   const querySnapshot = await getDocs(collection(db, "motivation"));

//   querySnapshot.forEach((doc) => {
//     // console.log(`${doc.id} => ${doc.data().firstPhrase}`);
//     return doc.data().firstPhrase
//   });
// }

// getCollection()

const token = '5646501975:AAFZ37NppJplu4Ckgsk8iBs22gNNP-jVNDY'
const adminId = '444198069'
const userList = [
  '444198069',
  '675207271',
]

const bot = new TelegramBot(token, { polling: true });

const greetingText = `
<b>Приветствую тебя, дружище! Добро пожаловать в клуб.</b>🤜🤛

Здесь мы жестко гриндим, чтобы cтать _лучшей версией себя. У всех нас свои причины для этого, и разные предыстории, но нас объеденяет одно - <i>желаение стать лучше</i> 🔥. <b>Ты - большой молодец</b>, если нашел этого бота. Мы будем помогать тебе не сбиться на этом длинном пути 💪

<b>Ну, готов?</b>
`

bot.onText(/\/start/, msg => {
  bot.sendMessage(msg.chat.id, greetingText, { parse_mode: 'HTML' })
})

bot.onText(/\/motivation/, async (msg) => {

  const chatId = msg.chat.id;

  try {
    getDocs(collection(db, "motivation"))
      .then(res => {
        res.forEach((doc) => {
          bot.sendMessage(chatId, JSON.stringify(doc.data()))
        })
      })
  } catch (err) {
    bot.sendMessage(chatId, err)
  }
});

function sendMessageToAllUsers(text) {
  return new Promise((res, rej) => {
    for (user of userList) {
      bot.sendMessage(user, text)
    }
    res()
  })
}

function sendSuggestToAdmin(msg) {
  bot.sendMessage(adminId, `Новое предложение от <b>@${msg.from.username}</b>:\n\n<i>"${msg.text}"</i>`,
    {
      "parse_mode": 'HTML',
      "one_time_keyboard": true,
      "reply_markup": {
        "inline_keyboard": [
          [
            {
              text: 'Принять',
              callback_data: 'accept'
            }
          ], [
            {
              text: 'Отклонить',
              callback_data: 'decline'
            }
          ],
        ]
      }
    })
  currentPost = msg.text
}

bot.sendChatAction()

let currentPost = ''

bot.on('callback_query', (ctx) => {
  switch (ctx.data) {
    case 'accept':
      sendMessageToAllUsers(currentPost)
      break
    case 'decline':
      break
  }
})

bot.onText(/\/callbackquery/, (msg) => {
  bot.sendMessage(msg.chat.id, "Click a button won't you!", {
    "reply_markup": {
      "inline_keyboard": [
        [
          {
            text: "Click me!",
            callback_data: "click",
          },
        ],
      ],
    },
  });
});

bot.onText(/\/suggest/, (message) => {

  const chatId = message.chat.id

  bot.sendMessage(chatId, 'Если ты хочешь помочь другим ребятам, пришли свой текст в следующем сообщении')

  bot.on('message', (msg) => {

    const chatId = msg.chat.id

    if (msg.message_id != message.message_id + 2) return

    sendSuggestToAdmin(msg)

    bot.sendMessage(chatId, 'Спасибо за твой вклад, дружище! Я отправлю твоё предложение администратору.')
  })
  return
}
)

bot.onText(/\/post/, (message) => {

  const chatId = message.chat.id
  if (chatId.toString() !== adminId) bot.sendMessage(chatId, `Ты можешь предложить свою идею. Для этого введи команду \/suggest`)

  bot.sendMessage(adminId, 'Отправь пост в следующем сообщении')

  bot.on('message', (msg) => {
    if (msg.message_id != message.message_id + 2) return

    sendMessageToAllUsers(msg.text)
    .then(() => bot.sendMessage(adminId, 'Пост успешно опубликован'))
  })


})

bot.on('edited_message', (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'я все видел')
})

// bot.on('message', (msg) => {
//   bot.sendMessage(msg.chat.id, "Скорее всего, такой команды не существует", {
//     keyboard: {}
//   })
// })