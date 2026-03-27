import { google } from "googleapis";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function getTasksClient() {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    throw new Error("Unauthorized");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: session.accessToken,
  });

  return google.tasks({ version: "v1", auth: oauth2Client });
}
