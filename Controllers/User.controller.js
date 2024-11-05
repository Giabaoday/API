const createError = require('http-errors')
const User = require('../Models/User.model')
const { emailSchema, passwordSchema } = require('../helpers/validation_schema')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../helpers/jwt_helper')
const client = require('../helpers/init_redis')

module.exports = {
    getAllUser: async (req, res, next) => {
        try {
            const result = await User.find({}, {__v: 0})
            res.send(result)
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

    updateUser: async (req, res, next) => {
        try {
            const id = req.params.id
            const update = req.body
            const option = {new: true}
            await passwordSchema.validateAsync(req.body)

            const user = await User.findByIdAndUpdate(id, update, option)
            if (!user) throw createError.NotFound("User not registered")
            res.send(user)

        } catch (error) {
            next(error)
        }
    }
}