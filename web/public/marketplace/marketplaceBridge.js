/**
 * ============================================================================
 * MDFockis Marketplace
 * Public UI Bridge
 * ============================================================================
 *
 * Connects public HTML marketplace
 * with NestJS backend SDK.
 */


const API_BASE =
    window.MDFOCKIS_API ??
    "http://localhost:3000";



async function apiRequest(
    url,
    options={}
){

    const token =
        localStorage.getItem("token") ??
        localStorage.getItem("accessToken");


    const response =
        await fetch(

            API_BASE + url,

            {

                ...options,

                headers:{

                    Accept:
                    "application/json",

                    Authorization:
                    token
                    ? `Bearer ${token}`
                    : "",

                    ...(options.headers || {})

                }

            }

        );


    if(!response.ok){

        throw new Error(
            await response.text()
        );

    }


    return response.json();

}




/**
 * PRODUCTS
 */

export async function loadProducts(){


    const response =
        await apiRequest(
            "/marketplace/products"
        );


    return (

        response.items ??
        response.data ??
        response

    );

}





/**
 * CATEGORIES
 */

export async function loadCategories(){


    const response =
        await apiRequest(
            "/marketplace/categories"
        );


    return (

        response.items ??
        response.data ??
        response

    );

}





/**
 * STORES
 */

export async function loadStores(){


    const response =
        await apiRequest(
            "/marketplace/stores"
        );


    return (

        response.items ??
        response.data ??
        response

    );

}





/**
 * CART
 */

export async function loadCart(){


    return apiRequest(
        "/marketplace/cart"
    );

}





export async function addToCart(
    productId,
    quantity=1
){

    return apiRequest(

        "/marketplace/cart",

        {

            method:"POST",

            headers:{

                "Content-Type":
                "application/json"

            },

            body:
            JSON.stringify({

                productId,

                quantity

            })

        }

    );

}





/**
 * WISHLIST
 */

export async function toggleWishlist(
    productId
){

    return apiRequest(

        "/marketplace/wishlist/toggle",

        {

            method:"POST",

            headers:{

                "Content-Type":
                "application/json"

            },

            body:
            JSON.stringify({

                productId

            })

        }

    );

}