import React from "react";

export default function PirateCard({ children, className = "" }: any) {
  return (
    <div className={`wanted-poster rounded-md overflow-hidden ${className}`}>{children}</div>
  );
}
