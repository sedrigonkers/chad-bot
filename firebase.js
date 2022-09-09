const { initializeApp } = require("firebase/app")
const { getFirestore, collection, getDocs } = require("firebase/firestore")
const { getDatabase } = require('firebase/database')

const firebaseConfig = {
    apiKey: "AIzaSyDL93kMJrzWo540eVYlqhosKVZU9Paod8w",
    authDomain: "chad-bot-c5ae7.firebaseapp.com",
    databaseURL: "https://chad-bot-c5ae7-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "chad-bot-c5ae7",
    storageBucket: "chad-bot-c5ae7.appspot.com",
    messagingSenderId: "98605001276",
    appId: "1:98605001276:web:6f58ec8c7d1e0a48893139",
    measurementId: "G-S0QPTXFD37"
};

const app = initializeApp(firebaseConfig);

const db = getDatabase()

module.exports = { db }