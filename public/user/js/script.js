function addToCart(proId) {
    Swal.fire({
        // position: 'top-end',
        icon: 'success',
        title: 'Added to Cart',
        showConfirmButton: false,
        timer: 1500
      })
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                
                $("#cart-count").html(count)

            }
        }
    })
}



    function removeProduct(cartId, proId) {
        console.log(cartId, proId)
        $.ajax({
            url: '/delete-cart/' + cartId + '/' + proId,
            method: 'get',
            success: (response) => {
                if (response.removeProduct) {
                    location.reload()
                    $("#cart-count").load(location.href + "#cart-count");
                }
            }
        })
    }



function addToWishlist(proId) {
    Swal.fire({
        // position: 'top-end',
        icon: 'success',
        title: 'Added to Wishlist',
        showConfirmButton: false,
        timer: 1500
      })
    $.ajax({
        url: '/add-to-wish/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#wish-count').html()
                count = parseInt(count) + 1
                
                $("#wish-count").html(count)

            }
        }
    })
}

function deleteProduct(wishId, proId) {
    $.ajax({
        url: '/delete-wish/' + wishId + '/' + proId,
        method: 'get',
        success: (response) => {
            if (response.deleteProduct) {
                //alert('Do you want to remove the product')
                Swal.fire(
                    'Product removed!',
                    'You clicked the button!',
                    'success'
                )
                location.reload()
                $("#myDiv").load(location.href + " #myDiv");
                $("#wish-count").load(location.href + " #wish-count");
            }
        }
    })
}