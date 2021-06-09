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
    if (!mongoUserId) res.status(401).json({ error: 'Unauthorized' })
    else {

      const database = await DBClient.connection;
      let collection = database.collection('users')
      const user = await collection.findOne({ _id: new mongo.ObjectID(mongoUserId) });

      const { name, type, parentId = 0, isPublic = false, data } = req.body;
      const fileTypeOptions = ['folder', 'file' , 'image'];

      if (user && name && fileTypeOptions.includes(type)) {
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
      } else if (!name) {
        res.status(400).json({ error: 'Missing name' });
      } else if (!type || !fileTypeOptions.includes(type)) {
        res.status(400).json({ error: 'Missing type' });
      } else if (!data && type !== 'folder') {
        res.status(400).json({ error: 'Missing data' });
      }
    }
  }

  static async getShow (req, res) {
    const fileId = req.body.id;
    const token = req.headers['x-token'];

    if (!token || !fileId) res.status(401).json({ error:'Unauthorized' });
    else {
      const database = await DBClient.connection;
      const userColl = database.collection('users');
      const fileColl = database.collection('files');

      const mongoUserId = await RedisClient.get(`auth_${token}`);
      const user = await userColl.findOne({ _id: new mongo.ObjectId(mongoUserId) });
      if (user) {
        const file = await fileColl.findOne({ _id: new mongo.ObjectId(fileId), userId: user._id.toString() })
        if (!file) res.status(404).json({ error:'Not found' });
        else res.status(200).json(file);
      }
    }
  }

  static async getIndex (req, res) {
    const token = req.headers['x-token'];
    const parentId = req.query.parentId || 0;
    const page = req.query.page || 0;

    const database = await DBClient.connection;
    const userColl = database.collection('users');
    const fileColl = database.collection('files');

    const mongoUserId = await RedisClient.get(`auth_${token}`);
    const user = await userColl.findOne({ _id: new mongo.ObjectId(mongoUserId) });

    if (!user) res.status(401).json({ error:'Unauthorized' });
    else {
      const docsPerPage = 20;
      const filterQuery = [ 
                            { '$match': { parentId, userId: user._id.toString() } },
                            { '$limit': docsPerPage },
                            { '$skip': page * docsPerPage },
                          ]
      const fileDocs = await fileColl.aggregate(filterQuery);
      res.status(200).json(fileDocs);
    }
  }
}

module.exports = FilesController;
