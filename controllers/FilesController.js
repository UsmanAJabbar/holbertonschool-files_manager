import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

class FilesController {
  static async postUpload (res, req) {
    const token = res.headers['X-Token'];

    const mongoUserId = await RedisClient.get(`auth_${token}`);
    if (!mongoUserId) res.status(401).json({"error":"Unauthorized"})
    else {
      const user = DBClient.findOne({id: mongoUserId});
      const { name, type, parentId = 0, isPublic = false, data } = req.params;
      const fileTypeOptions = [ 'folder', 'file' , 'image' ];

      if (user && name && fileTypeOptions.includes(type)) {
        
      } else if (!name) {
        res.status(400).json({"error":"Missing name"});
      } else if (!fileTypeOptions.includes(type)) {
        res.status(400).json({"error":"Missing type"});
      } else if (!data && type !== 'folder') {
        res.status(400).json({"error":"Missing data"});
      }

    }
  }
}