const redis = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.redisClient = redis.createClient().on('error', () => redis.print);
  }

  isAlive() {
    return this.redisClient.connected;
  }

  async get(key) {
    const redisGet = promisify(this.redisClient.get);
    const value = await redisGet(key);
    return value;
  }

  async set(key, value, expDuration) {
    const redisSet = promisify(this.redisClient.setex);
    await redisSet(key, expDuration, value);
  }

  async del(key) {
    const redisDel = promisify(this.redisClient.del);
    await redisDel(key);
  }
}

const redisClient = RedisClient();
export default redisClient;
