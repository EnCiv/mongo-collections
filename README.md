# Uno-Mongo
For one connection to the Mongo database for all modules in a project. Plus, a declarative way to define collections like Models and easially use them through out a project.  (Something like Models)

This library builds on mongo-models, though it is not a drop in replacement. Significant changes are
1. To build the 'Model' you extend the Collection class
2. All the methods of Mongodb's Collection are available and work as defined by Mongodb
3. The schema of mongo-models is not required but can be implemented. Alternatively you can declare the schema for Mongo to use or skip it entirely.
4. Collections are initialitezed per their declarations after Mongo connects. The can have options at the time they are created, indexes can be defined, and predefined documents can be loaded if the collection is empty

## Usage

```
const {UnoMongo, Collection}=require(uno-mongo);

// In one place as the server starts up
await UnoMongo.connect(uri,options)
uri: if undefined, process.env.MONGODB_URI will be used, or mongodb://localhost:27017

unoMongo.db.collection('articles').insertOne({titie: "This is UnoMongo})
```

## Examples
### The basic use case:
```JS
const { UnoMongo }=require(uno-mongo);

await UnoMongo.connect() // gets URI from $MONOGDB_ENV is not specified

await UnoMongo.db.collection('articles').insertOne({titie: "This is UnoMongo})

```
### Declarative Collections

articles.js:
```JS
const { Collection }=require(uno-mongo);

class Articles extends Collection {
    collectionName="articles"
}

Articles.setCollectionProps() // await may be needed if this runs after the UnoMongo.connect has been called
module.exports=Articles
```

main.js:
```JS
    // somewhere before startup of the server
    await UnoMongo.connect()

```

mycode.js:
```JS
const Articles=require('articles')


async function doSomethingWithArticles(){

    const article=await Articles.findOne({})

}
```