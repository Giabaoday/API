const mongoose = require('mongoose')
const Schema = mongoose.Schema

const PotholeSchema = new Schema({
    location: {
        address: {
            type: String,
            required: true
        },
        coordinates: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],  // [longitude, latitude]
                required: true
            }
        }
    },
    description: {
        dimension: {
            type: String,
            enum: ['Compact', 'Average', 'Large'],
            required: true
        },
        depth: {
            type: String,
            enum: ['Shallow', 'Noticeable', 'Deep'],
            required: true
        },
        shape: {
            type: String,
            enum: ['Uniform', 'Uneven', 'Jagged'],
            required: true
        }
    },

    severity: {
        level: {
            type: String,
            enum: ['Low', 'Medium', 'High'],
            required: true
        },
        causesDamage: {
            type: Boolean,
            default: false
        }
    },

    image: {
        type: String, //URL
        required: false
    },

    reportedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true })

PotholeSchema.index({ "location.coordinates": "2dsphere" })

PotholeSchema.methods.findNearby = function(latitude, longitude, maxDistance = 100) {
    return this.model('Pothole').find({
        'location.coordinates': {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                $maxDistance: maxDistance
            }
        }
    })
}

const Pothole = mongoose.model('Pothole', PotholeSchema)
module.exports = Pothole