import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { success: false, error: { message: "Missing upload key" } },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await req.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads", path.dirname(key));

    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(process.cwd(), "public", "uploads", key);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${key}`,
    });
  } catch (err: any) {
    console.error("Local dev upload error:", err);
    return NextResponse.json(
      { success: false, error: { message: "Failed to store local file" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
