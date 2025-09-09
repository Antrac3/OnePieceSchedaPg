import React from "react";
import { Button } from "@/components/ui/button";

export default function PirateButton({ children, className = "", ...props }: any) {
  return (
    <Button
      {...props}
      className={`font-heading tracking-wide shadow-md border-2 border-transparent hover:border-yellow-400 transition-all ${className}`}
    >
      {children}
    </Button>
  );
}
