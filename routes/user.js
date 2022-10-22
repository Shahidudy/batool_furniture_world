const { response } = require('express');
const express = require('express');
const { Logger, Db } = require('mongodb');
const router = express.Router();
const userHelpers = require('../helpers/user-helpers')
const db = require('../config/connection')
const collection = require('../config/collection');
const productHelpers = require('../helpers/product-helpers');
const adminHelpers = require('../helpers/admin-helpers');
const twilioHelpers = require('../helpers/twilioHelpers')
const couponHelpers = require('../helpers/coupon-helpers');
const { showCatagory } = require('../helpers/admin-helpers');

//verify login with session
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/')
  }
}


/* GET home page. */
router.get("/", async function (req, res, next) {
  try {
    let cartCount = null
    let wishCount = null
    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
      wishCount = await userHelpers.getWishCount(req.session.user._id);
    }
    let allProducts = await productHelpers.getAllProducts()
    let catProducts = await productHelpers.catagoryProducts()
    let showCatagory = await adminHelpers.showCatagory()
    adminHelpers.showCatagory().then((products) => {
      user = req.session.user;
      res.render("user/home", { users: true, cartCount, wishCount, user, catProducts, products, showCatagory, allProducts });
    })
  } catch (error) {
    next(error);
  }
});


router.get("/signup", (req, res, next) => {
  try {
    res.render("user/signup");
  } catch (error) {
    next(error);
  }
});


router.post("/signup", (req, res, next) => {
  try {
    userHelpers.verifyUser(req.body).then((response) => {
      if (response.status) {
        req.session.body = req.body
        twilioHelpers.doSms(req.body).then((data) => {
          req.session.body = req.body;
          if (data) {
            res.render("user/otp");
          } else {
            res.redirect("/signup");
          }
        })
      } else {
        res.redirect("/signup");
      }
    })
  } catch (error) {
    next(error);
  }
});

router.post("/otp", (req, res, next) => {
  try{
  twilioHelpers.otpVerify(req.body, req.session.body).then((response) => {
    userHelpers.doSignup(req.session.body).then((response) => {
      res.redirect("/login");
    });
  });
} catch (error) {
  next(error);
}
});


router.get("/login", (req, res, next) => {
  try{
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login", { loginErr: req.session.loginErr });
    req.session.loginErr = false
  }
} catch (error) {
  next(error);
}
});

router.post('/login', (req, res, next) => {
  try {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true
      req.session.user = response.user
      res.redirect('/')
    } else {
      req.session.loginErr = true
      res.redirect('/login')
    }
  })
} catch (error) {
  next(error);
}
})

router.get('/catagory',verifyLogin, async (req, res, next) => {
  try {
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  wishCount = await userHelpers.getWishCount(req.session.user._id);
  
  let catagory = req.query.catagory
  let user = req.session.user
  let showCatagory = await adminHelpers.showCatagory()
  let catProducts = await productHelpers.catagoryProducts(catagory)
  res.render('user/catagory', { catProducts, users: true, user, showCatagory,cartCount,wishCount })
} catch (error) {
  next(error);
}
})

router.get("/single-product/:id",verifyLogin, async (req, res, next) => {
  try {
    let cartCount = null;
    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }
    user = req.session.user
    let wishCount = null;
    if (req.session.user) {
      wishCount = await userHelpers.getWishCount(req.session.user._id);
    }
    let showCatagory=adminHelpers.showCatagory()
    productHelpers.getProductData(req.params.id).then((product) => {
      res.render("user/single-product", { users: true, product, cartCount, user, wishCount, showCatagory });
    });
  } catch (error) {
    next(error);
  }
});


router.get("/cart", verifyLogin, async (req, res, next) => {
  try {
    let products = await userHelpers.getCartProducts(req.session.user._id);

    let showCatagory = await adminHelpers.showCatagory()
    let total = null
    if (products.length > 0) {
      total = await userHelpers.getTotalAmount(req.session.user._id);
    }
    let cartCount = null;
    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }
    let wishCount = null;
    if (req.session.user) {
      wishCount = await userHelpers.getWishCount(req.session.user._id);
    }
    user = req.session.user;
    res.render("user/cart", { users: true, products, user, total, cartCount, wishCount, showCatagory });
  } catch (error) {
    next(error);
  }
});


