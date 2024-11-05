const express = require('express')
const router = express.Router()
const AuthController = require('../Controllers/Auth.Controller')

router.post('/register', AuthController.register )

router.post('/login', AuthController.login )

router.post('/refresh-token', AuthController.refreshToken)

router.delete('/logout', AuthController.logout )

router.post('/forgot-password', AuthController.forgotPassword)

router.post('/verify-otp', AuthController.verifyOTP)

router.post('/reset-password', AuthController.resetPassword)

module.exports = router