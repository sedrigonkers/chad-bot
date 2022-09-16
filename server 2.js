const TelegramBot = require('node-telegram-bot-api')
const { collection, setDoc, deleteDoc, deleteField, query, where, onSnapshot, updateDoc, getDocs, doc } = require("firebase/firestore")
const { db } = require('./firebase')


const token = '5646501975:AAFZ37NppJplu4Ckgsk8iBs22gNNP-jVNDY'
const token2 = '5626416121:AAEuOd7rSy_6F-rgOdytE-wAfqLKHc04gtI'
const adminId = 444198069


const bot = new TelegramBot(token, { polling: true });

const greetingText = `
<b>Приветствую тебя, дружище! Добро пожаловать в клуб.</b>🤜🤛

Здесь мы жестко гриндим, чтобы cтать лучшей версией себя. У всех нас свои причины для этого, и разные предыстории, но нас объеденяет одно - <i>желаение стать лучше</i> 🔥. <b>Ты - большой молодец</b>, если нашел этого бота. Мы будем помогать тебе не сбиться на этом длинном пути 💪

<i>   (смотри команды, если что-то непонятно)</i>
👇 
`

const helpText = `
<b><i>Как делать посты?</i></b>

Ты можешь предложить свой пост командой <b>/suggest</b>

К публикации принимаются форматы: <b>GIF, видео, фото, музыка, текст</b>

<b>готово</b> 👍
`

bot.onText(/\/start/, msg => { // start command
  bot.sendMessage(msg.chat.id, greetingText, { parse_mode: 'html' })
})


bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'html' })
})


bot.onText(/\/suggest/, (message) => { //suggest post

  const chatId = message.chat.id

  bot.sendMessage(chatId, 'Если ты хочешь помочь другим ребятам, пришли свой текст в следующем сообщении')


  bot.on('message', (msg) => {

    const chatId = msg.chat.id

    postFilter(msg)

  })

}
)

function postFilter(msg) {
  if (msg.text && msg.text.startsWith('/')) return bot.removeListener('message')

  if (msg.audio) return sendSuggestToAdmin(msg)
  if (msg.video) return sendSuggestToAdmin(msg)
  if (msg.photo) return sendSuggestToAdmin(msg)
  if (msg.animation) return sendSuggestToAdmin(msg)
  if (msg.text) return sendSuggestToAdmin(msg)

  return bot.sendMessage(adminId, 'Что то не так. Я не смогу отправить такой пост, почитай правила отпраки в /help')
}

// bot.onText(/\/post/, (message) => { // new post

//   const chatId = message.chat.id
//   const options = {
//     parse_mode: 'markdown',
//     reply_markup: {
//       inline_keyboard: [
//         [
//           {
//             text: 'Опубликовать ✅',
//             callback_data: 'public'
//           }
//         ],
//         [
//           {
//             text: 'Отменить ❌',
//             callback_data: 'decline'
//           }
//         ],
//       ]
//     }
//   }

//   if (chatId.toString() !== adminId.toString()) return bot.sendMessage(chatId, `Ты можешь предложить свою мысль. Для этого введи команду \n<b>\/suggest</b>`, { parse_mode: 'HTML' })

//   bot.sendMessage(chatId, 'Отправь пост в следующем сообщении')

//   bot.on('message', (msg) => {

//     postFilter(msg)

//   })

// })


bot.onText(/\/cancel/, (msg) => {
  bot.removeListener('message')
    .then(() => {
      bot.sendMessage(msg.chat.id, 'Все команды отменены')
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
        user_name: user_name ? user_name : 'undefined',
      });
      break
  }
})

bot.on('polling_error', (err) => {
  bot.sendMessage(adminId, 'Ошибка: \n' + JSON.stringify(err))
})

bot.on('sticker', (ctx) => {
  bot.sendMessage(ctx.chat.id, 'Клевый стикер, бро')
})

// Callback Query reducer ----------------------------------------