router.get("/add-to-cart/:id", verifyLogin, (req, res, next) => {
  try {
    userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true });
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/delete-cart/:cartId/:proId", (req, res, next) => {
  try {
    cartId = req.params.cartId;
    proId = req.params.proId;
    userHelpers.deleteCart(cartId, proId).then((response) => {
      res.json(response);
    });
  } catch (error) {
    next(error);
  }
});

router.post("/change-product-quantity", (req, res, next) => {
  try {
    userHelpers.changeProductQuantity(req.body).then(async (response) => {
      response.total = await userHelpers.getTotalAmount(user._id)
      res.json(response);
    });
  } catch (error) {
    next(error);
  }
});

router.get("/checkout", verifyLogin, async (req, res, next) => {
  try {
    let products = await userHelpers.getCartProducts(req.session.user._id);
    let total = await userHelpers.getTotalAmount(req.session.user._id);
    let user = req.session.user
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    let wishCount = await userHelpers.getWishCount(req.session.user._id);
    let addressId = req.query.id;
    let userId = req.session.user._id;
    let selectAddress = await userHelpers.placeAddress(addressId, userId);
    let showCatagory = await adminHelpers.showCatagory()
    let userAddress = await userHelpers.userAddress(req.session.user._id);
    let viewCoupon = await couponHelpers.viewCoupon();
    res.render("user/checkout", { users: true, user, total, cartCount, products, wishCount, userAddress, selectAddress, userId, viewCoupon, showCatagory});
  } catch (error) {
    next(error);
  }
});


router.post("/placeorder", verifyLogin, async (req, res, next) => {
  try {
    if(req.session.coupon){
      let user = userHelpers.getUserDetails(req.session.user._id)
      let order = req.body
      let CoupDetails = req.session.coupon
      let Couponname = CoupDetails.coupon
    let products = await userHelpers.getCartProductList(req.session.user._id);
    let totalPrice = await userHelpers.getTotalAmount(req.session.user._id);
    let discount = CoupDetails.discount
    console.log('jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj');
    console.log(discount,'discount');
    console.log(Couponname,'coup');
    userHelpers.placeOrder(order, products, totalPrice, req.session.user._id,discount,Couponname).then(async(orderId) => {
        
      if (req.body["payment-method"] === "COD") {
          res.json({ codSuccess: true });
        } else {
          let GrandTotal = totalPrice - discount
          userHelpers.generateRazorPay(orderId, GrandTotal).then((response) => {
            res.json(response);
          });
        }
      });
    }else{
      let user = await userHelpers.getUserDetails(req.session.user._id)
      let order = req.body
      let products = await userHelpers.getCartProductList(req.session.user._id);
      let totalPrice = await userHelpers.getTotalAmount(req.session.user._id);
      let GrandTotal = totalPrice
      userHelpers.placeOrder(order,products,totalPrice,req.session.user._id).then(async(orderId)=>{
        if(req.body['payment-method']=== 'COD'){
          res.json({codSuccess:true})
        }else{
          GrandTotal = totalPrice
          userHelpers.generateRazorPay(orderId,GrandTotal).then((response)=>{
            res.json(response)
          })
        }
      })
    }
  } catch (error) {
    next(error);
  }
});

router.get("/order", verifyLogin, async (req, res, next) => {
  try {
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    let wishCount = await userHelpers.getWishCount(req.session.user._id);
    let showCatagory = await adminHelpers.showCatagory()
    res.render("user/order", { users: true, user, cartCount, wishCount,showCatagory });
  } catch (error) {
    next(error);
  }
});

router.get("/order-success", verifyLogin, async (req, res, next) => {
  try {
    user = req.session.user;
    let cartCount = await userHelpers.getCartCount(req.session.user._id);
    let wishCount = await userHelpers.getWishCount(req.session.user._id);
    let showCatagory = await adminHelpers.showCatagory()
    let orders = await userHelpers.getUserOrders(req.session.user._id);
    res.render("user/order-success", { users: true, user, cartCount, orders, wishCount,showCatagory })
  } catch (error) {
    next(error);
  }
})

router.post("/verify-payment", (req, res, next) => {
  try {
    userHelpers.verifyPayment(req.body).then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        res.json({ status: true });
      });
    })
      .catch((err) => {
        res.json({ status: false });
      });
  } catch (error) {
    next(error);
  }
});



