import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { AdminMessage } from "../types";

const API_BASE = "http://localhost:3000";

export const RequesterNotifications = ({ token }: { token: string }) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [open, setOpen] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setMessages(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = messages.filter(m => !m.isRead).length;

  const markRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    } catch {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 cursor-pointer"
      >
        <Bell size={16} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-40 max-h-96 overflow-y-auto">
          <div className="p-3 border-b border-slate-100 font-semibold text-xs text-slate-700">
            Notifications
          </div>
          {messages.length === 0 ? (
            <div className="p-4 text-xs text-slate-400 italic">No messages yet.</div>
          ) : (
            messages.map(m => (
              <div
                key={m.id}
                onClick={() => !m.isRead && markRead(m.id)}
                className={`p-3 border-b border-slate-50 text-xs cursor-pointer ${m.isRead ? "bg-white" : "bg-indigo-50/40"}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-700">{m.fromAdmin?.fullName || "Admin"}</span>
                  <span className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-600">{m.message}</p>
                {!m.isRead && (
                  <span className="text-[9px] font-bold uppercase text-indigo-600 mt-1 block">New</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};