# Mongo Collections
A declarative way to define MongoDB collections, and use them like Models through out a project. And/or one connection to the database for all modules in a project. 

This library builds on mongo-models, though it is not a drop in replacement. Significant changes are
1. To build the 'Model' you extend the Collection class
2. All the methods of Mongodb's Collection are available and work as defined by Mongodb
3. The schema of mongo-models is not required but can be implemented. Alternatively you can declare the schema for Mongo to use or skip it entirely.
4. Collections are initialitezed per their declarations after Mongo connects. The can have options at the time they are created, indexes can be defined, and predefined documents can be loaded if the collection is empty

## Usage

### Mongo
```
const {Mongo}=require(mongo-collections);

// this can be used in every file in the project
Mongo.db.collection('articles').insertOne({titie: "This is Mongo})

// In one place as the server starts up this is needed
await Mongo.connect(uri,options, connectionName)
// uri: if undefined, process.env.MONGODB_URI will be used, or mongodb://localhost:27017
// options: as defined by MongoDB's connect
// connectionName - defaults to default allows you to support connections to multiple database servers
```

### Collection
```
class User extends Collection {
    static connectionName='default' // optional default is the default 
    static collectionName='users' // required! name for the collection
    static collectionOptions // optional, collection options as defined in MongoDB createCollection 
    static collectionIndexes // optional indexes as defined in db.collection.createIndexes
    static validate(doc){} // optional if present, is run when new User is invoked, must return {result: doc} if successful 
                         //or {error: message} if validation fails
    static initialDocs // optional an array of docs write/over write into the collection. Must have _id defined as ObjectId
}

User.preLoad(docs)  // call this with and an array of docs to write/overwrite into the collection. Must have _id, but can be:
                    // {_id: '657a09190323255560f77c3e'}
                    // {_id: {$oid: '657a09190323255560f77c3e'}}
                    // {_id: {Mongodb.ObjectId('657a09190323255560f77c3e')}}
                    // checks for duplicate ids
                    // throws an error if no _id
                    // if possible after Mongo.connect is called, should:
                    // await User.preLoad(docs)
                    // sets or concatenates to initialDocs

User.setCollectionProps() // required for initialization if possibly after Mongo.connect is called, should: 
                          // await User.setCollectionProps

```



## Examples
### The basic use case:
```JS
const { Mongo }=require(mongo-collections);

await Mongo.connect() // gets URI from $MONOGDB_ENV is not specified

await Mongo.db.collection('articles').insertOne({titie: "This is Mongo})

```
### Declarative Collections

articles.js:
```JS
const { Collection }=require(mongo-collections);

class Articles extends Collection {
    collectionName="articles"
}

Articles.setCollectionProps() // await may be needed if this runs after the Mongo.connect has been called
module.exports=Articles
```

main.js:
```JS
    // somewhere before startup of the server
    await Mongo.connect()

```

mycode.js:
```JS
const {Articles}=require('articles')


async function doSomethingWithArticles(){

    const article=await Articles.findOne({})

}
```

## More Examples
see [test.js](./__tests__/test.js)