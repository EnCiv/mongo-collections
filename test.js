const {unoMongo, Collection}=require('./index.js')

class User extends Collection {
    name= 'banana'
}
User.setCollectionProps('users')

console.info(User._collectionName, User.connectionName)
let doc=new User
console.info(doc._collectionName, doc.connectionName, doc.name)
console.info(Object.getOwnPropertyNames(Collection.prototype))
console.info(Object.getOwnPropertyNames(User.prototype))
console.info(Object.getOwnPropertyNames(doc))
doc.collection={}
console.info(doc.collectionName)