router.get("/view-order/:id",verifyLogin, async (req, res, next) => {
  try {
     let cartCount = await userHelpers.getCartCount(req.session.user._id);
     let wishCount = await userHelpers.getWishCount(req.session.user._id);
    let products = await userHelpers.getOrderProduct(req.params.id);
    let orders = await userHelpers.getUserOrders(req.session.user._id);
    let showCatagory = await adminHelpers.showCatagory()
    value = await userHelpers.value(req.params.id);
    res.render("user/view-order", { users: true, user, cartCount, products, orders, wishCount, value, showCatagory });
  } catch (error) {
    next(error);
  }
});


router.get("/profile",verifyLogin, async (req, res, next) => {
  try {
    let cartCount = null;
    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }
    user = req.session.user;
    let wishCount = null;
    if (req.session.user) {
      wishCount = await userHelpers.getWishCount(req.session.user._id);
    }
    let userSignupDetails = await userHelpers.getPersonalDetails(req.session.user._id);
    let userAddress = await userHelpers.userAddress(req.session.user._id);
    let showCatagory = await adminHelpers.showCatagory()

    res.render("user/profile", { users: true, user, cartCount, wishCount, userSignupDetails, userAddress,showCatagory });
  } catch (error) {
    next(error);
  }
});

router.post("/update-profile", async (req, res, next) => {
  try {
    let userName = await userHelpers.updateName(req.body, req.session.user._id);
    res.redirect("/profile");
  } catch (error) {
    next(error);
  }
});

router.post("/edit-address/:id", (req, res, next) => {
  try {
    addressId = req.params.id;
    usrID = req.session.user._id;
    userHelpers.updateAddress(req.body, addressId, usrID).then((response) => {
      res.redirect("/profile");
    });
  } catch (error) {
    next(error);
  }
});


router.get("/wishlist",verifyLogin, async (req, res, next) => {
  try {
    let cartCount = null;
    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id);
    }
    user = req.session.user;
    let wishCount = null;
    if (req.session.user) {
      wishCount = await userHelpers.getWishCount(req.session.user._id);
    }
    let products = await userHelpers.getWishProduct(req.session.user._id);
    let showCatagory = adminHelpers.showCatagory()
    res.render("user/wishlist", { users: true, products, cartCount, user, wishCount,showCatagory });
  } catch (error) {
    next(error);
  }
});

router.get("/add-to-wish/:id", (req, res, next) => {
  try {
    userHelpers.addToWish(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true });
    });
  } catch (error) {
    next(error);
  }
});

router.get("/delete-wish/:wishId/:proId", (req, res, next) => {
  try {
    wishId = req.params.wishId;
    proId = req.params.proId;

    userHelpers.deleteWish(wishId, proId).then((response) => {
      res.json(response);
    });
  } catch (error) {
    next(error);
  }
});

router.post("/add-address", async (req, res, next) => {
  try {
    let userProfileDetails = await userHelpers.profileDetails(
      req.body,
      req.session.user._id
    );
    res.redirect("/profile");
  } catch (error) {
    next(error);
  }
});

router.get("/delete-address/:id", async (req, res, next) => {
  try {
    userId = req.session.user._id;
    addressId = req.params.id;
    let deleteAddress = await userHelpers.deleteAddress(addressId, userId);
    res.redirect("/profile");
  } catch (error) {
    next(error);
  }
});

router.post("/change-password", async (req, res, next) => {
  try {
    userId = req.session.user._id;

    let userPassword = await userHelpers.updateUserPassword(userId, req.body);

    res.redirect("/profile");
  } catch (error) { }
});


router.post("/applycoupon", (req, res, next) => {
  try {
    couponHelpers.getAllCoupon(req.body).then((response) => {
      console.log(response,"hhh");
      if(response.coupon){
        req.session.coupon = response;

      }
     console.log(response,"response");
      res.json(response);
    });
  } catch (error) {
    next(error);
  }
});

router.get("/item-cancelled/:id", async (req, res, next) => {
  try {
    orderId = req.params.id;
    let changeStatusCancelled = await userHelpers.changeStatusCancelled(
      orderId
    );
    res.redirect("/order-success");
  } catch (error) {
    next(error);
  }
});


router.get("/logout", function (req, res, next) {
  try {
    req.session.user = null
    req.session.loggedIn = false
    res.redirect("/");
  } catch (error) { }
});

module.exports = router;
