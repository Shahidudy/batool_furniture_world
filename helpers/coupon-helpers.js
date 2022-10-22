const db = require('../config/connection')
const collection = require('../config/collection')
const bcrypt = require('bcrypt')
let objectid = require('mongodb').ObjectId

module.exports = {
    addCoupon: (coupon, callback) => {
        try {
          db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon).then((data) =>{
            callback(data.insertedId);
            });
        } catch (error) {
          reject(error)
        }
      },

      getCoupon: () => {
        return new Promise(async (resolve, reject) => {
        try {
            let coupon = await db.get().collection(collection.COUPON_COLLECTION).find().toArray();
            resolve(coupon)  
        } catch (error) {
          reject(error)
        }
      })
      },

      viewCoupon: () => {
        return new Promise(async (resolve, reject) => {
        try { 
                let viewCoupon = await db.get().collection(collection.COUPON_COLLECTION).find().toArray();
                resolve(viewCoupon);   
        } catch (error) {       
        }
      })
      },
    

    deleteCoupon: (couponId) => {
        return new Promise((resolve, reject) => {
        try {
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: objectid(couponId) }).then((response) => {
                resolve(response);
              });     
        } catch (error) {
          reject(error)
        }
      });
      },

    getAllCoupon: (coupUSer) => {
        let couponNew = coupUSer.coupon;
        console.log("coupon =",couponNew);
        let userId = coupUSer.userId;
        return new Promise(async (resolve, reject) => {
        try { 
                let couponDetails = await db.get().collection(collection.COUPON_COLLECTION).findOne({ coupon: couponNew }); 
                if (couponDetails) {
                    var d = new Date();
                    let str = d.toJSON().slice(0, 10);
                    if (str > couponDetails.expiry) {
                        resolve({ expirry: true });
                    } else {
                        let users = await db
                            .get()
                            .collection(collection.COUPON_COLLECTION)
                            .findOne({ coupon: couponNew, users: { $in: [objectid(userId)] } });
                        if (users) {
                            resolve({ used: true });
                        } else {
                            resolve(couponDetails);
                        }
                    }
                } else {
                    resolve({ unAvailable: true });
                }      
        } catch (error) {
            reject(error)
        }
    });
       
    },

    addUser:  (orderDetails) => {
        return new Promise((resolve, reject) => {
        try {       
                db.get().collection(collection.COUPON_COLLECTION).updateOne({ coupon: orderDetails.coupon },
                {
                    $push: { user: orderDetails.userId } 
                }).then((response) => {
                    resolve(response)
                })    
        } catch (error) {
            reject(error)
        }
    })     
    }
}
