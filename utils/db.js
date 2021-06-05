import { env } from 'process';
import { promisify } from 'util';
const mongoClient = require('mongodb').MongoClient;


const DB_HOST = env.DB_HOST || 'localhost';
const DB_PORT = env.DB_PORT || 27017;
const DB_DATABASE = env.DB_DATABASE || 'files_manager'
const url = `mongodb://${DB_HOST}:${DB_PORT}`;

class DBClient {
  constructor() {
    this.mongoClient = new mongoClient(url);
    this.mongoDB = this.mongoClient.connect((err) => {
      if (!err) return this.mongoClient.db(DB_DATABASE);
      return null;
    })
  }

  isAlive() {
    return this.mongoClient.isConnected;
  }

  async nbUsers() {
    const collection = promisify(this.mongoDB.collection).bind(this.mongoClient);
    const numOfUsers = await collection('users').countDocuments();
    return numOfUsers;
  }

  async nbFiles() {
    const collection = promisify(this.mongoDB.collection).bind(this.mongoClient);
    const numOfFiles = await collection('files').countDocuments();
    return numOfFiles;
  }
}
const dbClient = new DBClient();
export default dbClient;