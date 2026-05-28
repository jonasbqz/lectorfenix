import fs from "fs/promises";
import path from "path";

const notificationsFilePath = path.join(process.cwd(), ".next", "notifications.json");

export type NotificationType = "like" | "reply";

export type TriggerNotificationParams = {
  userId: string; // Quien recibe la notificación (dueño del comentario)
  type: NotificationType;
  senderId: string; // Quien realiza la acción
  senderName: string;
  senderAvatar: string | null;
  commentId: string;
  commentContent: string;
  mangaId: string;
  chapterId?: string;
};

export async function triggerNotification({
  userId,
  type,
  senderId,
  senderName,
  senderAvatar,
  commentId,
  commentContent,
  mangaId,
  chapterId,
}: TriggerNotificationParams) {
  // Evitar notificarse a sí mismo
  if (userId === senderId) return;

  try {
    await fs.mkdir(path.dirname(notificationsFilePath), { recursive: true });
    let notifications: any[] = [];
    try {
      const data = await fs.readFile(notificationsFilePath, "utf-8");
      notifications = JSON.parse(data);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }

    const newNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      senderId,
      senderName,
      senderAvatar,
      commentId,
      commentContent: commentContent.length > 50 ? commentContent.substring(0, 47) + "..." : commentContent,
      mangaId,
      chapterId: chapterId || "general",
      read: false,
      createdAt: new Date().toISOString(),
    };

    notifications.push(newNotification);
    await fs.writeFile(notificationsFilePath, JSON.stringify(notifications, null, 2), "utf-8");
    console.log(`[Notification Triggered] Type: ${type}, Recipient: ${userId}, Sender: ${senderName}`);
  } catch (err) {
    console.error("[triggerNotification] Error saving notification:", err);
  }
}
