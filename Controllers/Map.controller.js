const createError = require('http-errors')
const Pothole = require('../Models/Pothole.model')
const {createPotholeSchema} = require("../helpers/validation_schema")
const MBTiles = require('@mapbox/mbtiles')
const path = require('path')
const { promisify } = require('util')

let mbtilesInstance = null;
const getMBTiles = async () => {
    if (mbtilesInstance) return mbtilesInstance;
    
    const mbtilesLocation = path.join(__dirname, '../Map/dhqg-tphcm.mbtiles');
    return new Promise((resolve, reject) => {
        new MBTiles(mbtilesLocation + '?mode=ro', (err, mbtiles) => {
            if (err) reject(err);
            mbtilesInstance = mbtiles;
            resolve(mbtiles);
        });
    });
};

const EMPTY_TILE = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEAAQMAAABmvDolAAAAA1BMVEUAAACnej3aAAAAAXRSTlMAQObYZgAAAAlwSFlzAAAOxAAADsQBlSsOGwAAADZJREFUeJztwQEBAAAAgiD/r25IQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgJcBH4gAAVI8k98AAAAASUVORK5CYII=',
    'base64'
);

module.exports = {
    add: async (req, res, next) => {
        try {
            result = await createPotholeSchema.validateAsync(req.body)
            const potholeData = {
                ...result,
                location: {
                    address: result.location.address,
                    coordinates: {
                        type: 'Point',
                        coordinates: [
                            result.location.coordinates.longitude,
                            result.location.coordinates.latitude
                        ]
                    }
                },
                reportedBy: req.payload.aud
            }

            const pothole = new Pothole(potholeData)
            const savedPothole = await pothole.save()
            res.send(savedPothole)

        } catch (error) {
            if (error.isJoi === true) error.status = 422
            next(error)            
        }
    },

    getAllPothole: async (req, res, next) => {
        try {
            const result = await Pothole.find({}, {__v: 0})
            res.send(result)
        } catch (error) {
            next(error)
        }
    },

    getTile: async (req, res, next) => {
        try {
            const { z, x, y } = req.params;
            
            const zoom = parseInt(z);
            const tileX = parseInt(x);
            let tileY = parseInt(y);
    
            if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
                console.log('Invalid tile coordinates:', { z, x, y });
                return sendEmptyTile(res);
            }
    
            // Convert from XYZ to TMS
            tileY = Math.pow(2, zoom) - 1 - tileY;
    
            try {
                const mbtiles = await getMBTiles();
                const getTileAsync = promisify(mbtiles.getTile.bind(mbtiles));
                
                try {
                    const tile = await getTileAsync(zoom, tileX, tileY);
                    if (tile) {
                        res.set('Content-Type', 'image/png');
                        res.set('Content-Length', tile.length);
                        res.set('Cache-Control', 'public, max-age=3600');
                        return res.send(tile);
                    }
                    return sendEmptyTile(res);
                } catch (error) {
                    console.log('Tile error:', error.message, { zoom, tileX, tileY });
                    return sendEmptyTile(res);
                }
            } catch (error) {
                console.log('MBTiles error:', error.message);
                return sendEmptyTile(res);
            }
        } catch (error) {
            console.error('General error:', error);
            return sendEmptyTile(res);
        }
    },

    getMapMetadata: async (req, res, next) => {
        try {
            const mbtiles = await getMBTiles();
            const getInfoAsync = promisify(mbtiles.getInfo.bind(mbtiles));
            const info = await getInfoAsync();
            res.send(info);
        } catch (error) {
            next(error);
        }
    },

    getPotholesByTile: async (req, res, next) => {
        try {
            const { z, x, y } = req.params;
            
            // Convert params to numbers
            const zoom = parseInt(z);
            const tileX = parseInt(x);
            const tileY = parseInt(y);

            // Validate params
            if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
                return next(createError.BadRequest('Invalid tile coordinates'));
            }

            const bbox = tileToBox(tileX, tileY, zoom);
            
            // Find potholes within the bounding box
            const potholes = await Pothole.find({
                'location.coordinates': {
                    $geoWithin: {
                        $box: [
                            [bbox.west, bbox.south],
                            [bbox.east, bbox.north]
                        ]
                    }
                }
            }).populate('reportedBy', 'username -_id');

            const geojson = {
                type: 'FeatureCollection',
                features: potholes.map(pothole => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: pothole.location.coordinates.coordinates
                    },
                    properties: {
                        id: pothole._id,
                        severity: pothole.severity.level,
                        dimension: pothole.description.dimension,
                        depth: pothole.description.depth,
                        reportedBy: pothole.reportedBy.username,
                        createdAt: pothole.createdAt
                    }
                }))
            };

            res.send(geojson);
        } catch (error) {
            next(error);
        }
    }
};


function sendEmptyTile(res) {
    res.set('Content-Type', 'image/png');
    res.set('Content-Length', EMPTY_TILE.length);
    res.set('Cache-Control', 'public, max-age=3600');
    res.status(200); // Quan trọng: trả về status 200 thay vì 404
    return res.send(EMPTY_TILE);
}
// Utility function to convert tile coordinates to bounding box
function tileToBox(x, y, z) {
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
    const west = x / Math.pow(2, z) * 360 - 180
    const east = (x + 1) / Math.pow(2, z) * 360 - 180
    const south = 180 / Math.PI * Math.atan(Math.sinh(n))
    const north = 180 / Math.PI * Math.atan(Math.sinh(n + 2 * Math.PI / Math.pow(2, z)))
    
    return { north, south, east, west }
}
