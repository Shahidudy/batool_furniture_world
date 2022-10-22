var db = require('../config/connection')
var collection = require('../config/collection')
var objectId = require('mongodb').ObjectId
const Promise = require('promise')
const { resolve, reject } = require('promise')
const { response } = require('express')

module.exports = {
    addProduct: async (product, callback) => {
        try {
            product.delete=false
            let catagory = await db.get().collection(collection.CATAGORY_COLLECTION).find().toArray()
            db.get().collection('product').insertOne(product).then((data) => {
                callback(data.insertedId, catagory)
            })
        } catch (error) {
            reject(error)
        }
    },

    catagoryProducts: (data) => {
        return new Promise(async (resolve, reject) => {
            try {
                let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ catagory: data, delete:false }).toArray()
                resolve(products)
            } catch (error) {
                reject(error)
            }
        })
    },

    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const products = await db.get().collection(collection.PRODUCT_COLLECTION).find({delete:false}).toArray()
                resolve(products)
            } catch (error) {
                reject(error)
            }
        })
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) },
                {
                    $set: {
                        delete:true
                    }
                }
                
                )
                .then((response) => {
                    resolve(response)
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    getProductData: (productid) => {
        return new Promise(async (resolve, reject) => {
            try {
                await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(productid) }).then((productdata) => {
                    resolve(productdata)
                })
            } catch (error) {
                reject(error)
            }
        })
    },



    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                        $set: {
                            product: proDetails.product,
                            catagory: proDetails.catagory,
                            description: proDetails.description,
                            price: proDetails.price
                        }
                    }).then((response) => {
                        resolve()
                    })
            } catch (error) {
                reject(error)
            }
        })
    },
    catProMatch: (catId) => {
        return new Promise((resolve, reject) => {
            try {
                let product = db.get().collection(collection.PRODUCT_COLLECTION).find({ catagory: catId }).toArray()
                resolve(product)
            } catch (error) {
                reject(error)
            }
        })
    }
}