interface ReminderEmailProps {
  studentName: string;
  courseTitle: string;
  sessionTitle: string;
  scheduledAt: string;
  duration: number;
  platform: "ZOOM" | "GOOGLE_MEET";
  sessionUrl: string;
  timeRemaining: string; // e.g. "24 hours" or "1 hour"
}

export function generateSessionReminderHtml(props: ReminderEmailProps): string {
  const formattedDate = new Date(props.scheduledAt).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const platformBadge = props.platform === "ZOOM" ? "Zoom Meeting" : "Google Meet";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="margin-bottom: 24px; text-align: center;">
        <span style="display: inline-block; padding: 6px 14px; background-color: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
          Live Class Reminder • Starts in ${props.timeRemaining}
        </span>
      </div>

      <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; line-height: 1.3; margin: 0 0 12px; text-align: center;">
        ${props.sessionTitle}
      </h1>

      <p style="color: #64748b; font-size: 15px; line-height: 1.5; margin: 0 0 24px; text-align: center;">
        Course: <strong style="color: #1e293b;">${props.courseTitle}</strong>
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <div style="margin-bottom: 12px;">
          <span style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">📅 Scheduled Time</span>
          <div style="color: #0f172a; font-size: 15px; font-weight: 700; margin-top: 2px;">${formattedDate}</div>
        </div>
        <div style="display: flex; gap: 24px;">
          <div style="margin-bottom: 8px;">
            <span style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">⏱️ Duration</span>
            <div style="color: #0f172a; font-size: 14px; font-weight: 600; margin-top: 2px;">${props.duration} Minutes</div>
          </div>
          <div>
            <span style="color: #64748b; font-size: 13px; font-weight: 600; text-transform: uppercase;">🎥 Platform</span>
            <div style="color: #0f172a; font-size: 14px; font-weight: 600; margin-top: 2px;">${platformBadge}</div>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${props.sessionUrl}" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
          Go to Classroom Hub →
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; text-align: center; margin: 0; border-top: 1px solid #f1f5f9; padding-top: 20px;">
        Classroom access unlocks 15 minutes before the scheduled broadcast. We recommend joining 5 minutes early to test your audio & video setup.
      </p>
    </div>
  `;
}

interface CancelledEmailProps {
  studentName: string;
  courseTitle: string;
  sessionTitle: string;
  scheduledAt: string;
}

export function generateSessionCancelledHtml(props: CancelledEmailProps): string {
  const formattedDate = new Date(props.scheduledAt).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 16px;">
      <div style="margin-bottom: 20px; text-align: center;">
        <span style="display: inline-block; padding: 6px 14px; background-color: #fee2e2; color: #b91c1c; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          Class Notice • Cancelled
        </span>
      </div>

      <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3; margin: 0 0 12px; text-align: center;">
        Live Class Cancelled
      </h1>

      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        Hello <strong>${props.studentName}</strong>,
      </p>

      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
        The upcoming live class <strong style="color: #0f172a;">"${props.sessionTitle}"</strong> for course <strong style="color: #0f172a;">${props.courseTitle}</strong> originally scheduled for <strong style="color: #0f172a;">${formattedDate}</strong> has been cancelled by your instructor.
      </p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; color: #64748b; font-size: 13px;">
        Your instructor will schedule a replacement lecture soon. You will receive an automated notification as soon as the new session date is posted.
      </div>
    </div>
  `;
}

interface RecordingEmailProps {
  studentName: string;
  courseTitle: string;
  sessionTitle: string;
  recordingUrl: string;
}

export function generateRecordingAvailableHtml(props: RecordingEmailProps): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="margin-bottom: 20px; text-align: center;">
        <span style="display: inline-block; padding: 6px 14px; background-color: #f3e8ff; color: #7e22ce; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          Class Replay Published 🎥
        </span>
      </div>

      <h1 style="color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3; margin: 0 0 12px; text-align: center;">
        ${props.sessionTitle}
      </h1>

      <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 24px; text-align: center;">
        Course: <strong style="color: #1e293b;">${props.courseTitle}</strong>
      </p>

      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
        Hello <strong>${props.studentName}</strong>, the full recording for this live lecture is now processed and ready for on-demand playback.
      </p>

      <div style="text-align: center; margin-bottom: 28px;">
        <a href="${props.recordingUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);">
          Watch Recording Replay →
        </a>
      </div>
    </div>
  `;
}
