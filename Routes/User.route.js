const express = require('express')
const router = express.Router()
const AuthController = require('../Controllers/Auth.Controller')
const UserController = require('../Controllers/User.controller')

router.get('/', UserController.getAllUser )
router.get('/getId', UserController.getUserByEmail)
router.patch('/updateDistance', UserController.updateUserDistance)
router.patch('/settings', UserController.updateSettings)

module.exports = router