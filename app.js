const express = require('express')
const morgan = require('morgan')
const createError = require('http-errors')
const AuthRoute = require('./Routes/Auth.route')
const UserRoute = require('./Routes/User.route')
const MapRoute = require('./Routes/Map.route')
const DashboardRoute = require('./Routes/Dashboard.route')
const NotificationRoute = require('./Routes/Notification.route')
const NotificationController = require('./Controllers/Notification.Controller')
require('dotenv').config()
require('./helpers/init_mongodb')
const {verifyAccessToken} = require('./helpers/jwt_helper')
require('./helpers/init_redis')
const cron = require('node-cron')

const app = express()
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.get('/', verifyAccessToken, async (req, res, next) => {
    
    res.send('Hello from Express')
})


app.use('/auth', AuthRoute)

app.use('/map', verifyAccessToken, MapRoute)

app.use('/dashboard', verifyAccessToken, DashboardRoute)

app.use('/notification', verifyAccessToken, NotificationRoute)

app.use('/user', verifyAccessToken, UserRoute)

cron.schedule('59 23 * * *', async () => {
    try {
        await NotificationController.createDailyReport()
        console.log('Daily report created successfully')
    } catch (error) {
        console.error('Error creating daily report:', error)
    }
})

app.use(async (req, res, next) => {
    next(createError.NotFound())
})

app.use((err, req, res, next) => {
    res.status(err.status || 500)
    res.send({
        error: {
            status: err.status || 500,
            message: err.message
        }
    })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log('Server running on port 3000')
})