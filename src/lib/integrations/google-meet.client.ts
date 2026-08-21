import { AppError } from "@/lib/services/course.service";

export interface GoogleCalendarEventInput {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey?: {
        type: "hangoutsMeet";
      };
    };
  };
}

export interface GoogleCalendarEventResult {
  id: string;
  summary: string;
  hangoutLink: string;
  htmlLink?: string;
}

export class GoogleMeetApiClient {
  async createCalendarEvent(
    accessToken: string,
    body: GoogleCalendarEventInput
  ): Promise<GoogleCalendarEventResult> {
    if (accessToken.startsWith("mock_") || !process.env.AUTH_GOOGLE_ID) {
      // Generate 3 segments of letters for meet.google.com/abc-defg-hij
      const randLetters = (len: number) =>
        Array.from({ length: len }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
      const meetCode = `${randLetters(3)}-${randLetters(4)}-${randLetters(3)}`;
      const meetUrl = `https://meet.google.com/${meetCode}`;

      return {
        id: `gcal_event_${Math.random().toString(36).substring(2, 10)}`,
        summary: body.summary,
        hangoutLink: meetUrl,
        htmlLink: `https://calendar.google.com/event?eid=${Math.random().toString(36).substring(2, 10)}`,
      };
    }

    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new AppError("GOOGLE_API_ERROR", 502, "Google Calendar event creation failed", errJson);
    }

    const data = await res.json();
    return {
      id: data.id,
      summary: data.summary,
      hangoutLink: data.hangoutLink || data.htmlLink,
      htmlLink: data.htmlLink,
    };
  }

  async updateCalendarEvent(
    accessToken: string,
    eventId: string,
    body: Partial<GoogleCalendarEventInput>
  ): Promise<void> {
    if (accessToken.startsWith("mock_") || !process.env.AUTH_GOOGLE_ID) {
      return;
    }

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new AppError("GOOGLE_UPDATE_ERROR", 502, "Failed to update Google Calendar event", errJson);
    }
  }
}

export const googleMeetApiClient = new GoogleMeetApiClient();
