const {UnoMongo, Collection}=require('../uno-mongo.js')

class User extends Collection {
    name= 'banana'
}
User.setCollectionProps('users')

beforeAll(async () => {
    await UnoMongo.connect(global.__MONGO_URI__, { useUnifiedTopology: true })
})

test('User Class should be setup',()=>{
    expect(User._collectionName).toEqual('users')
    expect(User._connectionName).toEqual('default')
})

test('User can create a doc', async ()=>{
    await User.insertOne({name: 'Bob'})
    const got=await User.findOne({name: 'Bob'})
    expect(got.name).toEqual('Bob')
})

afterAll(()=>{
    UnoMongo.disconnect()
})