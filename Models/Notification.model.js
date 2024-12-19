const mongoose = require('mongoose')
const Schema = mongoose.Schema

const NotificationSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['DAILY_REPORT', 'NEW_POTHOLE', 'SYSTEM'],
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    data: {
        type: Schema.Types.Mixed,  // Lưu thêm dữ liệu nếu cần
        required: false
    }
}, { timestamps: true })

const Notification = mongoose.model('notification', NotificationSchema)
module.exports = Notification