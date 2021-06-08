const crypto = require('crypto');
import DBClient from '../utils/db';

/**
 * SHA1 - Hashes a string with the SHA1 algo
 * @returns SHA1-hashed string
 */
const sha1 = (data) => {
  return crypto.createHash("sha1").update(data, "binary").digest("hex");
}

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
}

module.exports = UsersController;