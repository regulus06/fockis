import React from "react";
import "./StatusBadge.scss";

interface StatusBadgeProps {
  status: string;
  variant?: 
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "neutral";
}

const StatusBadge = ({
  status,
  variant,
}: StatusBadgeProps) => {

  const getVariant = () => {

    if (variant) {
      return variant;
    }


    const value = status.toLowerCase();


    if (
      [
        "active",
        "approved",
        "verified",
        "completed",
        "delivered",
        "success"
      ].includes(value)
    ) {
      return "success";
    }


    if (
      [
        "pending",
        "processing",
        "waiting",
        "review"
      ].includes(value)
    ) {
      return "warning";
    }


    if (
      [
        "disabled",
        "rejected",
        "blocked",
        "cancelled",
        "refunded",
        "failed"
      ].includes(value)
    ) {
      return "danger";
    }


    if (
      [
        "featured",
        "info",
        "new"
      ].includes(value)
    ) {
      return "info";
    }


    return "neutral";
  };


  return (
    <span
      className={`status-badge ${getVariant()}`}
    >
      {status}
    </span>
  );
};


export default StatusBadge;