bot.on('callback_query', (callback) => {

  const messageId = callback.message.message_id
  const chatId = callback.message.chat.id
  const userName = callback.message.chat.username
  const firstName = callback.message.chat.first_name
  const messageCaption = callback.message.caption

  const { photo, video, animation, audio, text } = callback.message
  // const postText = messageText.substring(messageText.lastIndexOf('\n') + 2)

  const options = {
    message_id: messageId,
    chat_id: chatId,
  }

  const mediaOptions = {
    caption: messageCaption,
  }


  switch (callback.data) {
    case 'accept-suggestion':

      if (text) {
        return bot.editMessageText(`${text ? text : ''}\n\nПринято ✅`, options)
          .then(() => {
            return sendPostToAllUsers((...p) => bot.sendMessage(...p), text)
              .then(() => bot.sendMessage(chatId, '<b>Пост успешно опубликован 📝</b>', options)
              )
              .catch(err => bot.sendMessage(chatId, 'Произошла какая-то ошибка:\n\n' + err))
          })
      }

      bot.editMessageCaption(`${messageCaption ? messageCaption : ''}\n\nПринято ✅`, options)
        .then(() => {

          if (video) {
            return sendPostToAllUsers((...p) => bot.sendVideo(...p), video.file_id, mediaOptions)
          }

          if (photo) {
            // return bot.sendPhoto(chatId, photo[photo.length - 1].file_id, mediaOptions)
            return sendPostToAllUsers((...p) => bot.sendPhoto(...p), photo[photo.length - 1].file_id, mediaOptions)
          }

          if (animation) {
            return sendPostToAllUsers((...p) => bot.sendAnimation(...p), animation.file_id, mediaOptions)
          }

          if (audio) {
            return sendPostToAllUsers((...p) => bot.sendAudio(...p), audio.file_id, mediaOptions)
          }
        })


      break

    case 'decline-suggestion':
      if (text) return bot.editMessageText(`${text}\n\nОтклонено ❌`, options)
      bot.editMessageCaption(`${messageCaption ? messageCaption : ''}\n\nОтклонено ❌`, options)
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

async function addPostToDb(obj) {
  return await setDoc(doc(db, "posts", generateId()), obj);
}

async function sendPostToAllUsers(callback, file, options) {

  const users = await getUsers()
  let i = 0

  const send = () => {
    callback(users[i++], file, options)
    if (i < users.length) setTimeout(send, 75)
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
  const chatId = msg.chat.id

  const isAdmin = adminId.toString() === chatId.toString()

  const suggestMsgText = isAdmin ? 'Пост будет выглядеть так:' : `Новое предложение от *${userName}*:`

  bot.sendMessage(adminId, suggestMsgText, { parse_mode: 'Markdown' })
    .then(() => {

      if (msg.photo) {
        return bot.sendPhoto(adminId, msg.photo[msg.photo.length - 1].file_id, options)
      }

      if (msg.animation) {
        return bot.sendAnimation(adminId, msg.animation.file_id, options)
      }

      if (msg.audio) {
        return bot.sendAudio(adminId, msg.audio.file_id, options)
      }

      if (msg.video) {
        return bot.sendVideo(adminId, msg.video.file_id, options)
      }

      if (msg.text) {
        return bot.sendMessage(adminId, msg.text, options)
      }

    })
    .then(() => {

      !isAdmin && bot.sendMessage(chatId, 'Спасибо за твой вклад, дружище! 🫂 Я отправил твоё предложение администратору.')
      bot.removeListener('message')

    })
}



// какие то приколы

// bot.on('message', (msg) => {
//   bot.sendMessage(msg.chat.id, "Скорее всего, такой команды не существует", {
//     keyboard: {}
//   })
// })

// bot.removeListener() // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


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

const callback = {
  id: '1907816180547001195',
  from: {
    id: 444198069,
    is_bot: false,
    first_name: 'сережа',
    username: 'aruarian_dancer',
    language_code: 'en'
  },
  message: {
    message_id: 2579,
    from: {
      id: 5646501975,
      is_bot: true,
      first_name: 'Chad',
      username: 'PocketChadBot'
    },
    chat: {
      id: 444198069,
      first_name: 'сережа',
      username: 'aruarian_dancer',
      type: 'private'
    },
    date: 1663095232,
    photo: [[Object], [Object], [Object], [Object]],
    caption: 'hey',
    reply_markup: { inline_keyboard: [Array] }
  },
  chat_instance: '-6939904578957083042',
  data: 'accept-suggestion'
}