import {
  useEffect,
  useState,
} from "react";

import {
  sellerApi,
} from "../services/sellerApi";

import "../styles/SellerSettingsPage.scss";


type IconProps = {
  size?: number;
};


/* =========================================================
   ICONS

   NOTE: the old inline header/tab nav (console-header,
   console-tabbar, seller-mobile-bottom-nav) has been removed
   from this file's render. SellerLayout already renders
   SellerSidebar for every /seller/* route, so this page was
   duplicating that navigation a second time. Only the icons
   still used inside the settings form itself remain below.
========================================================= */


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


const IconStore = ({ size = 22 }: IconProps) => (
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


export default function SellerSettingsPage() {

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







  return (

    <div className="seller-settings-page">



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