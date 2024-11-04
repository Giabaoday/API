const Joi = require('@hapi/joi')

const authRegisterSchema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(4).required()
})

const authLoginSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(4).required()
})

const getUserSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
})

const passwordSchema = Joi.object({
    password: Joi.string().min(4).required(),

// const profileChangeSchema = Joi.object({

// })

})
module.exports = {
    authRegisterSchema,
    authLoginSchema,
    getUserSchema,
    passwordSchema
}