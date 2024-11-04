const JWT = require('jsonwebtoken')
const createError = require('http-errors')
const client = require('./init_redis')

module.exports = {
    signAccessToken: (userId) => {
        return new Promise((resolve, reject) => {
            const payload = {
            }
            const secret = process.env.ACCESS_TOKEN_SECRET
            const option = {
                expiresIn: '1d',
                issuer: '22520120@gm.uit.edu.vn',
                audience: userId
            }
            JWT.sign(payload, secret, option, (err, token) => {
                if (err) {
                    console.log(err.message)
                    reject(createError.InternalServerError())
                }
                resolve(token)
            })
        })
    },
    verifyAccessToken: (req, res, next) => {
        if (!req.headers['authorization']) return next(createError.Unauthorized())
        const authHeader = req.headers['authorization']
        const bearerToken = authHeader.split(' ')
        const token = bearerToken[1]
        JWT.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
            if (err) {
                const message = err.name === 'JsonWebTokenError' ? 'Unauthorized' : err.message
                return next(createError.Unauthorized(message))
            }
            req.payload = payload
            next()
        })
    },
    signRefreshToken: (userId) => {
        return new Promise((resolve, reject) => {
            const payload = {
            }
            const secret = process.env.REFRESH_TOKEN_SECRET
            const option = {
                expiresIn: '1y',
                issuer: '22520120@gm.uit.edu.vn',
                audience: userId
            }
            JWT.sign(payload, secret, option, async (err, token) => {
                if (err) {
                    console.log(err.message)
                    reject(createError.InternalServerError())
                }
                try {
                    await client.setEx(
                        userId,
                        365 * 24 * 60 * 60, // thời gian hết hạn (giây)
                        token
                    )
                    resolve(token)
                } catch (redisError) {
                    console.log('Redis error:', redisError.message)
                    reject(createError.InternalServerError())
                }
            })
        })
    },
    verifyRefreshToken: (refreshToken) => {
        return new Promise((resolve, reject) => {
            JWT.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, payload) => {
                if (err) return reject(createError.Unauthorized())
                try {
                    const userId = payload.aud
                    const result = await client.get(userId)

                    if (refreshToken === result) {
                        return resolve(userId)
                    }
                    reject(createError.Unauthorized())
                } catch (error) {
                    console.log(error.message)
                    reject(createError.InternalServerError())
                }
            })
        })
    }

}