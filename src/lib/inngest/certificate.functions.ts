import { inngest } from "@/lib/inngest";
import { certificateService } from "@/lib/services/certificate.service";

export const generateCertificateFunction = inngest.createFunction(
  { id: "certificate-generate", retries: 3 },
  { event: "certificate/generate" },
  async ({ event, step }) => {
    const { userId, courseId, enrollmentId } = event.data;

    const result = await step.run("generate-and-dispatch-certificate", async () => {
      return await certificateService.generateCertificate(userId, courseId, enrollmentId);
    });

    return result;
  }
);
