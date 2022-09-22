const TelegramBot = require('node-telegram-bot-api')
const { collection,
  setDoc,
  deleteDoc,
  getDoc,
  arrayUnion,
  updateDoc,
  getDocs,
  doc } = require("firebase/firestore")
const { db } = require('./firebase')
const config = require('./config.json')


const { adminId, token } = config

const bot = new TelegramBot(token, { polling: true });

const greetingText = `
*Приветствую тебя, дружище! Добро пожаловать в клуб.*🤜🤛

Здесь жоские ребята собираются, и помогают друг другу cтать лучшей версией себя. У всех нас свои причины для этого, и разные предыстории, но нас объеденяет одно - _желаение стать лучше_ 🔥. Мы будем помогать тебе не сбиться на этом длинном пути 💪

🧷 Сюда ты можешь отправить *что угодно*, и это увидят все пользователи бота.

   \`(смотри команды, если что-то непонятно)\`
👇 
`

const helpText = `
<b><i>Как делать посты?</i></b>

Ты можешь предложить свой пост командой <b>/suggest</b>

К публикации принимаются форматы: <b>GIF, видео, фото, музыка, голосовые, текст</b>

<b>готово</b> 👍
`
const markdown = { parse_mode: 'markdown' }

// Bot commands

bot.onText(/\/start/, msg => { // start command
  bot.sendMessage(msg.chat.id, greetingText, { parse_mode: 'Markdown' })
})

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'html' })
})

bot.onText(/\/suggest/, (msg) => {

  const chatId = msg.chat.id

  bot.sendMessage(chatId, '*Пришли свой пост в следующем сообщении ✏️*', { parse_mode: 'Markdown' })

  bot.on('message', (msg) => {

    if (!filterPost(msg)) return bot.removeListener('message')

    sendSuggestToAdmin(msg)
  })
}
)

bot.onText(/\/random/, (msg) => {

  const chatId = msg.chat.id
  getRandomPost().
    then((randomPost) => {

      const options = randomPost.options || {}
      const body = randomPost.body || undefined
      if (!body) return

      sendAnyMessage(chatId, body, options)

    })
})

bot.onText(/\/cancel/, (msg) => {
  bot.removeListener('message')
  bot.sendMessage(msg.chat.id, '*Команда отменена 👍*', markdown)
})

// Handling bot events

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

bot.on('sticker', (ctx) => {
  bot.sendMessage(ctx.chat.id, 'Клевый стикер, бро')
})

// Callback Query reducer ----------------------------------------

bot.on('callback_query', (callback) => {

  const messageId = callback.message.message_id
  const chatId = callback.message.chat.id
  const messageCaption = callback.message.caption || ''
  const msg = callback.message
  const { text, photo, video, voice, audio, animation } = callback.message

  const prepareData = () => {
    if (text) return { text }
    if (photo) return { photo: photo[photo.length - 1].file_id }
    if (video) return { video: video.file_id }
    if (audio) return { audio: audio.file_id }
    if (animation) return { animation: animation.file_id }
    if (voice) return { voice: voice.file_id }
  }

  const body = prepareData()

  const options = {
    message_id: messageId,
    chat_id: chatId,
  }

  const mediaOptions = {
    caption: messageCaption,
  }

  switch (callback.data) {

    case 'accept-suggestion':

      const acceptPostPromise = new Promise(

        (res, rej) => {

          if (text) {
            return bot.editMessageText(`${text ? text : ''}\n\nПринято ✅`, options)
              .then(res(publicPost(body, {})))
          }

          bot.editMessageCaption(`${messageCaption ? messageCaption : ''}\n\nПринято ✅`, options)
            .then(res(publicPost(body, mediaOptions)))

        })

      acceptPostPromise
        .then(() => bot.sendMessage(chatId, '*Пост успешно опубликован 📝*', markdown))
        .catch((err) => bot.sendMessage(adminId, '*Произошла ошибка, пост не опубликован 😬*\n\n' + `_${err}_`, markdown))
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

async function publicPost(body, options = {}) {

  addPostToDb(body, options)
  const users = await getUsers()
  let i = 0

  const send = () => {
    sendAnyMessage(users[i++], body, options)
    if (i < users.length) setTimeout(send, 75)
  }
  send()

}

async function addPostToDb(body, options) {

  const id = generateId()
  updateDoc(doc(db, 'posts', 'posts-id'), {
    posts_id: arrayUnion(id)
  })

  const post = {
    body,
    date: Date.now(),
    options,
  }

  return await setDoc(doc(db, "posts", id), post);

}

function getRandomPost() {
  return new Promise(async (res, rej) => {
    const document = await getDoc(doc(db, 'posts', 'posts-id'))

    if (document.exists()) {

      const postsArray = document.data().posts_id
      const random = () => Math.round(Math.random() * (postsArray.length - 1))
      const randomPostId = postsArray[random()]
      const randomPost = await getDoc(doc(db, 'posts', randomPostId))

      res(randomPost.data())
    }
    else rej('no such document')
  })
}

async function getUsers() {

  const users = new Array()

  const querySnapshot = await getDocs(collection(db, "users"));
  querySnapshot.forEach((doc) => {
    users.push(doc.data().user_id)
  });

  return users

}

function sendAnyMessage(chatId, body, options = {}) {

  const { video, photo, text, audio, animation, voice } = body

  if (video) {
    return bot.sendVideo(chatId, video.file_id || video, options)
  }
  if (photo) {
    return bot.sendPhoto(chatId, photo[photo.length - 1].file_id || photo, options)
  }
  if (text) {
    return bot.sendMessage(chatId, text, options)
  }
  if (audio) {
    return bot.sendAudio(chatId, audio.file_id || audio, options)
  }
  if (animation) {
    return bot.sendAnimation(chatId, animation.file_id || animation, options)
  }
  if (voice) {
    return bot.sendVoice(chatId, voice.file_id || voice, options)
  }
}

function sendSuggestToAdmin(msg) {

  const options = {
    'caption': msg.caption,
    "reply_markup": {
      "inline_keyboard": [
        [{
          text: 'Принять ✅',
          callback_data: 'accept-suggestion'
        }],

        [{
          text: 'Отклонить ❌',
          callback_data: 'decline-suggestion'
        }],
      ]
    }
  }

  const userName = msg.from.username ? '@' + msg.from.username : msg.from.first_name
  const chatId = msg.chat.id

  const isAdmin = adminId.toString() === chatId.toString()

  const suggestMsgText = `Новое предложение от *${userName}*:`

  bot.sendMessage(adminId, suggestMsgText, markdown)
    .then(() => { sendAnyMessage(adminId, msg, options) })
    .then(() => {
      !isAdmin && bot.sendMessage(chatId, 'Спасибо за твой вклад, дружище! 🫂 Я отправил твоё предложение администратору.')
      bot.removeListener('message')
    })
}

function filterPost(msg) {

  const chatId = msg.chat.id

  const { text, video, photo, animation, audio, voice } = msg

  if (text && text.startsWith('/')) return false

  if (text || video || photo || animation || audio || voice) return true

  bot.sendMessage(chatId, '*Неподдерживаемый формат поста 🤷‍♀️. Доступные форматы можно посмотреть в /help*', { parse_mode: 'Markdown' })
}
