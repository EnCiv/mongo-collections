# Mongo Collections
A declarative way to define MongoDB collections, and use them like models throughout a project. And/or one connection to the database for all modules in a project. 

Mongodb is a peer depencency, this works with 5.0 and above.

This is a thin wrapper on top of [mongodb](https://www.npmjs.com/package/mongodb) for those who want to use Mongodb directly. This makes it a little easier to use across the files in a project.

## Usage

### Collection
How to declare a collection, it's options, indexes, and initial docs in one place and use it throught a project
```JS
class User extends Collection {
    static connectionName='default' // optional default is the default, for use when creating connectiongs to multiple different servers
    static collectionName='users' // required! name for the collection
    static collectionOptions // optional, collection options object as defined in MongoDB createCollection 
    static collectionIndexes // optional indexes array as defined in db.collection.createIndexes
    static validate(doc){} // optional function if present, is run when new User is invoked, must return {result: doc} if successful 
                         //or {error: message} if validation fails
    static initialDocs // optional, preload is preferred, array of docs to write/over write into the collection. Must have _id instantiated as ObjectId. No checks are made before upserting to the database
}

User.preload(docs)  // call this with and an array of docs to write/overwrite into the collection. Must have _id, but can be:
                    // {_id: '657a09190323255560f77c3e'}
                    // {_id: {$oid: '657a09190323255560f77c3e'}}
                    // {_id: {Mongodb.ObjectId('657a09190323255560f77c3e')}}
                    // thows an error if duplicate ids
                    // throws an error if no _id
                    // if possibly after Mongo.connect() is called, should:
                    // await User.preload(docs)
                    // sets or concatenates to initialDocs

User.setCollectionProps() // required for initialization if possibly after Mongo.connect is called, should: 
                          // await User.setCollectionProps()
```

### Mongo 
The one connection to the server for all modules in a project. Collections use this one connection as well. You don't have to use Collections to use this.
```JS
const {Mongo}=require(mongo-collections);

// In one place as the server starts up this is needed
await Mongo.connect(uri, options, connectionName)
// uri: if undefined, process.env.MONGODB_URI will be used, or mongodb://localhost:27017
// options: as defined by MongoDB's connect
// connectionName - defaults to 'default' allows you to support connections to multiple database servers

// this can be used in every file in the project
const {Mongo}=require(mongo-collections);

Mongo.db.collection('articles').insertOne({titie: "This is Mongo})

```

## Examples

### Declarative Collections

articles.js:
```JS
const { Collection }=require('mongo-collections');

class Articles extends Collection {
    static collectionName="articles"
}

Articles.setCollectionProps() // await may be needed if this runs after the Mongo.connect has been called
module.exports.Articles=Articles
```

main.js:
```JS
const {Mongo}=require('mongo-collections')

async function main() {
    // somewhere before startup of the server
    await Mongo.connect()
}

main()

```

mycode.js
```JS
const {Articles}=require('articles')


async function doSomethingWithArticles(){
    const article=await Articles.findOne({})
}
```

### connectionName

users.js
```JS
const {Collection}=require('mongo-collections')

class Users extends Collection {
    static connectionName="users"
    static collectionName="users"
}

Users.setCollectionProps()
module.exports.Users=Users

```
main.js
```JS
const {Mongo}=require('mongo-collections')
const {Users}=require('./users')

async function main(){
    await Mongo.connect("URI/To/UsersDBServer",{},'users')
    const user = await Users.findOne({})
}
main()

```
or without using the collection 

main.js
```JS
const {Mongo}=require('mongo-collections')
    async function main(){
    await Mongo.connect("URI/To/UsersDBServer",{},'users')
    const user = await Mongo.dbs['users'].collection('users').findOne({})
}
main()
```

## More Examples
see [test.js](./__tests__/test.js)

# Difference with mongo-models
This library builds on mongo-models, though it is not a drop in replacement. Significant changes are
1. To build the 'Model' you extend the Collection class
2. All the methods of Mongodb's Collection are available and work as defined by Mongodb
3. The schema of mongo-models is not required but can be implemented. Alternatively you can declare the schema for Mongo in collectionOptions to use or skip it entirely.
4. Collections are initialitezed per their declarations after Mongo connects. The can have options at the time they are created, indexes can be defined, and predefined documents can be loaded if the collection is empty.

# About
[EnCiv](https://github.com/EnCiv), Inc. is a 501(c)(3) nonprofit writing open source software for productive large scale democratic discourse. __[Volunteers](https://github.com/EnCiv/volunteers) welcome__. 
