const createError = require('http-errors')
const Notification = require('../Models/Notification.model')
const User = require('../Models/User.model')
const Pothole = require('../Models/Pothole.model')

module.exports = {
    // Tạo thông báo mới
    createNotification: async (req, res, next) => {
        try {
            const { title, message, type, data } = req.body
            const userId = req.payload.aud
            const notification = new Notification({ userId, title, message, type, data })
            await notification.save()

            res.json({
                status: 'success',
                data: notification
            })
        } catch (error) {
            next(error)
        }
    },

    // Lấy thông báo của user
    getUserNotifications: async (req, res, next) => {
        try {
            const userId = req.payload.aud
            const { isRead } = req.query
            
            let query = { userId }
            if (typeof isRead === 'boolean') {
                query.isRead = isRead
            }

            const notifications = await Notification.find(query)
                .sort({ createdAt: -1 }) // Sắp xếp mới nhất lên đầu

            res.json({
                status: 'success',
                data: notifications
            })
        } catch (error) {
            next(error)
        }
    },

    // Đánh dấu thông báo đã đọc
    markAsRead: async (req, res, next) => {
        try {
            const { notificationIds } = req.body

            await Notification.updateMany(
                {
                    _id: { $in: notificationIds },
                },
                { isRead: true }
            )

            res.json({
                status: 'success',
                message: 'Notifications marked as read'
            })
        } catch (error) {
            next(error)
        }
    },

    // Tạo thông báo daily report
    createDailyReport: async () => {
        try {
            // Lấy thống kê trong ngày
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            
            const tomorrow = new Date(today)
            tomorrow.setDate(tomorrow.getDate() + 1)

            const stats = await Pothole.aggregate([
                {
                    $match: {
                        createdAt: { $gte: today, $lt: tomorrow }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        highSeverity: {
                            $sum: {
                                $cond: [{ $eq: ["$severity.level", "High"] }, 1, 0]
                            }
                        }
                    }
                }
            ])

            const dailyStats = stats[0] || { total: 0, highSeverity: 0 }

            // Tạo thông báo cho mỗi user
            const users = await User.find()
            const notifications = users.map(user => ({
                userId: user._id,
                title: 'Daily Pothole Report',
                message: `Today's summary: ${dailyStats.total} new potholes reported, ${dailyStats.highSeverity} high severity cases.`,
                type: 'DAILY_REPORT',
                data: dailyStats
            }))

            await Notification.insertMany(notifications)
            return dailyStats
            
        } catch (error) {
            console.error('Error creating daily report notifications:', error)
            throw error
        }
    },

    // Xóa thông báo
    deleteNotification: async (req, res, next) => {
        try {
            const userId = req.payload.aud
            const { notificationIds, deleteAll } = req.body
    
            // Nếu deleteAll = true, xóa tất cả thông báo của user
            if (deleteAll) {
                const result = await Notification.deleteMany({ userId })
                
                res.json({
                    status: 'success',
                    message: `Deleted ${result.deletedCount} notifications`
                })
                return
            }
    
            // Nếu không, xóa theo danh sách ID
            if (!notificationIds || notificationIds.length === 0) {
                throw createError.BadRequest('Notification IDs are required')
            }
    
            const result = await Notification.deleteMany({
                _id: { $in: notificationIds }
            })
    
            if (result.deletedCount === 0) {
                throw createError.NotFound('Notification not found')
            }
    
            res.json({
                status: 'success',
                message: `Deleted ${result.deletedCount} notifications`
            })
        } catch (error) {
            next(error)
        }
    }
}