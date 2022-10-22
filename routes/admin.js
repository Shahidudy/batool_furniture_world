const express = require('express');
const router = express.Router();
const productHelpers=require('../helpers/product-helpers')
const { response } = require('express');
const adminHelpers = require('../helpers/admin-helpers')
const collection = require('../config/collection')
const session = require('express-session')
const userHelpers = require ('../helpers/user-helpers')
const couponHelpers = require('../helpers/coupon-helpers');
const { route } = require('./user');

// get home 
router.get('/', async(req, res, next) =>{
  try {
    if(req.session.adminloggedIn){
      res.redirect('/admin/home')
    }else{
      res.render('admin/login')
    } 
  } catch (error) {
    next(error)
  }
})

router.get('/login',(req,res)=>{
  res.render('admin/login')
})
router.get('/home',async(req,res)=>{
  let userCount = await userHelpers.getUserCount()
  let orderCount = await userHelpers.getOrderCount()
  let codCount = await userHelpers.totalCOD()
  let totalDelivered = await userHelpers.totalDelivered()
  let cancelled = await userHelpers.cancelled()
  let monthamount = await userHelpers.totalMonthAmount()
  let ONLINECount = await userHelpers.totalONLINE()
  res.render('admin/home',{ admin: true ,layout:'admin-layout',userCount,orderCount,codCount,ONLINECount,totalDelivered,cancelled,monthamount})
})

router.post('/login',(req,res,next)=>{
  try {
    adminHelpers.doLogin(req.body).then(async(response)=>{
      if(response.status){
        req.session.adminloggedIn=true
      res.redirect('/admin/home')  
      }else{
        res.redirect('/admin')
      }
    })
  } catch (error) {
    next(error)
  }  
})

router.get('/add-products',(req,res,next)=>{
  try{
    adminHelpers.showCatagory().then((catDetails)=>{
      res.render('admin/add-products',{admin:true,layout:'admin-layout',catDetails})
    })
  } catch (error) {
    next(error)
  }  
})

router.post('/add-product',(req,res,next)=>{
  try{
    req.body.price = parseInt(req.body.price)
    productHelpers.addProduct(req.body,(id,catagory)=>{
      let image=req.files.image
      image.mv('./public/images/'+id+'.jpg',(err)=>{
        if(!err){
          res.redirect('/admin/view-products')
        }else{
          console.log(err)
        }
      })
    })
  } catch (error) {
    next(error)
  }  
})

router.get('/view-products',(req,res,next)=>{
  try{
    productHelpers.getAllProducts().then((products)=>{
      res.render('admin/view-products',{admin:true,products, layout:'admin-layout'})
    })
  } catch (error) {
    next(error)
  }  
})

router.get('/edit-product/:id',async(req,res,next)=>{
  try{
    let catDet=await adminHelpers.showCatagory()
await productHelpers.getProductData(req.params.id).then((product)=>{
res.render('admin/edit-product',{admin:true,layout:'admin-layout', product,catDet})
})
} catch (error) {
  next(error)
}  
})

router.post('/edit-product/:id',(req,res,next)=>{
  try{
    let id=req.params.id
productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin/view-products')
    if(req.files.Image){
      let image=req.files.Image
      image.mv('./public/images/'+id+'.jpg')
    }
  })
} catch (error) {
  next(error)
}  
})

router.get('/delete-product/:id',(req,res,next)=>{
  try{
    let proId = req.params.id
  productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/view-products')
  })
} catch (error) {
  next(error)
}  
})

router.get('/view-catagory',(req,res,next)=>{
  try{
    adminHelpers.showCatagory().then((allCatagory)=>{
      res.render('admin/view-catagory',{admin:true,allCatagory, layout:'admin-layout'})
    })
  } catch (error) {
    next(error)
  }  
})

router.get('/add-catagory',(req,res,next)=>{
  try{
    res.render('admin/add-catagory',{admin:true, layout:'admin-layout'})
  } catch (error) {
    next(error)
  }  
})

router.post('/add-catagory',(req,res,next)=>{
  try{
    adminHelpers.addCatagory(req.body).then((response)=>{
      res.json(response)
      res.redirect('/admin/view-catagory')
    })
  } catch (error) {
    next(error)
  }  
  })
