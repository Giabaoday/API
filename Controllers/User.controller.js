const createError = require('http-errors')
const User = require('../Models/User.model')
const { emailSchema, passwordSchema, updateUserDistanceSchema, updateSettingsSchema } = require('../helpers/validation_schema')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')

module.exports = {
    getCurrentUser: async (req, res, next) => {
        try {
            const userId = req.payload.aud
            const user = await User.findById(userId, { __v: 0, password: 0 })
            if (!user) throw createError.NotFound("User not registered")
            res.send(user)
        } catch (error) {
            next(error)
        }
    },
    getAllUser: async (req, res, next) => {
        try {
            const result = await User.find({}, {__v: 0})
            res.send(result)
        } catch (error) {
            next(error)
        }
    },

    getUserById: async (req, res, next) => {
        try {
            const userId = req.body.userId
            const user = await User.findById(userId, { __v: 0, password: 0 })
            if (!user) throw createError.NotFound("User not registered")
            res.send(user)
        } catch (error) {
            next(error)
        }
    },
    
    getUserByEmail: async (req, res, next) => {
        try {
            const result = await emailSchema.validateAsync(req.body)
            const user = await User.findOne({ email: result.email})
            if (!user) throw createError.NotFound("User not registered")

            const userId = {user}
            res.send(userId)
        } catch (error) {
            next(error)
        }
    },

    updateUserDistance: async (req, res, next) => {
        try {
            const userId = req.payload.aud
            const validData = await updateUserDistanceSchema.validateAsync(req.body)
            
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $inc: { distance_traveled: validData.distance_traveled } },
                { new: true }  // Trả về document sau khi update
            )
    
            if (!updatedUser) throw createError.NotFound("User not registered")
    
            res.json({
                status: 'success',
                data: {
                    distance_traveled: updatedUser.distance_traveled
                }
            })
    
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            next(error)
        }
    },

    updateSettings: async (req, res, next) => {
        try {
            const userId = req.payload.aud
            
            // Validate input data
            const validData = await updateSettingsSchema.validateAsync(req.body)
            
            // Tạo object chứa các field cần update
            const updateFields = {}
            if (validData.username) updateFields.username = validData.username
            if (validData.birthday) updateFields.birthday = validData.birthday
            if (validData.country) updateFields.country = validData.country
    
            // Find user
            const user = await User.findById(userId)
            if (!user) throw createError.NotFound("User not registered")
    
            // If user wants to change password
            if (validData.newPassword) {
                // Verify current password
                const isValidPassword = await user.isValidPassword(validData.currentPassword)
                if (!isValidPassword) {
                    throw createError.Unauthorized('Current password is incorrect')
                }
    
                // Hash new password
                const salt = await bcrypt.genSalt(10)
                const hashedPassword = await bcrypt.hash(validData.newPassword, salt)
                updateFields.password = hashedPassword
            }
    
            // Update user using findByIdAndUpdate thay vì save()
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateFields },
                { new: true } // Trả về document sau khi update
            )
            
            const formattedBirthday = updatedUser.birthday ? 
                updatedUser.birthday.toISOString().split('T')[0] : null
    
            res.json({
                status: 'success',
                data: {
                    username: updatedUser.username,
                    birthday: formattedBirthday,
                    country: updatedUser.country
                }
            })
    
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            next(error)
        }
    },
    
    sendReport: async (req, res, next) => {
        try {
            const { description } = req.body
            if (!description) {
                throw createError.BadRequest('Description is required')
            }

            const userId = req.payload.aud
            const user = await User.findById(userId)
            if (!user) throw createError.NotFound('User not found')

            // Tạo transporter
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            })

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: '22520855@gm.uit.edu.vn',
                subject: 'New Problem Report from User',
                html: `
                    <h2>Problem Report</h2>
                    <p><strong>From User:</strong> ${user.email}</p>
                    <p><strong>Description:</strong></p>
                    <p>${description}</p>
                    <br>
                    <p><i>Sent from PotholeDetection App</i></p>
                `
            })

            await transporter.close();

            res.json({
                status: 'success',
                message: 'Report sent successfully'
            })

        } catch (error) {
            if (transporter) {
                await transporter.close();
            }
            next(error)
        }
    }
}