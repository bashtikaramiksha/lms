import { Inngest } from "inngest";
import { env } from "@/lib/env";

export const inngest = new Inngest({
  id: "lms-platform",
  eventKey: env.INNGEST_EVENT_KEY || "local-inngest-key",
});

export type LMSInngestEvents = {
  "email/send-verification": {
    data: {
      to: string;
      rawToken: string;
      userId: string;
    };
  };
  "email/send-password-reset": {
    data: {
      to: string;
      rawToken: string;
      userId: string;
    };
  };
  "email/purchase-receipt": {
    data: {
      to: string;
      orderId: string;
    };
  };
  "payment/completed": {
    data: {
      orderId: string;
      userId: string;
      gateway: string;
    };
  };
  "certificate/generate": {
    data: {
      userId: string;
      courseId: string;
      enrollmentId: string;
    };
  };
  "course/submitted-for-review": {
    data: {
      courseId: string;
      teacherId: string;
      courseTitle: string;
    };
  };
  "course/published": {
    data: {
      courseId: string;
      adminId?: string;
      teacherId: string;
      courseTitle?: string;
    };
  };
  "live/session-created": {
    data: {
      sessionId: string;
      teacherId: string;
      courseId: string;
    };
  };
  "live/session-cancelled": {
    data: {
      sessionId: string;
    };
  };
};
