"use client";

import { useEffect } from "react";
import { markPersonRecent, type RecentPerson } from "@/lib/people/recent-people";

export function RecentPersonMarker({ profileId, person }: { profileId: string; person: RecentPerson }) {
  useEffect(() => { markPersonRecent(profileId, person); }, [person, profileId]);
  return null;
}
