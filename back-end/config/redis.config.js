const redis = require('redis');

// Tạo một client Redis
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379', // lấy từ .env hoặc fallback local
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

// Hàm connect
const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('Redis Connected');
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        process.exit(1);
    }
};

// Xuất ra để file khác dùng
module.exports = {
    connectRedis,
    redisClient,
};