router.get('/delete-catagory/:name',(req,res,next)=>{
  try {
    
    let catName = req.params.name
    console.log(req.params.name,"0000000000000000000000000000000000000000000000000000000");
  adminHelpers.checkCatagory(catName).then((data)=>{
    if(data[0]==undefined){
      adminHelpers.deleteCatagory(catName).then((response)=>{
        res.redirect('/admin/view-catagory')
      })
    }else{
      res.redirect('/admin/view-catagory')
      
    }
  })
} catch (error) {
  next(error)
}  
})

router.get('/manage-users',(req,res,next)=>{
  try{
    adminHelpers.getAllUsers().then((userDetails)=>{
      if(req.session.adminloggedIn){
      res.render('admin/manage-users',{admin:true ,layout:'admin-layout',userDetails})
      }else{
        res.redirect('/admin')
      }
    })
  } catch (error) {
    next(error)
  }  
})

router.get('/block-user/:id',(req,res,next)=>{
  try{
    adminHelpers.blockUser(req.params.id,req.body).then((response)=>{
      res.redirect('/admin/manage-users')
    })
  } catch (error) {
    next(error)
  }  
})

router.get('/unblock-user/:id',(req,res,next)=>{
  try{
    adminHelpers.unblockUser(req.params.id,req.body).then(()=>{
      res.redirect('/admin/manage-users')
    })
  } catch (error) {
    next(error)
  }  
})


router.get('/order',async(req,res,next)=>{
  try {
    order=await userHelpers.adminOrders()
    res.render('admin/order', { admin: true ,layout:'admin-layout',order})
    
  } catch (error) {
    next(error)
  }
 
  })

  router.get('/view-orderproduct/:id',async(req,res,next)=>{
    try {
      singleId = req.params.id
      let products=await userHelpers.getOrderProduct(req.params.id)
      buttonchange = await userHelpers.btnChange(singleId)
     
      res.render('admin/view-orderproduct',{products,singleId, admin: true ,layout:'admin-layout',buttonchange})
      
    } catch (error) {
      next(error)
    } 
  })

  router.get('/item-packed/:id',async(req,res,next)=>{
    try {
      orderId = req.params.id
      let changeStatusPacked = userHelpers.changeStatus(orderId)
      res.redirect('/admin/order')
    } catch (error) {
      next(error)
    }
  })

  router.get('/item-shipped/:id',async(req,res,next)=>{
    try {
      orderId = req.params.id
    let changeStatusShipped = userHelpers.changeStatusShipped(orderId)
    res.redirect('/admin/order')  
    } catch (error) {
      next(error)
    }
  })

  router.get('/item-delivered/:id',async(req,res,next)=>{
    try {
      orderId = req.params.id
    let changeStatusDelivered =await userHelpers.changeStatusDelivered(orderId)
    res.redirect('/admin/order')
    } catch (error) {
      next(error)
    }
  })

  router.get('/add-coupon', function (req, res, next) {
    try {
      res.render('admin/add-coupon', { admin: true ,layout:'admin-layout'});    
    } catch (error) {
      next(error)
    }
  });

  router.post('/add-coupon', (req, res,next) => {
    try {
      couponHelpers.addCoupon(req.body,(id) =>{
        res.redirect('/admin/view-coupon')
    })    
    } catch (error) {
      next(error)
    }
     });

  router.get('/view-coupon', function (req, res, next) {
    try {
      couponHelpers.getCoupon().then((coupondetails) => {   
        res.render('admin/view-coupon', { coupondetails, admin: true,layout:'admin-layout'});   
  })     
    } catch (error) {
      next(error)
    } 
  })

  router.get('/delete-coupon/:id',(req,res,next)=>{
    try {
      let couponId=req.params.id  
      couponHelpers.deleteCoupon(couponId).then((response)=>{
        res.redirect('/admin/view-coupon')
      })    
    } catch (error) {
      next(error)
    }
  })


router.get('/logout', function(req, res, next) {
  try {
  req.session.adminloggedIn=false
  req.session.adminloggedIn=null

  res.redirect('/admin')
  } catch (error) {
    next(error)
  }  
});

router.use(function(req, res, next) {
  next(createError(404));
});

// error handler
router.use(function(err, req, res, next) {
  console.log(err);
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.status(err.status || 500);
  res.render('admin/errors');
});

module.exports = router;
