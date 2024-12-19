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

const emailSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
})

const passwordSchema = Joi.object({
    password: Joi.string().min(4).required(),

})

const createPotholeSchema = Joi.object({
    location: Joi.object({
        address: Joi.string().required(),
        coordinates: Joi.object({
            latitude: Joi.number().min(-90).max(90).required(),
            longitude: Joi.number().min(-180).max(180).required()
        }).required()
    }).required(),

    description: Joi.object({
        dimension: Joi.string().valid('Compact', 'Average', 'Large').required(),
        depth: Joi.string().valid('Shallow', 'Noticeable', 'Deep').required(),
        shape: Joi.string().valid('Uniform', 'Uneven', 'Jagged').required()
    }).required(),

    severity: Joi.object({
        level: Joi.string().valid('Low', 'Medium', 'High').required(),
        causesDamage: Joi.boolean().default(false)
    }).required(),

    image: Joi.string().uri().allow('').optional()
})

const updateUserDistanceSchema = Joi.object({
    distance_traveled: Joi.number().min(0).required()
})

const updateSettingsSchema = Joi.object({
    username: Joi.string().optional(),
    birthday: Joi.date().optional(),
    country: Joi.string().optional(),
    currentPassword: Joi.string().min(4).optional(),
    newPassword: Joi.string().min(4).optional()
}).with('newPassword', 'currentPassword')  // Nếu có newPassword thì phải có currentPassword

module.exports = {
    authRegisterSchema,
    authLoginSchema,
    emailSchema,
    passwordSchema,
    createPotholeSchema,
    updateUserDistanceSchema,
    updateSettingsSchema
}