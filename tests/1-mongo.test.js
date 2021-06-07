import dbClient  from "../utils/db";

const assert = require('assert');


describe('MongoDB', async() =>{

    it('isAlive', async () => {
        assert.equal(true, await dbClient.isAlive());
    });

    it('nbUsers', async () => {
        assert.equal(true, 0 <= await dbClient.nbUsers());
    });
    it('bnFiles', async () => {
        assert.equal(true, 0 <= await dbClient.nbFiles());
    });

});