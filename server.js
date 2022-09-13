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

// Callback Query reducer ----------------------------------------

bot.on('callback_query', (callback) => {

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

// Functions -----------------------------------------------------

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

async function sendPostToAllUsers() {

  const users = await getUsers()
  let i = 0

  const send = () => {
    bot.sendMessage(users[i++], 'bot')
    if (i < users.length) setTimeout(send, 50)
  }
  send()

}

async function getUsers() {

  const users = new Array()

  const querySnapshot = await getDocs(collection(db, "users"));
  querySnapshot.forEach((doc) => {
    users.push(doc.data().user_id)
  });

  return users

}

function sendSuggestToAdmin(msg) { // Отправить пост предложки админу

  const options = {
    'caption': msg.caption,
    'parse_mode': 'markdown',
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
  }

  const userName = msg.from.username ? '@' + msg.from.username : msg.from.first_name

  if (msg.photo) {
    return bot.sendPhoto(msg.chat.id, msg.photo[0].file_id, options)
  }

  // bot.sendMessage(adminId, `Новое предложение от <b>${userName}</b>:\n\n<i>${msg.text}</i>`, options)
}



// bot.on('photo', (msg) => {

//   // bot.sendMessage(adminId, JSON.stringify(msg.photo[0].file_id), { parse_mode: 'Markdown' })

//   console.log(msg.message_id)
// })


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

const gif = {
  message_id: 1843,
  from: {
    id: 444198069,
    is_bot: false,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    language_code: 'en'
  },
  chat: {
    id: 444198069,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    type: 'private'
  },
  date: 1663056267,
  animation: {
    file_name: 'IMG_5216.MP4',
    mime_type: 'video/mp4',
    duration: 4,
    width: 624,
    height: 640,
    thumb: {
      file_id: 'AAMCAgADGQEAAgczYyA5i0DSREth2Jj0fwvoPLYdjG4AApIcAAJWvwFJ3XAXNFunG4IBAAdtAAMpBA',
      file_unique_id: 'AQADkhwAAla_AUly',
      file_size: 30601,
      width: 312,
      height: 320
    },
    file_id: 'CgACAgIAAxkBAAIHM2MgOYtA0kRLYdiY9H8L6Dy2HYxuAAKSHAACVr8BSd1wFzRbpxuCKQQ',
    file_unique_id: 'AgADkhwAAla_AUk',
    file_size: 530618
  },
  document: {
    file_name: 'IMG_5216.MP4',
    mime_type: 'video/mp4',
    thumb: {
      file_id: 'AAMCAgADGQEAAgczYyA5i0DSREth2Jj0fwvoPLYdjG4AApIcAAJWvwFJ3XAXNFunG4IBAAdtAAMpBA',
      file_unique_id: 'AQADkhwAAla_AUly',
      file_size: 30601,
      width: 312,
      height: 320
    },
    file_id: 'CgACAgIAAxkBAAIHM2MgOYtA0kRLYdiY9H8L6Dy2HYxuAAKSHAACVr8BSd1wFzRbpxuCKQQ',
    file_unique_id: 'AgADkhwAAla_AUk',
    file_size: 530618
  }
}

const video = {
  message_id: 1852,
  from: {
    id: 444198069,
    is_bot: false,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    language_code: 'en'
  },
  chat: {
    id: 444198069,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    type: 'private'
  },
  date: 1663056460,
  video: {
    duration: 13,
    width: 1080,
    height: 1080,
    file_name: 'Auto_video_ua_02.mp4',
    mime_type: 'video/mp4',
    thumb: {
      file_id: 'AAMCAgADGQEAAgc8YyA6S7UIcSTKw7-t8UungfCdiK0AApYcAAJWvwFJ8kSjLjhph1YBAAdtAAMpBA',
      file_unique_id: 'AQADlhwAAla_AUly',
      file_size: 22222,
      width: 320,
      height: 320
    },
    file_id: 'BAACAgIAAxkBAAIHPGMgOku1CHEkysO_rfFLp4HwnYitAAKWHAACVr8BSfJEoy44aYdWKQQ',
    file_unique_id: 'AgADlhwAAla_AUk',
    file_size: 3877448
  }
}

const music = {
  message_id: 1860,
  from: {
    id: 444198069,
    is_bot: false,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    language_code: 'en'
  },
  chat: {
    id: 444198069,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    type: 'private'
  },
  date: 1663056633,
  audio: {
    duration: 168,
    file_name: 'Laurindo Almeida - The Lamp Is Low.mp3',
    mime_type: 'audio/mpeg',
    thumb: {
      file_id: 'AAMCAgADGQEAAgdEYyA6-Cdvy0YTWpFj5OruQY8pNt0AApkcAAJWvwFJO1nEaxVOwvgBAAdtAAMpBA',
      file_unique_id: 'AQADmRwAAla_AUly',
      file_size: 8961,
      width: 320,
      height: 180
    },
    file_id: 'CQACAgIAAxkBAAIHRGMgOvgnb8tGE1qRY-Tq7kGPKTbdAAKZHAACVr8BSTtZxGsVTsL4KQQ',
    file_unique_id: 'AgADmRwAAla_AUk',
    file_size: 7670326
  }
}

const voice = {
  message_id: 1864,
  from: {
    id: 444198069,
    is_bot: false,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    language_code: 'en'
  },
  chat: {
    id: 444198069,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    type: 'private'
  },
  date: 1663056699,
  voice: {
    duration: 2,
    mime_type: 'audio/ogg',
    file_id: 'AwACAgIAAxkBAAIHSGMgOzu9rncPfLGSDPGRShw62tEWAAKbHAACVr8BSTf1RH1ds4oSKQQ',
    file_unique_id: 'AgADmxwAAla_AUk',
    file_size: 4080
  }
}

const video_note = {
  message_id: 1868,
  from: {
    id: 444198069,
    is_bot: false,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    language_code: 'en'
  },
  chat: {
    id: 444198069,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    type: 'private'
  },
  date: 1663056736,
  video_note: {
    duration: 2,
    length: 384,
    thumb: {
      file_id: 'AAMCAgADGQEAAgdMYyA7XwoM9FBN1mRx_Uuq7cW4PVYAApwcAAJWvwFJhLBtLO6-QtwBAAdtAAMpBA',
      file_unique_id: 'AQADnBwAAla_AUly',
      file_size: 11109,
      width: 320,
      height: 320
    },
    file_id: 'DQACAgIAAxkBAAIHTGMgO18KDPRQTdZkcf1Lqu3FuD1WAAKcHAACVr8BSYSwbSzuvkLcKQQ',
    file_unique_id: 'AgADnBwAAla_AUk',
    file_size: 179851
  }
}