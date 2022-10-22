var db = require('../config/connection')
var collection = require('../config/collection')
var objectId = require('mongodb').ObjectId
const bcrypt = require('bcrypt')
const Promise = require('promise')
const { resolve, reject } = require('promise')
const { response } = require('express')

module.exports = {
    doLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            try {
                let response = {}
                let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email })
                if (admin) {
                    bcrypt.compare(adminData.password, admin.password).then((status) => {
                        if (status) {
                            response.status = true
                            response.admin = admin
                            resolve(response)
                            console.log('admin login successful');
                        } else {
                            resolve({ status: false })
                            console.log('admin login failed');
                        }
                    })
                } else {
                    resolve({ status: false })
                    console.log('admin login failed');

                }
            } catch (error) {
                reject(error)
            }
        }
        )
    },
    blockUser: (userID, userDetails) => {
        return new Promise((resolve, reject) => {
            try {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userID) }, {
                $set: {
                    blocked: true
                }
            }).then((response) => {
                resolve(response)
            })
        } catch (error) {
            reject(error)
        }
        })
    },
  
    unblockUser: (userID, userDetails) => {
        return new Promise((resolve, reject) => {
            try {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userID) }, {
                $set: {
                    blocked: false
                }
            }).then((response) => {
                resolve(response)
            })
        } catch (error) {
            reject(error)
        }
        })
    },


    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            try{
            let userDetails = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(userDetails)
        } catch (error) {
            reject(error)
        }
        })
    },
    addCatagory: (cataData) => {
        return new Promise(async (resolve, reject) => {
            try {
            cataData.catagory = cataData.catagory.toUpperCase();
            let catagoryExist = await db.get().collection(collection.CATAGORY_COLLECTION).findOne({ catagory: cataData.catagory })
            if (catagoryExist) {
                resolve({ exist: true })
            } else {
                db.get().collection(collection.CATAGORY_COLLECTION).insertOne(cataData)
                resolve({ exist: false })
            }
        } catch (error) {
            reject(error)
        }
        })
    },
    showCatagory: () => {
        return new Promise(async (resolve, reject) => {
            try {
            let ShowingCatagory = await db.get().collection(collection.CATAGORY_COLLECTION).find().toArray()
            resolve(ShowingCatagory)
        } catch (error) {
            reject(error)
        }
        })
    },
    deleteCatagory: (catName) => {
        return new Promise((resolve, reject) => {
            try{
            db.get().collection(collection.CATAGORY_COLLECTION).deleteOne({ catagory:catName }).then((response) => {
                resolve(response)
            })
        } catch (error) {
            reject(error)
        }
        })
    },

    checkCatagory: (cataName) => {
        return new Promise(async (resolve, reject) => {
            try {
                console.log(cataName,"11111111111111111111111111111111111111111111111111111111");
                let product = await db.get().collection(collection.PRODUCT_COLLECTION).find({ catagory: cataName }).toArray()
                console.log(cataName,"22222222222222222222222222222222");
                resolve(product)
            } catch (error) {
                reject(error)
            }
        })
    }
}