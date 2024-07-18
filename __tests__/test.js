const { Mongo, Collection } = require('../mongo-collections.js')

class User extends Collection {
    static connectionName = 'default'
    static collectionName = 'users'
    static collectionOptions
    static collectionIndexes
    static validate(doc) {
        if (doc?.name?.length > 0) return { value: doc }
        else return { error: 'doc?.name?.length>0 fails' }
    }
}
User.setCollectionProps()

beforeAll(async () => {
    await Mongo.connect(global.__MONGO_URI__, { useUnifiedTopology: true })
})

test('User Class should be setup', () => {
    expect(User.collectionName).toEqual('users')
    expect(User.connectionName).toEqual('default')
})

test('User collection can insert a doc', async () => {
    await User.insertOne({ name: 'Bob' })
    const got = await User.findOne({ name: 'Bob' })
    expect(got.name).toEqual('Bob')
})

test('collection can chain operations', async () => {
    const got = await User.find({ name: 'Bob' }).toArray()
    expect(got.length).toEqual(1)
    expect(got[0].name).toEqual('Bob')
})

test('can initialize with data in new, and validate', async () => {
    const doc = new User({ name: 'Charles' })
    expect(doc.name).toEqual('Charles')
    expect(doc.collectionName).toEqual(undefined) // static does not show up in the new doc
    expect(doc.connectionName).toEqual(undefined) // static does not show up in the new doc
    const doc1 = new User({ name: 'Dick', extra: 'prop' })
    expect(doc1.extra).toEqual('prop')
})

test('invalidation can throw an error', () => {
    expect(() => {
        new User({ extra: 'no name' })
    }).toThrow('doc?.name?.length>0 fails')
})

test('can access mongodb collection methods from new doc like in mongo-models, but saying User.insertOne is more informative', async () => {
    const doc = new User({ name: 'Fran' })
    await doc.insertOne(doc)
    const got = await doc.findOne({ name: 'Fran' })
    expect(got.name).toEqual('Fran')
})

test('can access ObjectId prop', () => {
    expect(new User.ObjectId().toString().length).toEqual(24)
})

test('can create a collection after connect', async () => {
    class Articles extends Collection {
        static collectionName = 'articles'
    }
    await Articles.setCollectionProps()
    await Articles.insertOne({ subject: 'The meaning of life' })
    const doc = await Articles.findOne({ subject: { $exists: true } })
    expect(doc.subject).toEqual('The meaning of life')
})

test('can load inital doc to a collection', async () => {
    class Fruit extends Collection {
        static collectionName = 'fruits'
    }
    await Fruit.preload([
        { _id: '657a09190323255560f77c3e', type: 'banana' },
        { _id: { $oid: '657a09190323255560f77c3f' }, type: 'apple' },
        { _id: new Mongo.ObjectId('657a09190323255560f77c40'), type: 'pear' },
    ])
    await Fruit.setCollectionProps()
    const got = await Fruit.find({}).toArray()
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

test('can create collections with indexes', async () => {
    class Items extends Collection {
        static collectionName = 'items'
        static collectionIndexes = [
            { key: { path: 1 }, name: 'path', unique: true, partialFilterExpression: { path: { $exists: true } } },
            {
                key: { parentId: 1, 'component.component': 1, _id: -1 },
                name: 'children',
                partialFilterExpression: { parentId: { $exists: true }, 'component.component': { $exists: true } },
            },
        ]
    }
    await Items.setCollectionProps()
    const indexes = await Items.indexes()
    expect(indexes).toMatchInlineSnapshot(`
[
  {
    "key": {
      "_id": 1,
    },
    "name": "_id_",
    "v": 2,
  },
  {
    "key": {
      "path": 1,
    },
    "name": "path",
    "partialFilterExpression": {
      "path": {
        "$exists": true,
      },
    },
    "unique": true,
    "v": 2,
  },
  {
    "key": {
      "_id": -1,
      "component.component": 1,
      "parentId": 1,
    },
    "name": "children",
    "partialFilterExpression": {
      "component.component": {
        "$exists": true,
      },
      "parentId": {
        "$exists": true,
      },
    },
    "v": 2,
  },
]
`)
})

test('can create a collection with a schema', async () => {
    class Students extends Collection {
        static collectionName = 'students'
        static collectionOptions = {
            validator: {
                $jsonSchema: {
                    bsonType: 'object',
                    title: 'Student Object Validation',
                    required: ['address', 'major', 'name', 'year'],
                    properties: {
                        name: {
                            bsonType: 'string',
                            description: "'name' must be a string and is required",
                        },
                        year: {
                            bsonType: 'int',
                            minimum: 2017,
                            maximum: 3017,
                            description: "'year' must be an integer in [ 2017, 3017 ] and is required",
                        },
                        gpa: {
                            bsonType: 'int',
                            description: "'gpa' must be a double if the field exists",
                        },
                    },
                },
            },
        }
    }
    await Students.setCollectionProps()
    await new Promise((ok, ko) => {
        expect(async () => {
            await Students.insertOne({
                name: 'Alice',
                year: 2019,
                major: 'History',
                gpa: 3,
                address: {
                    city: 'NYC',
                    street: '33rd Street',
                },
            })
        }).toThrow(ok())
    })
    const got = await Students.insertOne({
        name: 'Alice',
        year: 2019,
        major: 'History',
        gpa: 3,
        address: {
            city: 'NYC',
            street: '33rd Street',
        },
    })
    expect(got.acknowledged).toEqual(true)
})

afterAll(() => {
    Mongo.disconnect()
})
