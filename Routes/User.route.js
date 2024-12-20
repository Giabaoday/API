const express = require('express')
const router = express.Router()
const AuthController = require('../Controllers/Auth.Controller')
const UserController = require('../Controllers/User.controller')
const User = require('../Models/User.model')

router.get('/me', UserController.getCurrentUser)
router.get('/', UserController.getAllUser )
router.get('/getId', UserController.getUserByEmail)
router.post('/getUser', UserController.getUserById)
router.patch('/updateDistance', UserController.updateUserDistance)
router.patch('/settings', UserController.updateSettings)
router.post('/sendReport', UserController.sendReport)

module.exports = router