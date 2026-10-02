import {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  sellerApi,
} from "../services/sellerApi";

import "../styles/SellerSettingsPage.scss";


type IconProps = {
  size?: number;
};


/* =========================================================
   ICONS
========================================================= */

const IconHome = ({ size = 16 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
);


const IconBox = ({ size = 16 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </svg>
);


const IconBag = ({ size = 16 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 8h12l-1 12H7L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);


const IconTruck = ({ size = 16 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 8h11v9H2zM13 11h5l3 3v3h-8z" />
    <circle cx="6.5" cy="18" r="1.6" />
    <circle cx="16.5" cy="18" r="1.6" />
  </svg>
);


const IconChart = ({ size = 16 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 20V10M12 20V4M20 20v-7" />
  </svg>
);


const IconGear = ({ size = 16 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />

    <path d="
      M19.4 13
      a7.9 7.9 0 0 0 0-2
      l2-1.5
      -2-3.4
      -2.3.9
      a7.7 7.7 0 0 0-1.8-1
      L15 3
      h-6
      l-.3 2
      a7.7 7.7 0 0 0-1.8 1
      l-2.3-.9
      -2 3.4
      L4.6 11
      a7.9 7.9 0 0 0 0 2
      l-2 1.5
      2 3.4
      2.3-.9
      c.55.43 1.16.77 1.8 1
      L9 21
      h6
      l.3-2
      c.64-.23 1.25-.57 1.8-1
      l2.3.9
      2-3.4Z
    " />
  </svg>
);


const IconStore = ({ size = 20 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9 4.5 4h15L21 9" />

    <path d="
      M3 9v11h18V9
      M3 9a3 3 0 0 0 6 0
      M9 9a3 3 0 0 0 6 0
      M15 9a3 3 0 0 0 6 0
    " />
  </svg>
);


const IconSearch = ({ size = 16 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);


const IconUser = ({ size = 18 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c1.7-3.4 5-5 7.5-5s5.8 1.6 7.5 5" />
  </svg>
);


const IconMail = ({ size = 15 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);


const IconPhone = ({ size = 15 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 4h4l2 5-2.5 1.5a12 12 0 0 0 6 6L15 14l5 2v4a2 2 0 0 1-2 2C9.7 22 2 14.3 2 6a2 2 0 0 1 2-2Z" />
  </svg>
);


const IconPin = ({ size = 15 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);


const IconImage = ({ size = 15 }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="m21 16-5.5-5.5L4 21" />
  </svg>
);


const NAV_ITEMS = [
  {
    label:"Dashboard",
    path:"/seller",
    icon:IconHome,
  },
  {
    label:"Products",
    path:"/seller/products",
    icon:IconBox,
  },
  {
    label:"Orders",
    path:"/seller/orders",
    icon:IconBag,
  },
  {
    label:"Shipping",
    path:"/seller/shipping",
    icon:IconTruck,
  },
  {
    label:"Analytics",
    path:"/seller/analytics",
    icon:IconChart,
  },
  {
    label:"Settings",
    path:"/seller/settings",
    icon:IconGear,
  },
];
export default function SellerSettingsPage() {

  const navigate = useNavigate();

  const location = useLocation();


  const [form,setForm] = useState({

    storeName:"",
    description:"",
    businessEmail:"",
    phone:"",
    address:"",
    logo:"",

  });



  const [saving,setSaving] = useState(false);



  useEffect(()=>{

    loadStore();

  },[]);





  async function loadStore(){

    try{


      const data =
        await sellerApi.getSellerProfile?.();



      if(data){

        setForm({

          storeName:data.storeName || "",

          description:data.description || "",

          businessEmail:data.businessEmail || "",

          phone:data.phone || "",

          address:data.address || "",

          logo:data.logo || "",

        });

      }


    }
    catch(err){

      console.log(
        "seller settings load error",
        err
      );

    }

  }






  function change(
    field:string,
    value:string
  ){

    setForm({

      ...form,

      [field]:value,

    });

  }







  async function save(){

    try{


      setSaving(true);



      if(
        sellerApi.updateSellerProfile
      ){

        await sellerApi.updateSellerProfile(
          form
        );

      }



      alert(
        "Store profile saved"
      );


    }
    catch(err){

      console.log(err);

      alert(
        "Failed saving settings"
      );


    }
    finally{

      setSaving(false);

    }

  }







  function go(path:string){

    navigate(path);

  }







  return (

    <div className="seller-settings-page">



      {/* ============================
          DESKTOP HEADER
      ============================ */}


      <div className="console-header">


        <div
          className="console-logo"
          onClick={()=>go("/seller")}
        >

          <IconStore/>

          <span>
            Seller Center
          </span>

        </div>





        <div className="console-search">


          <input
            placeholder="Search products, orders, reports"
          />


          <button>

            <IconSearch/>

          </button>


        </div>







        <div className="console-account">

          <IconUser/>


          <div className="console-account-text">


            <span className="console-account-label">

              Hello, Seller

            </span>



            <span className="console-account-sub">

              Account

            </span>


          </div>


        </div>


      </div>









      {/* ============================
          DESKTOP TAB NAV
      ============================ */}



      <nav className="console-tabbar">


        {NAV_ITEMS.map(
          ({
            label,
            path,
            icon:Icon
          })=>(


          <button

            key={path}

            className={
              location.pathname === path
              ? "is-active"
              :""
            }


            onClick={()=>go(path)}

          >


            <Icon size={16}/>


            <span>
              {label}
            </span>


          </button>


        ))}


      </nav>









      {/* ============================
          MOBILE BOTTOM NAV
      ============================ */}



      <nav className="seller-mobile-bottom-nav">


        {NAV_ITEMS.slice(0,5).map(
          ({
            label,
            path,
            icon:Icon
          })=>(


          <button

            key={path}

            className={
              location.pathname === path
              ? "active"
              :""
            }


            onClick={()=>go(path)}

          >


            <Icon size={20}/>


            <span>
              {label}
            </span>


          </button>


        ))}



      </nav>








      {/* ============================
          SETTINGS BODY START
      ============================ */}



      <div className="settings-body">


        <div className="settings-page-head">


          <span className="eyebrow">

            Store setup

          </span>



          <h1>
            Store settings
          </h1>



          <p>
            Update how your store appears to customers
          </p>


        </div>





        <div className="settings-card">



          <div className="form-section">


            <h2>
              Store information
            </h2>





            <div className="input-group">


              <label>
                Store name
              </label>


              <input

                value={form.storeName}

                placeholder="Enter store name"

                onChange={
                  e=>
                  change(
                    "storeName",
                    e.target.value
                  )
                }

              />


            </div>







            <div className="input-group">


              <label>
                Description
              </label>


              <textarea

                value={form.description}

                placeholder="Tell customers about your store"


                onChange={
                  e=>
                  change(
                    "description",
                    e.target.value
                  )
                }


              />


            </div>






            <div className="input-row">


              <div className="input-group">


                <label>

                  <IconMail/>

                  Business email

                </label>



                <input

                  value={form.businessEmail}

                  onChange={
                    e=>
                    change(
                      "businessEmail",
                      e.target.value
                    )
                  }

                />


              </div>






              <div className="input-group">


                <label>

                  <IconPhone/>

                  Phone

                </label>



                <input

                  value={form.phone}

                  onChange={
                    e=>
                    change(
                      "phone",
                      e.target.value
                    )
                  }

                />


              </div>


            </div>





            <div className="input-group">


              <label>

                <IconPin/>

                Address

              </label>


              <input

                value={form.address}

                onChange={
                  e=>
                  change(
                    "address",
                    e.target.value
                  )
                }

              />


            </div>





            <div className="input-group">


              <label>

                <IconImage/>

                Logo URL

              </label>


              <input

                value={form.logo}

                onChange={
                  e=>
                  change(
                    "logo",
                    e.target.value
                  )
                }

              />


            </div>





            <button

              className="btn btn-primary"

              disabled={saving}

              onClick={save}

            >

              {
                saving
                ?
                "Saving..."
                :
                "Save store profile"
              }


            </button>




          </div>
                    {/* ============================
              LIVE PREVIEW
          ============================ */}


          <div className="store-preview">


            <h2>
              Live preview
            </h2>





            <div className="preview-card">


              <div className="preview-banner" />





              <div className="preview-logo-wrap">


                {
                  form.logo

                  ?

                  <img
                    src={form.logo}
                    alt="store logo"
                  />

                  :

                  <div className="preview-logo-fallback">

                    <IconStore size={22}/>

                  </div>

                }


              </div>








              <h3>

                {
                  form.storeName
                  ||
                  "Your store name"
                }

              </h3>





              <p>

                {
                  form.description
                  ||
                  "Your store description"
                }

              </p>








              <div className="preview-meta">



                <div>

                  <IconMail/>

                  {
                    form.businessEmail
                    ||
                    "email@example.com"
                  }

                </div>





                <div>

                  <IconPhone/>

                  {
                    form.phone
                    ||
                    "Phone number"
                  }

                </div>






                <div>

                  <IconPin/>

                  {
                    form.address
                    ||
                    "Store address"
                  }

                </div>




              </div>





            </div>



          </div>





        </div>



      </div>






    </div>

  );

}