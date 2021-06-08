const sha1 = require('sha1');
import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

class UsersController {
  static async postNew (req, res) {
    const { email, password } = req.params;

    // Unsure why req.params == {}
    console.log(req.params, email, password);

    if (!email) res.status(400).json({"error":"Missing email"});
    else if (!password) res.status(400).json({"error":"Missing password"})
    else {
      const MongoDBClient = await new DBClient();
      
      if (await MongoDBClient.findOne({ email })) {
        res.status(400).json({"error":"Already exist"})
      }

      const hashedPass = sha1(password);
      await MongoDBClient.insertOne({email, 'password': hashedPass});

      const lastUser = await MongoDBClient.findOne({ email });
      res.status(201).json({
        id: lastUser.id,
        email: lastUser.email,
      });

    }
  }
  static async getMe (req, res) {
    const token = req.headers['X-Token'];
    const key = `auth_${token}`;

    const redisUser = await RedisClient.get(key);
    if (!redisUser) res.status(401).json({"error":"Unauthorized"});
    else {
      const mongoUser = await DBClient.findOne({'_id': user._id});
      res.status(200).send({
        'id': mongoUser._id,
        'email': mongoUser.email,
      })
    }
  }
}

module.exports = UsersController;