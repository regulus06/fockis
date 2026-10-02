import React from "react";

import {
  useNavigate,
} from "react-router-dom";


interface CurrentUser {
  avatar?: string;
  username?: string;
  fullName?: string;
}


interface SidebarProfileCardProps {
  currentUser?: CurrentUser | null;
  onNavigate?: () => void;
}


export default function SidebarProfileCard({
  currentUser,
  onNavigate,
}: SidebarProfileCardProps) {

  const navigate = useNavigate();


  if (!currentUser) {
    return null;
  }


  return (
    <div className="fk-sidebar__bottom">

      <button
        type="button"
        className="fk-sidebar__profile-card"
        onClick={() => {

          onNavigate?.();

          navigate("/profile");

        }}
      >

        <div className="fk-sidebar__profile-avatar">

          {currentUser.avatar ? (

            <img
              src={
                currentUser.avatar.startsWith("http")
                  ? currentUser.avatar
                  : `http://localhost:3000${currentUser.avatar}`
              }
              alt={
                currentUser.username || "Profile"
              }
            />

          ) : (

            currentUser.username
              ? currentUser.username
                  .charAt(0)
                  .toUpperCase()
              : "U"

          )}

        </div>


        <div className="fk-sidebar__profile-info">

          <strong>
            {
              currentUser.fullName ||
              currentUser.username ||
              "Your Profile"
            }
          </strong>


          <span>
            View your account
          </span>

        </div>

      </button>

    </div>
  );
}