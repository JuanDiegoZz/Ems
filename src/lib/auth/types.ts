export type AppRole = "admin" | "ems";

export type Profile = Readonly<{
  id: string;
  username: string;
  rp_name: string;
  role: AppRole;
  active: boolean;
}>;




