const mongoose = require('mongoose')

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cinema';

mongoose
    .connect(mongoUri, { useNewUrlParser: true })
    .catch(e => {
        console.error('Connection error', e.message)
    })

const db = mongoose.connection

module.exports = db
