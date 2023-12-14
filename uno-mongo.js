const Mongodb=require('mongodb')

class UnoMongo {
    static clients=[]
    static dbs=[]
    static db
    static client
    static onConnectHandlers=[]
    static ObjectId=Mongodb.ObjectId
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

// for the following - kudos to https://stackoverflow.com/a/30158566/6262595
function prototypeProperties(obj) {
    const p = [];
    for (; obj != null; obj = Object.getPrototypeOf(obj)) {
        const ops = Object.getOwnPropertyNames(obj);
        for(const op of ops)
            if (p.indexOf(op) == -1)
                 p.push(op);
    }
    return p;
}

class Collection {
    static connectionName='default'
    static collectionOptions
    static collectionIndexes
    static ObjectId=Mongodb.ObjectId
    static initialDocs

    static async onConnect(){
        // if there are creatOptions it must be done before db.collection(name) is ever called
        try {
            if(this.collectionOptions){
                const collections = await UnoMongo.dbs[this.connectionName].listCollections({ name: this.collectionName }).toArray()
                if (!(collections && collections.length === 1)){
                    console.info('Collection.onConnect creating collection',this.collectionName)
                    var result = await UnoMongo.dbs[this.connectionName].createCollection(this.collectionName, this.collectionOptions)
                    if (!result) console.error('Collection.onConnect result failed')
                }
            }
        }
        catch  (err){
            console.error('onConnect createCollection error:', err)
            throw err
        }
        // now that the db is open, apply all the properties of the collection to the prototype for this class for they are part of new Collection
        const collection=UnoMongo.dbs[this.connectionName].collection(this.collectionName)
        this.collection=collection

        const keys=prototypeProperties(collection)

        for(const key of keys){
            if(key in this) continue
            Object.defineProperty(this,key,{get() {return collection[key]},enumerable: true, configurable: true})
            // the line below applies the collection methods to the prototype for future use of new Collection() instances
            // but that doesn't seem so useful because you still have to pass the new doc to the method like
            // class User extends Collection
            // const doc=new User(); doc.insertOne(doc).  It would be clearer to says User.insertOne(doc)
            Object.defineProperty(this.prototype,key,{get() {return collection[key]},enumerable: true, configurable: true})
        }
        try {
            if(this.collectionIndexes && this.collectionIndexes.length)
            await this.collection.createIndexes(this.collectionIndexes)
        }
        catch (err) {
            console.error('createIndexes error:', err)
            throw err
        }
        try {
            var count = await this.collection.count()
            if (this.initialDocs && (process.env.NODE_ENV !== 'production' || !count)){
                // if development, or if production but nothing in the database
                await this._write_docs(this.initialDocs)
                delete this.initialDocs
            }
        } catch (err) {
            console.error('Collection.createIndexes error:', err)
            throw err
        }
    }
    static async setCollectionProps(){
        const connectionName=this.connectionName
        if (UnoMongo.dbs[connectionName]) { 
            await this.onConnect()
        }
        else if (UnoMongo.onConnectHandlers[connectionName]) UnoMongo.onConnectHandlers[connectionName].push(this.onConnect.bind(this))
        else UnoMongo.onConnectHandlers[connectionName] = [this.onConnect.bind(this)]
    }
    static async preload(docs) { // this will mutate the docs so that the _id's are ObjectIds
        let idCheck = {}
        // convert object _id's to objects
        docs.forEach(doc => {
            if(doc._id instanceof Mongodb.ObjectId) {
                idCheck[doc._id]=doc
                return // nothing to do here
            }
            if(!doc._id){
                throw new Error("Document doesn't have an id:",doc)
            }
            const _idString=doc._id?.$oid||doc._id
            if(!_idString){
                throw new Error("Document _id field doesn't look like ObjectId",doc)
            }
            if (idCheck[_idString]) {
                throw new Error('_write_load duplicate id found. Replacing:\n', idCheck[_idString], '\nwith\n', doc)
            }
            idCheck[_idString] = doc
            doc._id = new Mongodb.ObjectId(_idString)
        })
        if (this.initialDocs) this.initialDocs = this.initialDocs.concat(docs)
        else if(this.collection){
            await  this._write_docs(docs)
        } else 
            this.initialDocs = docs
    }
    static async _write_docs(docs) {
        for await (const doc of docs) {
            try {
                const result = await this.collection.replaceOne({ _id: doc._id }, doc, { upsert: true })
                if (typeof result !== 'object' || !result.acknowledged || (result.modifiedCount+result.upsertedCount+result.matchedCount)<1 ) {
                    console.error('_write_load result not ok', result, 'for', doc)
                    // don't throw errors here-  keep going
                }
            } catch (err) {
                console.error('_write_load caught error trying to replaceOne for', err, 'doc was', doc)
                // don't through errors here - just keep going
            }
        }
    }
    constructor(doc) {
        if(this.constructor.validate){
            const result = this.constructor.validate(doc) || {value: doc};
            if (result.error) {
                throw result.error;
            }
            Object.assign(this, result.value);
        }else{
            Object.assign(this, doc)
        }
    }
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
