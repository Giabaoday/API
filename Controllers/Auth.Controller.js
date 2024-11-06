const createError = require('http-errors')
const User = require('../Models/User.model')
const { authRegisterSchema, authLoginSchema, passwordSchema, emailSchema } = require('../helpers/validation_schema')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../helpers/jwt_helper')
const client = require('../helpers/init_redis')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const { OAuth2Client } = require('google-auth-library');
const ggclient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

module.exports = {
    register: async (req, res, next) => {
        try {
            // const {username, email, password} = req.body
            // if (!username || !email || !password) throw createError.BadRequest()
            const result = await authRegisterSchema.validateAsync(req.body)
    
            const doesExist = await User.findOne({ email: result.email })
            if (doesExist)
                throw createError.Conflict(`${result.email} is already been registed!`)
    
            const user = new User(result)
            const savedUser = await user.save()
            const accessToken = await signAccessToken(savedUser.id)
            const refreshToken = await signRefreshToken(savedUser.id)
            res.send({ accessToken, refreshToken })
    
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            next(error)
        }
    },

    login: async (req, res, next) => {
        try {
            const result = await authLoginSchema.validateAsync(req.body)
            const user = await User.findOne({ email: result.email })
            if (!user) throw createError.NotFound("User not registered")
    
            const isMatch = await user.isValidPassword(result.password)
            if (!isMatch) throw createError.Unauthorized("Email/Password not valid")
    
            const accessToken = await signAccessToken(user.id)
            const refreshToken = await signRefreshToken(user.id)
    
            res.send({ accessToken, refreshToken })
        } catch (error) {
            if (error.isJoi === true) return next(createError.BadRequest("Invalid Username/Password"))
            next(error)
        }
    },

    refreshToken: async (req, res, next) => {
        try {
            const { refreshToken } = req.body
            if (!refreshToken) throw createError.BadRequest()
            const userId = await verifyRefreshToken(refreshToken)
    
            const accessToken = await signAccessToken(userId)
            const refToken = await signRefreshToken(userId)
            res.send({ accessToken: accessToken, refreshToken: refToken })
        } catch (error) {
            next(error)
        }
    },

    logout: async (req, res, next) => {
        try {
            const { refreshToken } = req.body
            if (!refreshToken) throw createError.BadRequest()
            
            const userId = await verifyRefreshToken(refreshToken)
            await client.del(userId)
            
            res.sendStatus(204)
        } catch (error) {
            next(error)
        }
    },
    forgotPassword: async (req, res, next) => {
        try {
            const email = await emailSchema.validateAsync(req.body)
            const user = await User.findOne({ email: email.email })
            if (!user) throw createError.NotFound('User not registered')

            // Generate OTP
            const otp = crypto.randomInt(100000, 999999).toString()
            const otpExpiry = Date.now() + 10*60*1000 // OTP expires in 10 minutes

            // Store OTP in Redis with expiry
            await client.setEx(
                `otp:${email.email}`,
                600, // 10 minutes in seconds
                JSON.stringify({
                    otp: otp,
                    expiry: otpExpiry
                })
            )

            // Send email with OTP
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            })

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email.email,
                subject: 'Password Reset OTP',
                text: `Your OTP for password reset is: ${otp}. This OTP will expire in 10 minutes.`
            })

            res.send({ message: 'OTP sent to email' })
        } catch (error) {
            next(error)
        }
    },

    verifyOTP: async (req, res, next) => {
        try {
            const { email, otp } = req.body

            // Get stored OTP data
            const storedOTPData = await client.get(`otp:${email}`)
            if (!storedOTPData) throw createError.BadRequest('OTP expired or invalid')

            const { otp: storedOTP, expiry } = JSON.parse(storedOTPData)

            // Check if OTP matches and not expired
            if (otp !== storedOTP) throw createError.BadRequest('Invalid OTP')
            if (Date.now() > expiry) throw createError.BadRequest('OTP expired')

            // Generate temporary token for password reset
            const resetToken = crypto.randomBytes(32).toString('hex')
            await client.setEx(
                `reset:${email}`,
                300, // 5 minutes expiry
                resetToken
            )

            res.send({ resetToken })
        } catch (error) {
            next(error)
        }
    },

    resetPassword: async (req, res, next) => {
        try {
            const { email, resetToken, newPassword } = req.body

            // Verify reset token
            const storedToken = await client.get(`reset:${email}`)
            if (!storedToken || storedToken !== resetToken) {
                throw createError.BadRequest('Invalid or expired reset token')
            }

            // Update password
            const user = await User.findOne({ email })
            if (!user) throw createError.NotFound('User not found')

            
            // Update user password
            user.password = newPassword
            await user.save()

            // Clear reset token
            await client.del(`reset:${email}`)

            res.send({ message: 'Password updated successfully' })
        } catch (error) {
            next(error)
        }
    },
    googleSignIn: async (req, res, next) => {
        try {
            const { credential } = req.body; // Get ID token from request
            
            if (!credential) {
                throw createError.BadRequest('ID Token is required');
            }
    
            // Verify Google ID token
            const ticket = await ggclient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
    
            const payload = ticket.getPayload();
            
            // Extract user information from payload
            const { email, name, picture, email_verified } = payload;
    
            if (!email_verified) {
                throw createError.Unauthorized('Email not verified with Google');
            }
    
            // Check if user exists
            let user = await User.findOne({ email: email });
    
            if (!user) {
                // Create new user if not exists
                user = new User({
                    username: name,
                    email: email,
                    // Generate random password since we're using Google Sign In
                    password: require('crypto').randomBytes(16).toString('hex')
                });
                await user.save();
            }
    
            // Generate tokens
            const accessToken = await signAccessToken(user.id);
            const refreshToken = await signRefreshToken(user.id);
    
            res.json({
                status: 'success',
                message: 'Successfully signed in with Google',
                data: {
                    user: {
                        id: user.id,
                        name: user.username,
                        email: user.email
                    },
                    accessToken,
                    refreshToken
                }
            });
    
        } catch (error) {
            console.error('Google sign in error:', error);
            next(error);
        }
    }
}