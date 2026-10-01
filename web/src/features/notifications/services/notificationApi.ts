import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import type { AppNotification } from "../type/Notification";

const API_URL = FOCKIS_API_URL;

function getToken(): string | null {
  return localStorage.getItem("token");
}

function authHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export const notificationApi = {
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        method: "GET",
        headers: authHeaders(),
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error("Get notifications failed:", error);
      return [];
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const response = await fetch(
        `${API_URL}/notifications/unread/count`,
        {
          method: "GET",
          headers: authHeaders(),
        },
      );

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();

      return Number(data?.count ?? 0);
    } catch (error) {
      console.error("Unread count failed:", error);
      return 0;
    }
  },

  async markAsRead(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_URL}/notifications/${id}/read`,
        {
          method: "PATCH",
          headers: authHeaders(),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Mark notification as read failed:", error);
      return false;
    }
  },

  async markAllAsRead(): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_URL}/notifications/read/all`,
        {
          method: "PATCH",
          headers: authHeaders(),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Mark all notifications as read failed:", error);
      return false;
    }
  },

  async deleteNotification(id: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_URL}/notifications/${id}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        },
      );

      return response.ok;
    } catch (error) {
      console.error("Delete notification failed:", error);
      return false;
    }
  },
};