import React, {



  useMemo,



  useState,



} from "react";







import { buildMediaUrl } from "../../utils/fockisFeedHelpers";
import "../../styles/FockisPostMedia.scss";







/* ============================================================================



   TYPES



\============================================================================ */







export type FockisPostMediaType =



  | "image"



  | "video";







export interface FockisPostMediaItem {



  url: string;



  type: FockisPostMediaType;



}







interface FockisPostMediaProps {



  media?: string;



  mediaItems?: FockisPostMediaItem[];



  type?: FockisPostMediaType | "none";



  postId: string;



}







/* ============================================================================



   MEDIA URL



\============================================================================ */







const getSafeMediaUrl = (



  value: string,



): string => {



  if (!value) {



    return "";



  }







  const clean = value.trim();







  if (



    !clean ||



    clean === "undefined" ||



    clean === "null"



  ) {



    return "";



  }







  /*



   \\* Use the same centralized media URL logic as the feed mapper.



   \\*



   \\* This is important in production because relative upload paths and



   \\* legacy localhost URLs must resolve through the Render backend.



   */



  return buildMediaUrl(clean);



};







/* ============================================================================



   DETECT VIDEO



\============================================================================ */







const detectVideo = (



  url: string,



): boolean => {



  const cleanUrl =



    url



      .toLowerCase()



      .split("?")[0];







  return [



    ".mp4",



    ".webm",



    ".mov",



    ".m4v",



    ".avi",



    ".mkv",



    ".3gp",



    ".mpeg",



    ".mpg",



  ].some(



    (extension) =>



      cleanUrl.endsWith(extension),



  );



};







/* ============================================================================



   POST MEDIA



\============================================================================ */







export default function FockisPostMedia({



  media,



  mediaItems,



  type = "none",



  postId,



}: FockisPostMediaProps) {



  const [



    activeMedia,



    setActiveMedia,



  ] = useState<number | null>(null);







  /* ==========================================================================



     BUILD MEDIA LIST



  ========================================================================== */







  const items =



    useMemo<FockisPostMediaItem[]>(



      () => {



        if (



          mediaItems &&



          mediaItems.length > 0



        ) {



          return mediaItems



            .map((item) => {



              const url =



                getSafeMediaUrl(



                  item.url,



                );







              if (!url) {



                return null;



              }







              return {



                url,



                type:



                  item.type ||



                  (detectVideo(



                    url,



                  )



                    ? "video"



                    : "image"),



              };



            })



            .filter(



              (



                item,



              ): item is FockisPostMediaItem =>



                item !== null,



            );



        }







        if (



          media &&



          type !== "none"



        ) {



          const url =



            getSafeMediaUrl(



              media,



            );







          if (!url) {



            return [];



          }







          return [



            {



              url,



              type:



                type === "video"



                  ? "video"



                  : "image",



            },



          ];



        }







        return [];



      },



      [



        media,



        mediaItems,



        type,



      ],



    );







  /* ==========================================================================



     NO MEDIA



  ========================================================================== */







  if (



    items.length === 0



  ) {



    return null;



  }







  /* ==========================================================================



     SINGLE MEDIA



  ========================================================================== */







  if (



    items.length === 1



  ) {



    const item =



      items[0];







    if (!item) {



      return null;



    }







    return (



      <div



        className="fk-post-media fk-post-media--single"



        data-post-id={postId}



      >



        {item.type ===



        "video" ? (



          <video



            className="fk-post-media__single-video"



            src={item.url}



            controls



            autoPlay
              muted
              playsInline
              preload="auto"



          />



        ) : (



          <img



            className="fk-post-media__single-image"



            src={item.url}



            alt="Post media"



            loading="lazy"



          />



        )}



      </div>



    );



  }







  /* ==========================================================================



     MULTIPLE MEDIA



  ========================================================================== */







  const visibleItems =



    items.slice(



      0,



      4,



    );







  const extraCount =



    items.length - 4;







  return (



    <div



      className={`fk-post-media fk-post-media--grid fk-post-media--count-${Math.min(



        items.length,



        4,



      )}`}



      data-post-id={postId}



    >



      {visibleItems.map(



        (



          item,



          index,



        ) => (



          <button



            key={`${postId}-media-${index}`}



            type="button"



            className="fk-post-media__grid-item"



            onClick={() =>



              setActiveMedia(



                index,



              )



            }



          >



            {item.type ===



            "video" ? (



              <video



                className="fk-post-media__grid-video"



                src={item.url}



                muted
                autoPlay
                loop
                playsInline
                preload="auto"



              />



            ) : (



              <img



                className="fk-post-media__grid-image"



                src={item.url}



                alt={`Post media ${index + 1}`}



                loading="lazy"



              />



            )}







            {item.type ===



              "video" && (



              <span className="fk-post-media__video-icon">



                ▶



              </span>



            )}







            {index === 3 &&



              extraCount >



                0 && (



                <span className="fk-post-media__more">



                  +{extraCount}



                </span>



              )}



          </button>



        ),



      )}







      {/* ======================================================================



          LARGE MEDIA VIEWER



      ====================================================================== */}







      {activeMedia !==



        null &&



        items[



          activeMedia



        ] && (



          <div



            className="fk-media-lightbox"



            role="dialog"



            aria-modal="true"



            onClick={() =>



              setActiveMedia(



                null,



              )



            }



          >



            <button



              type="button"



              className="fk-media-lightbox__close"



              onClick={() =>



                setActiveMedia(



                  null,



                )



              }



              aria-label="Close media viewer"



            >



              ×



            </button>







            <button



              type="button"



              className="fk-media-lightbox__prev"



              onClick={(



                event,



              ) => {



                event.stopPropagation();







                setActiveMedia(



                  (



                    current,



                  ) => {



                    if (



                      current ===



                      null



                    ) {



                      return (



                        items.length -



                        1



                      );



                    }







                    return current <=



                      0



                      ? items.length -



                        1



                      : current - 1;



                  },



                );



              }}



              aria-label="Previous media"



            >



              ‹



            </button>







            <div



              className="fk-media-lightbox__content"



              onClick={(event) =>



                event.stopPropagation()



              }



            >



              {items[



                activeMedia



              ]?.type ===



              "video" ? (



                <video



                  className="fk-media-lightbox__media"



                  src={



                    items[



                      activeMedia



                    ]?.url



                  }



                  controls



                  autoPlay



                  muted
                  playsInline
                />



              ) : (



                <img



                  className="fk-media-lightbox__media"



                  src={



                    items[



                      activeMedia



                    ]?.url



                  }



                  alt="Post media enlarged"



                />



              )}







              <div className="fk-media-lightbox__counter">



                {activeMedia +



                  1}{" "}



                /{" "}



                {items.length}



              </div>



            </div>







            <button



              type="button"



              className="fk-media-lightbox__next"



              onClick={(



                event,



              ) => {



                event.stopPropagation();







                setActiveMedia(



                  (



                    current,



                  ) => {



                    if (



                      current ===



                      null



                    ) {



                      return 0;



                    }







                    return current >=



                      items.length -



                        1



                      ? 0



                      : current + 1;



                  },



                );



              }}



              aria-label="Next media"



            >



              ›



            </button>



          </div>



        )}



    </div>



  );



}
