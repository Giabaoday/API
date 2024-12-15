const { error } = require('@hapi/joi/lib/base');
const mongoose = require('mongoose')

mongoose
    .connect(
        process.env.DB_URI, {
        dbName: process.env.DB_NAME,
        user: process.env.DB_USER,
        pass: process.env.DB_PASSWORD,
    }).then(() => {
        console.log('Mongodb connected');
    })
    .catch(err => console.log(err.message));

mongoose.connection.on('connected', () => {
    console.log('Mongoose connected to DB')
})

mongoose.connection.on('error', () => {
    console.log(error.message)
})

mongoose.connection.on('disconnected', () => {
    console.log('Mongoose connection is disconnected')
})

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    process.exit(0)
})