import { AppError } from "@/lib/services/course.service";

export interface ZoomMeetingInput {
  topic: string;
  type?: number; // 2 = scheduled meeting
  start_time: string; // ISO 8601
  duration: number; // minutes
  timezone?: string;
  agenda?: string;
  settings?: {
    host_video?: boolean;
    participant_video?: boolean;
    join_before_host?: boolean;
    mute_upon_entry?: boolean;
    waiting_room?: boolean;
    auto_recording?: string;
  };
}

export interface ZoomMeetingResult {
  id: string | number;
  topic: string;
  start_url: string;
  join_url: string;
  start_time?: string;
  duration?: number;
}

export class ZoomApiClient {
  async createMeeting(
    accessToken: string,
    userId: string,
    body: ZoomMeetingInput
  ): Promise<ZoomMeetingResult> {
    // If mock token or in development without credentials, generate simulated zoom meeting
    if (accessToken.startsWith("mock_") || !process.env.ZOOM_CLIENT_ID) {
      const meetingId = Math.floor(10000000000 + Math.random() * 90000000000);
      const zakToken = Math.random().toString(36).substring(2, 15);
      return {
        id: meetingId,
        topic: body.topic,
        start_url: `https://zoom.us/s/${meetingId}?zak=${zakToken}`,
        join_url: `https://zoom.us/j/${meetingId}`,
        start_time: body.start_time,
        duration: body.duration,
      };
    }

    const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new AppError("ZOOM_API_ERROR", 502, "Zoom meeting creation failed", errJson);
    }

    return res.json();
  }

  async updateMeeting(
    accessToken: string,
    meetingId: string | number,
    body: Partial<ZoomMeetingInput>
  ): Promise<void> {
    if (accessToken.startsWith("mock_") || !process.env.ZOOM_CLIENT_ID) {
      return;
    }

    const res = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId.toString())}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new AppError("ZOOM_UPDATE_ERROR", 502, "Failed to update Zoom meeting details", errJson);
    }
  }
}

export const zoomApiClient = new ZoomApiClient();
