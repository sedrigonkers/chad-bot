const TelegramBot = require('node-telegram-bot-api')
const { collection, setDoc, deleteDoc, deleteField, query, where, onSnapshot, updateDoc, getDocs, doc } = require("firebase/firestore")
const { db } = require('./firebase')

const token = '5646501975:AAFZ37NppJplu4Ckgsk8iBs22gNNP-jVNDY'
const adminId = 444198069
const userList = [
  '444198069',
  '675207271',
]

const bot = new TelegramBot(token, { polling: true });

const greetingText = `
<b>Приветствую тебя, дружище! Добро пожаловать в клуб.</b>🤜🤛

Здесь мы жестко гриндим, чтобы cтать лучшей версией себя. У всех нас свои причины для этого, и разные предыстории, но нас объеденяет одно - <i>желаение стать лучше</i> 🔥. <b>Ты - большой молодец</b>, если нашел этого бота. Мы будем помогать тебе не сбиться на этом длинном пути 💪

<i>p.s. Ты всегда можешь написать /help, если запутался в боте</i>
`

bot.onText(/\/start/, msg => { // start command
  bot.sendMessage(msg.chat.id, greetingText, { parse_mode: 'HTML' })
})

function sendMessageToAllUsers(text) { // Рассылка всем пользователям
  return new Promise((res) => {
    for (user of userList) {
      bot.sendMessage(user, text)
    }
    res()
  })
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

async function addPostToDb(text, user_id, user_name, first_name) {
  return await setDoc(doc(db, "posts", generateId()), {
    user_id,
    user_name,
    first_name,
    text,
    is_used: false
  });
}

function getUsers() {

  const users = []

  getDocs(collection(db, "users"))
    .then(res => {

      res.forEach((user) => {

        users.push(user.data().user_id)

      })


    })

}

console.log(getUsers())

function sendSuggestToAdmin(msg) { // Отправить пост предложки админу

  const userName = msg.from.username ? '@' + msg.from.username : msg.from.first_name

  bot.sendMessage(adminId, `Новое предложение от <b>${userName}</b>:\n\n<i>${msg.text}</i>`,
    {
      "parse_mode": 'HTML',
      "reply_markup": {
        "inline_keyboard": [
          [
            {
              text: 'Принять ✅',
              callback_data: 'accept-suggestion'
            }
          ], [
            {
              text: 'Отклонить ❌',
              callback_data: 'decline-suggestion'
            }
          ],
        ]
      }
    })
}

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, "Основные команды\n\n/suggest - предложить текстовый пост", { parse_mode: 'Markdown' })
})

bot.onText(/\/suggest/, (message) => { //suggest post

  const chatId = message.chat.id

  bot.sendMessage(chatId, 'Если ты хочешь помочь другим ребятам, пришли свой текст в следующем сообщении')

  bot.on('message', (msg) => {

    const chatId = msg.chat.id

    if (msg.message_id != message.message_id + 2) return

    sendSuggestToAdmin(msg)

    bot.sendMessage(chatId, 'Спасибо за твой вклад, дружище! 🫂 Я отправил твоё предложение администратору.')
  })
  return
}
)


bot.onText(/\/post/, (message) => { // new post

  const chatId = message.chat.id
  if (chatId.toString() !== adminId.toString()) return bot.sendMessage(chatId, `Ты можешь предложить свою мысль. Для этого введи команду \n<b>\/suggest</b>`, { parse_mode: 'HTML' })

  bot.sendMessage(chatId, 'Отправь пост в следующем сообщении')

  bot.on('message', (msg) => {
    if (msg.message_id != message.message_id + 2) return

    bot.sendMessage(adminId, `<b>Пост будет выглядеть так:</b>\n\n${msg.text}`, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Опубликовать ✅',
              callback_data: 'public'
            }
          ],
          [
            {
              text: 'Отменить ❌',
              callback_data: 'decline'
            }
          ],
        ]
      }
    })


  })

})

// const q = query(collection(db, "posts"));
// const unsubscribe = onSnapshot(q, (querySnapshot) => {
//   const posts = [];
//   querySnapshot.forEach((doc) => {
//     posts.push(doc.data());
//   });
//   console.log("Current cities in CA: ", posts);
// });

bot.on('callback_query', (callback) => { // Callback Query reducer

  const messageId = callback.message.message_id
  const chatId = callback.message.chat.id
  const messageText = callback.message.text
  const userName = callback.message.chat.username
  const firstName = callback.message.chat.first_name
  const postText = messageText.substring(messageText.lastIndexOf('\n') + 2)

  switch (callback.data) {
    case 'accept-suggestion' || 'public-post':
      bot.editMessageText(`${messageText}\n\n<b>Принято</b> ✅`, {
        parse_mode: 'HTML',
        chat_id: chatId,
        message_id: messageId
      })
        .then(() => {
          addPostToDb(postText, chatId, userName, firstName)
            .then(() => bot.sendMessage(chatId, '<b>Пост успешно опубликован 📝</b>', { parse_mode: 'HTML' })
            )
            .catch(err => bot.sendMessage('Произошла неведомая ошибка:\n\n', err))
        })
      break

    case 'decline-suggestion':
      bot.editMessageText(`${messageText}\n\n<b>Отклонено</b> ❌`, {
        parse_mode: 'HTML',
        chat_id: chatId,
        message_id: messageId
      })
      break

    case 'public-post':
      console.log('callback query public')
      break
  }
})

bot.on('my_chat_member', (ctx) => {

  const user_id = ctx.chat.id
  const first_name = ctx.chat.first_name || "don't have"
  const user_name = ctx.chat.username

  switch (ctx.new_chat_member.status) {
    case 'kicked':
      deleteDoc(doc(db, "users", user_id.toString()))
      break
    case 'member':
      setDoc(doc(db, "users", user_id.toString()), {
        user_id,
        first_name,
      });
      break
  }
})

bot.on('polling_error', (err) => {
  bot.sendMessage(adminId, 'Ошибка: \n', JSON.stringify(err))
})

bot.on('sticker', (ctx) => {
  bot.sendMessage(ctx.chat.id, 'Клевый стикер, бро')
})

// какие то приколы

// bot.on('message', (msg) => {
//   bot.sendMessage(msg.chat.id, "Скорее всего, такой команды не существует", {
//     keyboard: {}
//   })
// })

// bot.removeListener() // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


// async function getCollection() {
//   const querySnapshot = await getDocs(collection(db, "motivation"));

//   querySnapshot.forEach((doc) => {
//     // console.log(`${doc.id} => ${doc.data().firstPhrase}`);
//     return doc.data().firstPhrase
//   });
// }

// getCollection()