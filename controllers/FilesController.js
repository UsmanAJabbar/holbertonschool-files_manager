import DBClient from '../utils/db';
import RedisClient from '../utils/redis';
import { v4 as uuid4 } from 'uuid';

const mongo = require('mongodb');
const process = require('process');
const fs = require('fs');

class FilesController {
  static async postUpload (req, res) {
    const token = req.headers['x-token'];

    const mongoUserId = await RedisClient.get(`auth_${token}`);
    if (!mongoUserId) res.status(401).json({ error:'Unauthorized' })
    else {

      const database = await DBClient.connection;
      let collection = database.collection('users')
      const user = await collection.findOne({ _id: new mongo.ObjectID(mongoUserId) });


      const { name, type, parentId = 0, isPublic = false, data } = req.body;
      const fileTypeOptions = ['folder', 'file' , 'image'];

      if (user && name && fileTypeOptions.includes(type)) {

      } else if (!name) {
        res.status(400).json({ error: 'Missing name' });
      } else if (!fileTypeOptions.includes(type)) {
        res.status(400).json({ error: 'Missing type' });
      } else if (!data && type !== 'folder') {
        res.status(400).json({ error: 'Missing data' });
      }

      const path = process.env['FOLDER_PATH'] || '/tmp/files_manager';
      const file = {
        userId: user._id,
        name,
        type,
        isPublic,
        parentId,
      };

      if (['file', 'image'].includes(file.type)) {
        if (file.parentId !== 0){
          path = `${path}/${file.parentId}`;
        }
        file.localPath = `${path}/${uuid4()}`;
      }
      collection = database.collection('files');
      collection.insertOne(file, (err, result) => {
        if (err) return;
        const file = result.ops[0];

        const decode = (base64) => {
          const buffer = Buffer.from(base64, 'base64');
          return buffer.toString('utf-8');
        };

        fs.mkdir(path, () => {
          fs.writeFile(file.localPath, decode(data), (err) => {
            if (err) res.status(500).send(`oh no\n${err.message}`);
            else res.status(201).json({
              id: file._id,
              userId: file.userId,
              name: file.name,
              type: file.type,
              isPublic: file.isPublic,
              parentId: file.parentId,
            });
          });
        });

      });
    }
  }
}

module.exports = FilesController;
