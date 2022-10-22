var db = require('../config/connection')
var collection = require('../config/collection')
var objectid = require('mongodb').ObjectId
const bcrypt = require('bcrypt')
const Promise = require('promise')
const { resolve, reject } = require('promise')
const { response } = require('express')
const Razorpay = require('razorpay')
var Handlebars = require('handlebars');
Handlebars.registerHelper("inc", function (value, options) {
    return parseInt(value) + 1;
});

var instance = new Razorpay({
    key_id: process.env.RAZOR_ID,
    key_secret: process.env.RAZOR_SECRET,
});



module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                userData.password = await bcrypt.hash(userData.password, 10)
                db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                    resolve(data.insertedId)
                })

            } catch (error) {
                reject(error)
            }
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                var loginStatus = false
                let response = {}
                var user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email, blocked:false})

                if (user) {
                    bcrypt.compare(userData.password, user.password).then((status) => {
                        if (status) {
                            response.user = user
                            response.status = true
                            resolve(response)
                        } else {
                            resolve({ status: false })
                        }
                    })
                } else {
                    resolve({ status: false })
                }
            } catch (error) {
                reject(error)
            }
        })
    },

    verifyUser: (userData) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            try {
                let verify = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
                if (verify) {
                    response.status = false
                    resolve(response)
                } else {
                    response.status = true
                    resolve(response)
                }
            } catch (error) {
                reject(error)
            }
        })
    },


    getUserDetails: (usrID) => {
        return new Promise((resolve, reject) => {
            try {

                db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectid(usrID) }).then((user) => {
                    resolve(user)
                })

            } catch (error) {
                reject(error)
            }

        })
    },

    addToCart: (proId, userId) => {
        let proObj = {
            item: objectid(proId),
            quantity: 1,
        }
        return new Promise(async (resolve, reject) => {
            try {
                let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectid(userId) })
                if (userCart) {
                    let productExist = userCart.products.findIndex(product => product.item == proId)
                    if (productExist != -1) {
                        db.get().collection(collection.CART_COLLECTION)
                            .updateOne({ user: objectid(userId), 'products.item': objectid(proId) },
                                {
                                    $inc: { 'products.$.quantity': 1 }
                                }
                            ).then(() => {
                                resolve()
                            })
                    } else {

                        db.get().collection(collection.CART_COLLECTION).
                            updateOne({ user: objectid(userId) },
                                { $push: { products: proObj } }).then((response) => {
                                    resolve()
                                })
                    }
                } else {
                    let cartObj = {
                        user: objectid(userId),
                        products: [proObj]
                    }
                    db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                        resolve()
                    })
                }
            } catch (error) {
                reject(error)
            }
        })
    },
    getCartProducts: (usrID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: objectid(usrID) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    }, {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    }
                ]).toArray()
                console.log(cartItems);
                resolve(cartItems)
            } catch (error) {
                reject(error)
            }
        })
    },
    getCartCount: (usrID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = 0
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectid(usrID) })
                if (cart) {
                    count = cart.products.length
                }
                resolve(count)
            } catch (error) {
                reject(error)
            }
        })
    },

    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            try {
                if (details.count == -1 && details.quantity == 1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ _id: objectid(details.cart) },
                            {
                                $pull: { products: { item: objectid(details.product) } }
                            }
                        ).then((response) => {
                            resolve({ removeProduct: true })
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ _id: objectid(details.cart), 'products.item': objectid(details.product) },
                            {
                                $inc: { 'products.$.quantity': details.count }
                            }
                        ).then((response) => {
                            resolve({ status: true })
                        })
                }
            } catch (error) {
                reject(error)
            }
        })
    },
    getTotalAmount: (usrID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: objectid(usrID) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    }, {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }
                        }
                    }
                ]).toArray()
                if (total.length == 0) {
                    resolve(total)
                } else {
                    resolve(total[0].total)
                }
            } catch (error) {
                reject(error)
            }
        })
    },

    deleteCart: (cartId, proId) => {
        return new Promise((resolve, reject) => {
            try {

                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectid(cartId) },
                    {
                        $pull: { products: { item: objectid(proId) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })

            } catch (error) {
                reject(error)
            }
        })
    },

    addToWish: (proId, usrID) => {
        let prodObj = {
            item: objectid(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            try {
                let userWish = await db.get().collection(collection.WISH_COLLECTION).findOne({ user: objectid(usrID) })
                if (userWish) {
                    let proExist = userWish.products.findIndex(products => products.item == proId)
                    if (proExist != -1) {
                        db.get().collection(collection.WISH_COLLECTION)
                            .updateOne({
                                user: objectid(usrID),
                                'products.item': objectid(proId)
                            }
                                , {
                                    $inc: { 'products.$.quantity': 1 }
                                }
                            )
                    } else {
                        db.get().collection(collection.WISH_COLLECTION).updateOne({ user: objectid(usrID) }, {
                            $push: { products: prodObj }
                        })
                            .then((response) => {
                                resolve(response)
                            })
                    }
                }
                else {
                    let wishObj = {
                        user: objectid(usrID),
                        products: [prodObj]
                    }
                    await db.get().collection(collection.WISH_COLLECTION).insertOne(wishObj).then((response) => {
                        resolve(response)
                    })
                }
            } catch (error) {
                reject(error)
            }
        })

    },

    getWishProduct: (usrID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let wishItems = await db.get().collection(collection.WISH_COLLECTION).aggregate([
                    {
                        $match: { user: objectid(usrID) }
                    },
                    {
                        $unwind: '$products'
                    }, {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'products'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, products: { $arrayElemAt: ['$products', 0] }
                        }
                    }
                ]).toArray()
                resolve(wishItems)
            } catch (error) {
                reject(error)
            }
        })
    },


    getWishCount: (usrID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = 0
                let wish = await db.get().collection(collection.WISH_COLLECTION).findOne({ user: objectid(usrID) })
                if (wish) {
                    count = wish.products.length
                }
                resolve(count)
            } catch (error) {
                reject(error)
            }
        })
    },

    deleteWish: (wishId, proId) => {
        return new Promise((resolve, reject) => {
            try {

                db.get().collection(collection.WISH_COLLECTION).updateOne({ _id: objectid(wishId) },
                    {
                        $pull: { products: { item: objectid(proId) } }
                    }
                ).then((response) => {
                    resolve({ deleteProduct: true })
                })

            } catch (error) {
                reject(error)
            }
        })
    },

    getCartProductList: (usrID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectid(usrID) })
                resolve(cart.products)
            } catch (error) {
                reject(error)
            }
        })
    },

    placeOrder: (order, products, total, userId,discount,Couponname) => {
        let GrandTotal = total
        if(Couponname){
            GrandTotal = total - discount
          
        }
      
        return new Promise(async(resolve, reject) => {
            try {
                let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
                let orderObj = {
                    deliveryDetails: {
                        name: order.name,
                        mobile: order.mobile,
                        address: order.address,
                        email: order.email,
                        district: order.district,
                        pincode: order.pincode,
                        state: order.state,
                        town: order.town
                    },
                    usrID: objectid(userId),
                    paymentMethod: order['payment-method'],
                    products: products,
                    totalAmount: total,
                    Discount : discount,
                    GrandTotal :GrandTotal,
                    // grandTotal: order['grandtotal'],
                    // coupon: order['Couponname'],
                    couponDiscount: discount,
                    // couponDiscount: order['Discount'],
                    status: status,
                    date: new Date().toDateString()
                }
                let users = [objectid(userId)]
                await db.get().collection(collection.COUPON_COLLECTION).updateOne({coupon : Couponname}, {$set : {users}})
               await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                    db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectid(userId) })
                    resolve(response.insertedId)
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    generateRazorPay: (orderID, total) => {
        return new Promise((resolve, reject) => {
            try {
                var options = {
                    amount: total * 100,
                    currency: "INR",
                    receipt: "" + orderID
                }
                instance.orders.create(options, function (err, order) {
                    if (err) {
                    } else {
                        resolve(order);
                    }
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            try {
                const crypto = require("crypto");
                let hmac = crypto.createHmac('sha256', 'KXxvi5DrRuqvkc0vVtQWKUC4')
                hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
                hmac = hmac.digest('hex')
                if (hmac == details['payment[razorpay_signature]']) {
                    resolve()

                } else {
                    reject()
                }
            } catch (error) {
                reject(error)
            }
        })
    },

    changePaymentStatus: (orderID) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectid(orderID) },
                    {
                        $set: {
                            status: 'placed'
                        }
                    }
                ).then(() => {
                    resolve()
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    getUserOrders: (id) => {
        let userId = '' + id
        return new Promise(async (resolve, reject) => {
            try {
                let orders = await db.get().collection(collection.ORDER_COLLECTION).find({
                    usrID: objectid(userId)
                }).toArray()
                console.log(orders);
                resolve(orders)
            } catch (error) {
                reject(error)
            }
        })
    },


    getOrderProduct: (orderID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate(
                    [
                        {
                            '$match': {
                                '_id': new objectid(orderID)
                            }
                        }, {
                            '$unwind': {
                                'path': '$products'
                            }
                        }, {
                            '$lookup': {
                                'from': 'product',
                                'localField': 'products.item',
                                'foreignField': '_id',
                                'as': 'result'
                            }
                        }, {
                            '$unwind': {
                                'path': '$result'
                            }
                        }, {
                            '$project': {
                                'products': 1,
                                'result': 1,
                                'date': 1,
                                'total': 1,
                                'paymentMethod': 1,
                                'status': 1
                            }
                        }
                    ]
                ).toArray()
                resolve(orderItems)
            } catch (error) {
                reject(error)
            }
        })
    },

    value: (orderId) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            try {
                let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectid(orderId) })
                if (order) {
                    if (order.value) {
                        response.status = true
                        response.id = order._id
                        resolve(response)
                    } else {
                        if (order.cancel) {
                        } else {
                            response.status = false
                            response.id = order._id
                            resolve(response)
                        }
                    }
                } else {
                    response.status = false
                    response.id = order._id
                    resolve(response)
                }
            } catch (error) {
                reject(error)
            }
        })
    },

    profileDetails: (addressData, usrID) => {
        create_random_id(15)
        function create_random_id(string_Length) {
            var randomString = ''
            var numbers = '1234567890'
            for (var i = 0; i < string_Length; i++) {
                randomString += numbers.charAt(Math.floor(Math.random() * numbers.length))
            }
            addressData._addId = "ADD" + randomString
        }
        let subAddress = {
            _addId: addressData._addId,
            name: addressData.name,
            email: addressData.email,
            mobile: addressData.mobile,
            address: addressData.address,

            town: addressData.town,
            district: addressData.district,
            pincode: addressData.pincode,

            state: addressData.state
        }
        return new Promise(async (resolve, reject) => {
            try {
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectid(usrID) })
                if (user.Addresses) {
                    if (user.Addresses.length < 4) {
                        db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectid(usrID) }, {
                            $push: { Addresses: subAddress }
                        }).then(() => {
                            resolve()
                        })
                    } else {
                        resolve({ full: true })
                    }
                } else {
                    Addresses = [subAddress]
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectid(usrID) }, { $set: { Addresses } }).then(() => {
                        resolve()
                    })
                }
            } catch (error) {
                reject(error)
            }
        })
    },

    userAddress: (usrID) => {
        return new Promise((resolve, reject) => {
            try {

                let address = db.get().collection(collection.USER_COLLECTION).aggregate([
                    {
                        $match: { _id: objectid(usrID) }
                    },
                    {
                        $unwind: '$Addresses'
                    },
                    {
                        $project: {
                            id: '$Addresses._addId',
                            name: '$Addresses.name',
                            email: '$Addresses.email',
                            mobile: '$Addresses.mobile',
                            address: '$Addresses.address',
                            town: '$Addresses.town',
                            pincode: '$Addresses.pincode',
                            district: '$Addresses.district',
                            state: '$Addresses.state',
                        }
                    }
                ]).toArray()
                resolve(address)
            } catch (error) {
                reject(error)
            }
        })
    },

    placeAddress: (addressId, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let address = await db.get().collection(collection.USER_COLLECTION).aggregate([
                    {
                        $match: { _id: objectid(userId) }
                    },
                    {
                        $unwind: '$Addresses'
                    },
                    {
                        $match: { 'Addresses._addId': addressId }
                    },
                    {
                        $project: {
                            id: '$Addresses._addId',
                            name: '$Addresses.name',
                            email: '$Addresses.email',
                            mobile: '$Addresses.mobile',
                            address: '$Addresses.address',
                            town: '$Addresses.town',
                            pincode: '$Addresses.pincode',
                            district: '$Addresses.district',
                            state: '$Addresses.state',
                        }
                    }
                ]).toArray()
                resolve(address[0])
                console.log(address[0]);
            } catch (error) {
                reject(error)
            }
        })
    },

    getPersonalDetails: (usrID) => {
        return new Promise((resolve, reject) => {
            try {
                userSignupDetails = db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectid(usrID) })
                resolve(userSignupDetails)
            } catch (error) {
                reject(error)
            }
        })
    },

    updateName: (userName, usrID) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectid(usrID) }, { $set: { name: userName.name } }).then(() => {
                    resolve()
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    deleteAddress: (addressId, userId) => {
        return new Promise((resolve, reject) => {
            try {

                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectid(userId) },
                    {
                        $pull: { Addresses: { _addId: addressId } }
                    }
                ).then((response) => {
                    resolve(response);
                })


            } catch (error) {
                reject(error)
            }
        })

    },

    updateAddress: (address, addressId, usrID) => {
        return new Promise(async (resolve, reject) => {
            try {
                let user = await db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectid(usrID), "Addresses._addId": addressId },
                    {
                        $set: {
                            "Addresses.$.name": address.name,
                            "Addresses.$.email": address.email,
                            "Addresses.$.mobile": address.mobile,
                            "Addresses.$.address": address.address,
                            "Addresses.$.town": address.town,
                            "Addresses.$.district": address.district,
                            "Addresses.$.state": address.state,
                            "Addresses.$.pincode": address.pincode
                        }
                    }
                ).then((response) => {
                    resolve(response)
                })

            } catch (error) {
                reject(error)
            }
        })
    },

    updateUserPassword: (usrID, userPassword) => {
        return new Promise(async (resolve, reject) => {
            try {
                userPassword.password = await bcrypt.hash(userPassword.password, 10)

                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectid(usrID) }, { $set: { password: userPassword.password } }).then((data) => {
                    resolve(data)
                })
            } catch (error) {
                reject(error)
            }
        })
    },

    changeStatusCancelled: (orderId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let changeOrderStatus = await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectid(orderId) }, { $set: { status: 'Cancelled', value: false } })
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },

    adminOrders: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let adminorderlist = db.get().collection(collection.ORDER_COLLECTION).find().toArray()
                resolve(adminorderlist)

            } catch (error) {
                reject(error)
            }
        })
    },

    btnChange: (orderId) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            try {
                let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectid(orderId) })
                if (order) {
                    if (order.shipped) {
                        response.id = orderId
                        response.status = true
                        response.pack = false
                        resolve(response)
                    } else if (order.delivered) {
                        response.id = orderId
                        response.status = false
                        resolve(response)
                    } else {
                        response.pack = true
                        response.status = false
                        response.id = orderId
                        resolve(response)
                    }
                }
            } catch (error) {
                reject(error)
            }
        })
    },

    changeStatus: (orderId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let changeOrderStatus = await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectid(orderId) }, { $set: { status: 'packed', value: false, shipped: true, delivered: false } })
                resolve()
            } catch (error) {
                reject(error)
            }
        })

    },

    changeStatusShipped: (orderId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let changeOrderStatus = await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectid(orderId) }, { $set: { status: 'Shipped', value: false, shipped: false, delivered: true } })
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },

    changeStatusDelivered: (orderId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let changeOrderStatus = await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectid(orderId) }, { $set: { status: 'Delivered', value: true, shipped: false, delivered: true } })
                resolve()
            } catch (error) {
                reject(error)
            }
        })
    },

    getUserCount: (req, res) => {
        return new Promise(async (resolve, reject) => {
            try {
                let user = await db.get().collection(collection.USER_COLLECTION).find().count()
                resolve(user)
            } catch (error) {
                reject(error)
            }
        })
    },

    getOrderCount: (req, res) => {
        return new Promise(async (resolve, reject) => {
            try {
                let user = await db.get().collection(collection.ORDER_COLLECTION).find().count()
                resolve(user)
            } catch (error) {
                reject(error)
            }
        })
    },

    totalCOD: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(collection.ORDER_COLLECTION).find({ paymentMethod: "COD", }).count()
                resolve(count)
            } catch (error) {
                reject(error)
            }
        })
    },

    totalDelivered: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let totalDeliveredCount = await db.get().collection(collection.ORDER_COLLECTION).find({ status: "Delivered" }).count()
                resolve(totalDeliveredCount)
            } catch (error) {
                reject(error)
            }
        })
    },

    cancelled: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let cancelled = await db.get().collection(collection.ORDER_COLLECTION).find({ status: "Cancelled" }).count()
                resolve(cancelled)
            } catch (error) {
                reject(error)
            }
        })
    },

    totalMonthAmount: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let amount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {
                        $setWindowFields: {
                            output: {
                                Tamount: {
                                    $sum: "$total",
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            Tamount: 1
                        }
                    }
                ]).toArray()
                resolve(amount[0])
            } catch (error) {
                reject(error)
            }
        })
    },

    totalONLINE: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let onlineCount = await db.get().collection(collection.ORDER_COLLECTION).find({ paymentMethod: "ONLINE", }).count()
                resolve(onlineCount)
            } catch (error) {
                reject(error)
            }
        })
    },
    


}

