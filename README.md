# Uno-Mongo
For one connection to the Mongo database for all modules in a project

## Usage
const {UnoMongo, Collection}=require(uno-mongo);

// In one place as the server starts up
await UnoMongo.connect(uri,options)
uri: if undefined, process.env.MONGODB_URI will be used, or mongodb://localhost:27017

unoMongo.db.collection('documents').insertMany

class Users extends Collection {}
Users.start('users','default',{},[])
modules.Users=Users

