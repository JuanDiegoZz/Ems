"use client";

/* Diagnostic previews are blob/data URLs; next/image cannot optimize these safely. */
/* eslint-disable @next/next/no-img-element */
export function OcrDebugImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} className={className} />;
}




