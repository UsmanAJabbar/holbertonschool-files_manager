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
    if (!mongoUserId) return res.status(401).json({ error: 'Unauthorized' });

    const database = await DBClient.connection;
    let collection = database.collection('users')
    const user = await collection.findOne({ _id: new mongo.ObjectID(mongoUserId) });

    const fileTypeOptions = ['folder', 'file' , 'image'];
    const { name, type, data } = req.body;
    let parentId = (req.body.parentId) ? req.body.parentId : 0;
    let isPublic = (req.body.isPublic) ? req.body.isPublic : false;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !fileTypeOptions.includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });
    if (parentId) {
      const folder = await database.collection('files').findOne({ _id: mongo.ObjectID(parentId) });
      if (!folder) return res.status(400).json({ error: 'Parent not found' });
      if (folder.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    if (type === 'folder') {
      const query = await database.collection('files').insertOne({
        userId: new mongo.ObjectID(user._id),
        name, type, isPublic,
        parentId: (parentId) ? mongo.ObjectID(parentId) : 0,
      });
      const folder = query.ops[0];
      folder.id = folder._id;
      return res.status(201).json(folder);
    }

    let path = process.env['FOLDER_PATH'] || '/tmp/files_manager';
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
          if (err) return res.status(500).send(`oh no\n${err.message}`);
          return res.status(201).json({
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
        const file = await fileColl.findOne(filterQuery)
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
  static async putPublish (req, res) {
    const token = req.headers['x-token'];
    const fileId = req.body.id || req.id;

    // Test PUT data !== undefined
    console.log(fileId);

    const database = await DBClient.connection;
    const userColl = database.collection('users');
    const fileColl = database.collection('files');

    const mongoUserId = await RedisClient.get(`auth_${token}`);
    const user = await userColl.findOne({ _id: new mongo.ObjectId(mongoUserId) });

    if (!user) res.status(401).json({ error:'Unauthorized' });
    else {
      const filterQuery = { _id: new mongo.ObjectId(fileId), userId: user._id.toString() };
      const file = await fileColl.findOne(filterQuery);

      if (!file) res.status(404).json({ error:'Not found' });
      await fileColl.updateOne(filterQuery, { '$set': { 'isPublic':  true } })

      const updatedDoc = await fileColl.findOne(filterQuery);
      res.status(200).json(updatedDoc);
    }
  }
  static async putUnpublish (req, res) {
    const token = req.headers['x-token'];
    const fileId = req.body.id || req.id;

    // Test PUT data !== undefined
    console.log(fileId);

    const database = await DBClient.connection;
    const userColl = database.collection('users');
    const fileColl = database.collection('files');

    const mongoUserId = await RedisClient.get(`auth_${token}`);
    const user = await userColl.findOne({ _id: new mongo.ObjectId(mongoUserId) });

    if (!user) res.status(401).json({ error:'Unauthorized' });
    else {
      const filterQuery = { _id: new mongo.ObjectId(fileId), userId: user._id.toString() };
      const file = await fileColl.findOne(filterQuery);

      if (!file) res.status(404).json({ error:'Not found' });
      await fileColl.updateOne(filterQuery, { '$set': { 'isPublic':  false } })

      const updatedDoc = await fileColl.findOne(filterQuery);
      res.status(200).json(updatedDoc);
    }
  }
}

module.exports = FilesController;
