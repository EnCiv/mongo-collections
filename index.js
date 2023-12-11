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
        UnoMongo.dbs[connectionName]=client.db
        if(connectionName==='default'){
            UnoMongo.client=client
            UnoMongo.db=client.db
        }
        if (UnoMongo.onConnectHandlers[connectionName]) {
            for await (const handler of UnoMongo.onConnectHandlers[connectionName]) {
                await handler()
            }
        }
        return client.db
    }    
}

module.exports.UnoMongo=UnoMongo

class Collection {
    static connectionName='default'
    static _collectionName
    static createOptions
    static _indexes
    static ObjectID=Mongodb.ObjectID
    static _initialDocs

    static load(objs) {
        if (this._initialDocs) this._initialDocs = this._initialDocs.concat(objs)
        else if (!UnoMongo.dbs[this.connectionName]) this._initialDocs = objs
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
                const result = await UnoMongo.dbs.collection([this._collectionName]).replaceOne({ _id: doc._id }, doc, { upsert: true })
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
            if(this.createOptions){
                const collections = await UnoMongo.dbs[this.connectionName].listCollections({ name: this._collectionName }).toArray()
                if (!(collections && collections.length === 1)){
                    console.info('Collection.onConnect creating collection',this._collectionName)
                    var result = await UnoMongo.dbs[this.connectionName].createCollection(this._collectionName, this.createOptions)
                    if (!result) console.error('Collection.onConnect result failed')
                }
            }
        }
        catch  (err){
            console.error('onConnect createCollection error:', err)
            throw err
        }
        // now that the db is open, apply all the properties of the collection to the prototype for this class for they are part of new Collection
        this.collection=UnoMongo[this.connectionName].collection(this._collectionName)
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
            if (!(this._initialDocs && (process.env.NODE_ENV !== 'production' || !count))) return ok()
            // if development, or if production but nothing in the database
            await this._write_load(this._initialDocs)
            delete this._initialDocs

        } catch (err) {
            console.error('Collection.createIndexes error:', err)
            throw err
        }
    }
    static setCollectionProps(collectionName,connectionName='default',createOptions,indexes){
        // using 'this' rather than Collection because when Collection is extended 'this' refers to the new class
        this._collectionName=collectionName
        this.connectionName=connectionName
        this.createOptions=createOptions
        this._indexes=indexes
        if (UnoMongo.dbs[connectionName]) this.onConnect()
        else if (UnoMongo.onConnectHandlers[connectionName]) UnoMongo.onConnectHandlers[connectionName].push(this.onConnect)
        else UnoMongo.onConnectHandlers[connectionName] = [this.onConnect]
    }
/*
    get dbName(){return this.collection.dbName}
    get collectionName(){return this.collection.collectionName}
    get namespace(){return this.collection.namespace}
    get fullNamespace(){return this.collection.fullNamespace}
    get readConcern(){return this.collection.readConcern}
    get readPreference(){return this.collection.readPreference}
    get bsonOptions(){return this.collection.bsonOptions}
    get writeConcern(){return this.collection.writeConcern}
    get hint(){return this.collection.hint}
    get insertOne(){return this.collection.insertOne}
    get insertMany(){return this.collection.insertMany}
    get bulkWrite(){return this.collection.bulkWrite}
    get updateOne(){return this.collection.updateOne}
    get replaceOne(){return this.collection.replaceOne}
    get updateMany(){return this.collection.updateMany}
    get deleteOne(){return this.collection.deleteOne}
    get deleteMany(){return this.collection.deleteMany}
    get rename(){return this.collection.rename}
    get drop(){return this.collection.drop}
    get findOne(){return this.collection.findOne}
    get find(){return this.collection.find}
    get options(){return this.collection.options}
    get isCapped(){return this.collection.isCapped}
    get createIndex(){return this.collection.createIndex}
    get createIndexes(){return this.collection.createIndexes}
    get dropIndex(){return this.collection.dropIndex}
    get dropIndexes(){return this.collection.dropIndexes}
    get listIndexes(){return this.collection.listIndexes}
    get indexExists(){return this.collection.indexExists}
    get indexInformation(){return this.collection.indexInformation}
    get estimatedDocumentCount(){return this.collection.estimatedDocumentCount}
    get countDocuments(){return this.collection.countDocuments}
    get distinct(){return this.collection.distinct}
    get indexes(){return this.collection.indexes}
    get findOneAndDelete(){return this.collection.findOneAndDelete}
    get findOneAndReplace(){return this.collection.findOneAndReplace}
    get findOneAndUpdate(){return this.collection.findOneAndUpdate}
    get aggregate(){return this.collection.aggregate}
    get watch(){return this.collection.watch}
    get initializeUnorderedBulkOp(){return this.collection.initializeUnorderedBulkOp}
    get initializeOrderedBulkOp(){return this.collection.initializeOrderedBulkOp}
    get count(){return this.collection.count}
    get listSearchIndexes(){return this.collection.listSearchIndexes}
    get createSearchIndex(){return this.collection.createSearchIndex}
    get createSearchIndexes(){return this.collection.createSearchIndexes}
    get dropSearchIndex(){return this.collection.dropSearchIndex}
    get updateSearchIndex(){return this.collection.updateSearchIndex}
    */
}

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
