import Image from "next/image";

export function BrandLogo() {
  return <span className="brand-mark"><Image src="/ems-logo.png" alt="" width={96} height={48} priority /></span>;
}
