import DBClient from '../utils/db';
import RedisClient from '../utils/redis';
import { decode } from 'js-base64';
import { v4 as uuid4 } from 'uuid';
const sha1 = require('sha1');

class AuthController {
  static async getConnect (req, res) {
    const [ authType, b64UserPass ] = req.headers.authorization.split(' ');

    if (authType != 'Basic') res.status(500).json({'error': 'Invalid auth type'});
    else {
      const [ email, password ] = decode(b64UserPass).split(':', 2);
      const user = await DBClient.findOne({'email': email,
                                           'password': sha1(password)});

      if (!user) res.status(401).json({"error":"Unauthorized"})
      else {
        const token = uuid4();
        const key = `auth_${token}`;

        await RedisClient.set(key, user._id, 24 * 60 * 60);
        res.status(200).json({ token });
      }
    }

  }
  static async getDisconnect (req, res) {
    const token = req.headers['X-Token'];
    const key = `auth_${token}`;

    const user = await RedisClient.get(key);
    if (!user) res.status(401).json({"error":"Unauthorized"});
    else {
      res.status(204).send();
      await RedisClient.del(key);
    }
  }
}
module.exports = AuthController;