const createError = require('http-errors')
const Pothole = require('../Models/Pothole.model')
const User = require('../Models/User.model')

module.exports = {
    getDashboardStats: async (req, res, next) => {
        try {
            // Get user ID from token
            const userId = req.payload.aud;

            // Get total count of all potholes
            const totalPotholes = await Pothole.countDocuments();

            // Count potholes by severity
            const severityCounts = await Pothole.aggregate([
                {
                    $group: {
                        _id: "$severity.level",
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get user's distance traveled
            const user = await User.findById(userId);
            if (!user) throw createError.NotFound('User not found');
            
            res.json({
                status: 'success',
                data: {
                    total: totalPotholes,
                    bySeverity: severityCounts.reduce((acc, curr) => {
                        acc[curr._id] = curr.count;
                        return acc;
                    }, {}),
                    distance_traveled: user.distance_traveled
                }
            });
            
        } catch (error) {
            next(error);
        }
    },
    getDailyPotholes: async (req, res, next) => {
        try {
            const { startDate, endDate } = req.body;
            
            if (!startDate || !endDate) {
                throw createError.BadRequest('Start date and end date are required');
            }

            // Convert dates to UTC midnight
            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                throw createError.BadRequest('Invalid date format');
            }
            
            // Aggregate pipeline for daily counts
            const dailyCounts = await Pothole.aggregate([
                {
                    $match: {
                        createdAt: { $gte: start, $lte: end }
                    }
                },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            severity: "$severity.level"
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.date": 1 }
                }
            ]);

            // Transform data for frontend chart
            const chartData = dailyCounts.reduce((acc, curr) => {
                const { date, severity } = curr._id;
                
                // Find or create date entry
                let dateEntry = acc.find(item => item.date === date);
                if (!dateEntry) {
                    dateEntry = {
                        date,
                        total: 0,
                        Low: 0,
                        Medium: 0,
                        High: 0
                    };
                    acc.push(dateEntry);
                }
                
                // Update counts
                dateEntry[severity] = curr.count;
                dateEntry.total += curr.count;
                
                return acc;
            }, []);

            res.json({
                status: 'success',
                data: chartData
            });

        } catch (error) {
            next(error);
        }
    }
}