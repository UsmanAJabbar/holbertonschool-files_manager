import { env } from 'process';
import { promisify } from 'util';
const mongoClient = require('mongodb').MongoClient;


const DB_HOST = env.DB_HOST || 'localhost';
const DB_PORT = env.DB_PORT || 27017;
const DB_DATABASE = env.DB_DATABASE || 'files_manager'
const url = `mongodb://${DB_HOST}:${DB_PORT}`;

class DBClient {
  constructor() {
    this.mongoClient = new mongoClient(url,{useUnifiedTopology: true });
    this.mongoClient.connect();
    this.database = this.mongoClient.db(DB_DATABASE);
    }
    
  async isAlive() {
    let value;
    try {
      await this.mongoClient.connect();
      value = await this.mongoClient.isConnected();
    } finally {
      // await this.mongoClient.close();
    }

    return value;
  }

  async nbUsers() {
    // const collection = promisify(this.mongoDB.collection).bind(this.mongoClient);
    // const numOfUsers = await collection('users').countDocuments();
    let numOfUsers;
    try {

      const collection = database.collection('users');

      numOfUsers = await collection.countDocuments();
    } finally {
      // await this.mongoClient.close();
    }

    return numOfUsers;
  }

  async nbFiles() {
    // const collection = promisify(this.mongoDB.collection).bind(this.mongoClient);
    // const numOfFiles = await collection('files').countDocuments();
    let numOfFiles;
    try{
      await this.mongoClient.connect();

      const database = this.mongoClient.db(DB_DATABASE);
      const collection = database.collection('files');

      numOfFiles = await collection.countDocuments();
    } finally {
      // await this.mongoClient.close();
    }
    
    return numOfFiles;
  }
}
const dbClient = new DBClient();
export default dbClient;