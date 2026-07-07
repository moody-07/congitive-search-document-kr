import { NextResponse } from "next/server";

export async function GET() {
  try {
    const OCR_URL = "https://stt.roshnaisunat.com/balance/";
    const OCR_TOKEN = "be1b0beb-9a04-4942-adbc-c57a16ea489b";

    const res = await fetch(OCR_URL, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Token": OCR_TOKEN,
      },
      // Avoid caching the API request so they always get the latest balance
      cache: "no-store",
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OCR Balance API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching OCR balance:", error);
    return NextResponse.json(
      { error: `Failed to fetch balance: ${error.message || error}` },
      { status: 500 }
    );
  }
}
