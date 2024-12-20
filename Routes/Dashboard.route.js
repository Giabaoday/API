const express = require('express')
const router = express.Router()
const DashboardController = require('../Controllers/Dashboard.Controller')

router.get('/stats', DashboardController.getDashboardStats)
router.post('/dailyChart', DashboardController.getDailyPotholes)

module.exports = router