import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Resend Webhook Handler
 * 
 * This route forwards Resend webhooks to the backend for processing.
 * The backend handles signature verification and email status updates.
 * 
 * Configure in Resend Dashboard:
 * - Webhook URL: https://your-frontend-domain.com/api/webhooks/resend
 * - Or directly to backend: https://your-backend-domain.com/api/v1/webhook/resend
 */
export async function POST(req: Request) {
  try {
    // Get the raw body and headers for signature verification
    const body = await req.text();
    
    // Forward to backend with all headers intact
    const response = await fetch(`${BACKEND_URL}/webhook/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward Svix headers for signature verification
        "svix-id": req.headers.get("svix-id") || "",
        "svix-timestamp": req.headers.get("svix-timestamp") || "",
        "svix-signature": req.headers.get("svix-signature") || "",
      },
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Webhook forwarding error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
