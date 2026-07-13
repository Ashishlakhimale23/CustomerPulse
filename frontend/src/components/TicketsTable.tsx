import type React from "react";
import { PAGES, type Ticket } from "../types";

type TicketsTableProps = {
    tickets: Ticket[];
    currentView : string,
    setSelectedTicketId: React.Dispatch<React.SetStateAction<string>>;
    setCurrentView: React.Dispatch<React.SetStateAction<string>>;
};

const statusColors: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-purple-50 text-purple-700 border-purple-200",
    PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
    RESOLVED: "bg-green-50 text-green-700 border-green-200",
    CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
};

const priorityColors: Record<string, string> = {
    P1: "bg-red-50 text-red-700 border-red-200",
    P2: "bg-orange-50 text-orange-700 border-orange-200",
    P3: "bg-blue-50 text-blue-700 border-blue-200",
    P4: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function TicketsTable({
    tickets,
    currentView,
    setSelectedTicketId,
    setCurrentView,
}: TicketsTableProps) {
    const openTicket = (ticketId: string) => {
        setSelectedTicketId(ticketId);
        setCurrentView(PAGES.TICKET_DETAILS);
    };

    if (!tickets?.length) {
        return (
            <div className="rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
                No tickets found.
            </div>
        );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Ticket
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Department
                </th>
                
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Priority
                </th>
                {currentView != PAGES.ASSINGED_TICKETS && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                    Assignee
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  Date of Issue
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-t border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-mono font-semibold">
                    {ticket.ticketNumber}
                  </td>

                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate font-medium">
                      {ticket.department?.name}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                        statusColors[ticket.status] ?? statusColors.CLOSED
                      }`}
                    >
                      {ticket.status.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`rounded border px-2 py-1 text-xs font-bold ${
                        priorityColors[ticket.priority] ?? priorityColors.P4
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </td>


                  {currentView != PAGES.ASSINGED_TICKETS && (
                    <td className="px-4 py-3 text-slate-700">
                      {ticket.assignee?.fullName ?? (
                        <span className="italic text-slate-400">
                          Unassigned
                        </span>
                      )}
                    </td>
                  )}

                  <td className="px-4 py-3 text-slate-600">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </td>



                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openTicket(ticket.id)}
                      className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-700"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
}