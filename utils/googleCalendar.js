import { google } from "googleapis";
import "dotenv/config";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

// Hàm tạo link đăng nhập lần đầu
export const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Quan trọng: để lấy Refresh Token dùng vĩnh viễn
    scope: ["https://www.googleapis.com/auth/calendar"],
    prompt: "consent",
  });
};

// Hàm đổi mã code lấy Token (Chạy sau khi sếp đăng nhập xong)
export const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

// Hàm tạo sự kiện
export const createEvent = async (tokens, eventDetails) => {
  oauth2Client.setCredentials(tokens);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const event = {
    summary: eventDetails.summary,
    description: eventDetails.description || "Được tạo bởi AI D4C",
    start: { dateTime: eventDetails.start_time, timeZone: "Asia/Ho_Chi_Minh" },
    end: {
      dateTime: new Date(
        new Date(eventDetails.start_time).getTime() + 30 * 60000,
      ).toISOString(),
      timeZone: "Asia/Ho_Chi_Minh",
    },
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });
  return res.data.htmlLink;
};
