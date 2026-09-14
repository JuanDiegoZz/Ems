import { NextResponse } from "next/server";
import { DuplicateLookupValidationError } from "@/lib/people/duplicates";
import { findPersonDuplicates } from "@/server/people";

export async function POST(request: Request) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "La solicitud de duplicados no es válida." }, { status: 400 });
  }

  try {
    return NextResponse.json(await findPersonDuplicates(input));
  } catch (error) {
    if (error instanceof DuplicateLookupValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (process.env.NODE_ENV === "development") {
      const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
      console.error("[duplicates] failed", {
        error,
        input: {
          firstName: record.firstName,
          lastName: record.lastName,
          displayName: record.displayName,
          type: record.type,
          hasBadgeNumber: Boolean(record.badgeNumber),
        },
      });
    }
    return NextResponse.json({ error: "No se pudo comprobar duplicados." }, { status: 500 });
  }
}
