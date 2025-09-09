import React from "react";

export default function AnimatedIcon({
  src,
  className = "h-6 w-6",
  spin = false,
  alt = "icon",
  style = {},
}: {
  src: string;
  className?: string;
  spin?: boolean;
  alt?: string;
  style?: React.CSSProperties;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={`${className} ${spin ? "pirate-icon-spin" : ""}`}
      style={{ imageRendering: "optimizeQuality", ...style }}
    />
  );
}
