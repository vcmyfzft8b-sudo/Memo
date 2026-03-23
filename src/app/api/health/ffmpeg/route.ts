import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    const [whichResult, versionResult] = await Promise.allSettled([
      execFileAsync("which", ["ffmpeg"]),
      execFileAsync("ffmpeg", ["-version"]),
    ]);

    return NextResponse.json({
      ok: true,
      which:
        whichResult.status === "fulfilled"
          ? whichResult.value.stdout.trim() || null
          : null,
      version:
        versionResult.status === "fulfilled"
          ? versionResult.value.stdout.split("\n")[0]?.trim() ?? null
          : null,
      errors: {
        which:
          whichResult.status === "rejected"
            ? whichResult.reason instanceof Error
              ? whichResult.reason.message
              : String(whichResult.reason)
            : null,
        version:
          versionResult.status === "rejected"
            ? versionResult.reason instanceof Error
              ? versionResult.reason.message
              : String(versionResult.reason)
            : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
