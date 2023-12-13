const {UnoMongo, Collection}=require('../uno-mongo.js')

class User extends Collection {
    static collectionName='users'
    static connectionName='default'
    static collectionOptions
    static collectionIndexes
    static validate(doc){
        if(doc?.name?.length > 0) return {value: doc}
        else return {error: 'doc?.name?.length>0 fails'}
    }
}
User.setCollectionProps()

beforeAll(async () => {
    await UnoMongo.connect(global.__MONGO_URI__, { useUnifiedTopology: true })
})

test('User Class should be setup',()=>{
    expect(User.collectionName).toEqual('users')
    expect(User.connectionName).toEqual('default')
})

test('User collection can insert a doc', async ()=>{
    await User.insertOne({name: 'Bob'})
    const got=await User.findOne({name: 'Bob'})
    expect(got.name).toEqual('Bob')
})

test('collection can chain operations', async ()=>{
    const got=await User.find({name: 'Bob'}).toArray()
    expect(got.length).toEqual(1)
    expect(got[0].name).toEqual('Bob')
})

test('can initialize with data in new, and validate', async ()=>{
    const doc=new User({name: 'Charles'})
    expect(doc.name).toEqual('Charles')
    expect(doc.collectionName).toEqual(undefined) // static does not show up in the new doc
    expect(doc.connectionName).toEqual(undefined) // static does not show up in the new doc
    const doc1=new User({name: 'Dick', extra: 'prop'})
    expect(doc1.extra).toEqual('prop')
})

test('invalidation can throw an error',()=>{
    expect(()=>{new User({extra: 'no name'})}).toThrow("doc?.name?.length>0 fails")
})

test('can access mongodb collection methods from new doc like in mongo-models, but saying User.insertOne is more informative', async ()=>{
    const doc=new User({name: 'Fran'})
    await doc.insertOne(doc)
    const got=await doc.findOne({name: "Fran"})
    expect(got.name).toEqual('Fran')
})

test('can create a collection after connect', async()=>{
    class Articles extends Collection {
        static collectionName='articles'
    }
    await Articles.setCollectionProps()
    await Articles.insertOne({subject: "The meaning of life"})
    const doc=await Articles.findOne({subject: {"$exists": true}})
    expect(doc.subject).toEqual("The meaning of life")
})

test('can load inital doc to a collection',async()=>{
    class Fruit extends Collection {
        static collectionName='fruits'
    }
    await Fruit.preload([
        {  _id: '657a09190323255560f77c3e',
          type: 'banana'
        },
        {  _id: {$oid: '657a09190323255560f77c3f'},
        type: 'apple'
      },
      {  _id: new UnoMongo.ObjectId('657a09190323255560f77c40'),
        type: 'pear'
    },
    ])
    await Fruit.setCollectionProps()
    const got=await Fruit.find({}).toArray()
    expect(got).toMatchInlineSnapshot(`
[
  {
    "_id": "657a09190323255560f77c3e",
    "type": "banana",
  },
  {
    "_id": "657a09190323255560f77c3f",
    "type": "apple",
  },
  {
    "_id": "657a09190323255560f77c40",
    "type": "pear",
  },
]
`)
})

afterAll(()=>{
    UnoMongo.disconnect()
})