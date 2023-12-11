const Mongodb=require('mongodb')

class UnoMongo {
    static clients=[]
    static dbs=[]
    static db
    static client
    static onConnectHandlers=[]
    static ObjectID=Mongodb.ObjectID
    static async connect(uri = process.env?.MONGODB_URI || 'mongodb://localhost:27017', options={}, connectionName='default'){
        if(UnoMongo.clients[connectionName]){ throw Error('connection by the name',connectionName,'already exists')}
        const client=await Mongodb.MongoClient.connect(uri,options)
        UnoMongo.clients[connectionName]=client
        UnoMongo.dbs[connectionName]=client.db()
        if(connectionName==='default'){
            UnoMongo.client=client
            UnoMongo.db=UnoMongo.dbs[connectionName]
        }
        if (UnoMongo.onConnectHandlers[connectionName]) {
            for await (const handler of UnoMongo.onConnectHandlers[connectionName]) {
                await handler()
            }
        }
        return client.db
    }
    static disconnect(connectionName){
        function disc(name){
            if(UnoMongo.dbs[name]){
                delete UnoMongo.dbs[name]
                UnoMongo.clients[name].close()
                if(name==='default'){
                    UnoMongo.db=undefined
                    UnoMongo.client=undefined
                }
            }
        }
        if(!connectionName)
            Object.keys(UnoMongo.clients).forEach(name=>disc(name))
        else
            disc(connectionName)
    }
}

module.exports.UnoMongo=UnoMongo

function prototypeProperties(obj) {
    var p = [];
    for (; obj != null; obj = Object.getPrototypeOf(obj)) {
        var op = Object.getOwnPropertyNames(obj);
        for (var i=0; i<op.length; i++)
            if (p.indexOf(op[i]) == -1)
                 p.push(op[i]);
    }
    console.info("props",p)
    return p;
}

class Collection {
    static _connectionName='default'
    static _collectionName
    static _createOptions
    static _indexes
    static ObjectID=Mongodb.ObjectID
    static _initialDocs

    static load(objs) {
        if (this._initialDocs) this._initialDocs = this._initialDocs.concat(objs)
        else if (!UnoMongo.dbs[this._connectionName]) this._initialDocs = objs
        else this._write_load(objs)
    }
    static async _write_load(objs) {
        if (process.env?.NODE_ENV !== 'production') {
            let idCheck = {}
            // convert object _id's to objects
            objs.forEach(i => {
                if (idCheck[i._id.$oid]) {
                logger.error('_write_load duplicate id found. Replacing:\n', idCheck[i._id.$oid], '\nwith\n', i)
                }
                idCheck[i._id.$oid] = i
                i._id = UnoMongo.ObjectID(i._id.$oid)
            })
            console.info('_write_load updating for development')
            for await (const doc of objs) {
                try {
                const result = await UnoMongo.dbs[this._connectionName].collection([this._collectionName]).replaceOne({ _id: doc._id }, doc, { upsert: true })
                if (typeof result !== 'object' || result.length !== 1) {
                    console.error('_write_load result not ok', result, 'for', doc)
                    // don't throw errors here-  keep going
                }
                } catch (err) {
                logger.error('_write_load caught error trying to replaceOne for', err, 'doc was', doc)
                // don't through errors here - just keep going
                }
            }
        }
    }
    static async onConnect(){
        // if there are creatOptions it must be done before db.collection(name) is ever called
        try {
            if(this._createOptions){
                const collections = await UnoMongo.dbs[this._connectionName].listCollections({ name: this._collectionName }).toArray()
                if (!(collections && collections.length === 1)){
                    console.info('Collection.onConnect creating collection',this._collectionName)
                    var result = await UnoMongo.dbs[this._connectionName].createCollection(this._collectionName, this._createOptions)
                    if (!result) console.error('Collection.onConnect result failed')
                }
            }
        }
        catch  (err){
            console.error('onConnect createCollection error:', err)
            throw err
        }
        // now that the db is open, apply all the properties of the collection to the prototype for this class for they are part of new Collection
        const collection=UnoMongo.dbs[this._connectionName].collection(this._collectionName)
        this.collection=collection

        const keys=Object.getOwnPropertyNames(Collection.prototype)
        .concat(Object.getOwnPropertyNames(collection)) // this line has to be there or Mongo throws 
        // TypeError: Cannot read properties of undefined (reading 'namespace')

        // this loop, plus the loop blow refering to the same error has to be there or we get
        // TypeError: User.insertOne is not a function
        for(const key of keys){
            if(key!=='constructor')
                Object.defineProperty(this,key,{get() {return this.collection[key]},enumerable: true, configurable: true})
        }
        try {
            if(this._indexes && this._indexes.length)
            await this.collection.createIndexes(this._indexes)
        }
        catch (err) {
            console.error('createIndexes error:', err)
            throw err
        }
        try {
            var count = await this.collection.count()
            console.info('Collection.init count', count)
            if (this._initialDocs && (process.env.NODE_ENV !== 'production' || !count)){
                // if development, or if production but nothing in the database
                await this._write_load(this._initialDocs)
                delete this._initialDocs
            }

        } catch (err) {
            console.error('Collection.createIndexes error:', err)
            throw err
        }
    }
    static setCollectionProps(collectionName,connectionName='default',createOptions,indexes){
        // using 'this' rather than Collection because when Collection is extended 'this' refers to the new class
        this._collectionName=collectionName
        this._connectionName=connectionName
        this._createOptions=createOptions
        this._indexes=indexes
        if (UnoMongo.dbs[connectionName]) this.onConnect()
        else if (UnoMongo.onConnectHandlers[connectionName]) UnoMongo.onConnectHandlers[connectionName].push(this.onConnect.bind(this))
        else UnoMongo.onConnectHandlers[connectionName] = [this.onConnect.bind(this)]
    }
}

// this loop plus the loop above with the same error message has to be there or we get:
// TypeError: User.insertOne is not a function
const keys=Object.getOwnPropertyNames(Mongodb.Collection.prototype)
for(const key of keys){
    if(key!=='constructor')
    Object.defineProperty(Collection.prototype,key,{get() {return this.collection[key]},enumerable: true, configurable: true})
}

/*
Collection.setCollectionProps(
    'docs',
    'default',
    {   capped: true,
        size: publicConfig.MongoLogsCappedSize,
    },
    [
        { key: { path: 1 }, name: 'path', unique: true, partialFilterExpression: { path: { $exists: true } } },
        {
        key: { parentId: 1, 'component.component': 1, _id: -1 },
        name: 'children',
        partialFilterExpression: { parentId: { $exists: true }, 'component.component': { $exists: true } },
        },
    ]
)
*/
module.exports.Collection=Collection
