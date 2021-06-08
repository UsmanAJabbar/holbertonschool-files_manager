import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

const sha1 = require('sha1');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) res.status(400).json({ error: 'Missing email' });
    else if (!password) res.status(400).json({ error: 'Missing password' });
    else {
      const database = await DBClient.connection;

      const collection = database.collection('users');
      const user = await collection.findOne({ email });

      if (user !== null) res.status(400).send('Already exist');
      else {
        const hashedPass = sha1(password);
        await collection.insertOne({ email, password: hashedPass });
        const lastUser = await collection.findOne({ email });
        res.status(201).json({
          id: lastUser.id,
          email: lastUser.email,
        });
      }
    }
  }

  static async getMe(req, res) {
    const token = req.headers['X-Token'];
    const key = `auth_${token}`;

    const redisUser = await RedisClient.get(key);
    if (!redisUser) res.status(401).json({ error: 'Unauthorized' });
    else {
      const database = await DBClient.connection;
      const collection = database.collection('users');
      const mongoUser = await collection.findOne({ _id: redisUser._id });
      res.status(200).send({
        id: mongoUser._id,
        email: mongoUser.email,
      });
    }
  }
}

module.exports = UsersController;
