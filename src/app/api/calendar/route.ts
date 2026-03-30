import { NextResponse } from "next/server";
import { getCalendarClient } from "@/lib/google-calendar";

export async function GET(request: Request) {
  try {
    const calendar = await getCalendarClient();
    
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const timeMax = searchParams.get("timeMax") || endOfDay.toISOString();

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin,
      timeMax: timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    });

    return NextResponse.json({ events: response.data.items || [] });
  } catch (error: any) {
    console.error("Calendar API Error (GET):", error);
    return NextResponse.json({ error: error.message || "Failed to fetch calendar events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const calendar = await getCalendarClient();
    const body = await request.json();
    const { summary, description, start, end } = body;

    if (!summary || !start || !end) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: summary,
        description: description || "",
        start: {
          dateTime: start,
          timeZone: "Asia/Tokyo", // Default to JST
        },
        end: {
          dateTime: end,
          timeZone: "Asia/Tokyo",
        },
      },
    });

    return NextResponse.json({ event: response.data });
  } catch (error: any) {
    console.error("Calendar API Error (POST):", error);
    return NextResponse.json({ error: error.message || "Failed to create calendar event" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const calendar = await getCalendarClient();
    const body = await request.json();
    const { eventId, summary, start, end } = body;

    if (!eventId) throw new Error("eventId is required");

    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId: eventId,
      requestBody: {
        summary,
        start: { dateTime: start, timeZone: "Asia/Tokyo" },
        end: { dateTime: end, timeZone: "Asia/Tokyo" },
      },
    });

    return NextResponse.json({ event: response.data });
  } catch (error: any) {
    console.error("Calendar API Error (PUT):", error);
    return NextResponse.json({ error: error.message || "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const calendar = await getCalendarClient();
    const url = new URL(request.url);
    const eventId = url.searchParams.get("eventId");
    if (!eventId) throw new Error("eventId is required");

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Calendar API Error (DELETE):", error);
    return NextResponse.json({ error: error.message || "Failed to delete event" }, { status: 500 });
  }
}
