const express = require('express')
const router = express.Router()
const MapController = require('../Controllers/Map.controller')

router.get('/tiles/:z/:x/:y.png', MapController.getTile)
router.get('/tiles/:z/:x/:y/potholes', MapController.getPotholesByTile)
router.get('/metadata', MapController.getMapMetadata)

router.post('/addPothole', MapController.add)

router.get('/getAllPothole', MapController.getAllPothole)

router.post('/filter', MapController.getPotholesByFilter)
module.exports = router