const TelegramBot = require('node-telegram-bot-api')
const { getFirestore, collection, getDocs, doc } = require("firebase/firestore")

const { db } = require('./firebase')

async function getCollection() {
  const querySnapshot = await getDocs(collection(db, "motivation"));

  querySnapshot.forEach((doc) => {
    // console.log(`${doc.id} => ${doc.data().firstPhrase}`);
    return doc.data().firstPhrase
  });
}

getCollection()

const token = '5646501975:AAFZ37NppJplu4Ckgsk8iBs22gNNP-jVNDY'

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/motivation/, async (msg) => {

  const chatId = msg.chat.id;

  getDocs(collection(db, "motivation"))
    .then(res => {
      res.forEach((doc) => {
        bot.sendMessage(chatId, doc.data().firstPhrase)
      })
    })

});

bot.on('edited_message', (msg) => {

  const chatId = msg.chat.id;

  bot.sendMessage(chatId, 'я все видел')
})