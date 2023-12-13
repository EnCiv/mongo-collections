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
    expect(doc.collectionName).toEqual(undefined)
    expect(doc.connectionName).toEqual(undefined)
    const doc1=new User({name: 'Dick', extra: 'prop'})
    expect(doc1.extra).toEqual('prop')
})

test('invalidation can throw an error',()=>{
    expect(()=>{new User({extra: 'no name'})}).toThrow("doc?.name?.length>0 fails")
})

test('can create a collection after connect', async()=>{
    class Articles extends Collection {
        static collectionName='articles'
    }
    Articles.setCollectionProps()
    await Articles.insertOne({subject: "The meaning of life"})
    const doc=await Articles.findOne({subject: {"$exists": true}})
    expect(doc.subject).toEqual("The meaning of life")
})

afterAll(()=>{
    UnoMongo.disconnect()
})