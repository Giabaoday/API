const express = require('express')
const router = express.Router()
const NotificationController = require('../Controllers/Notification.Controller')

router.post('/create', NotificationController.createNotification)
router.get('/getUserNotifications', NotificationController.getUserNotifications)
router.patch('/markAsRead', NotificationController.markAsRead)
router.delete('/delete', NotificationController.deleteNotification)

module.exports = router