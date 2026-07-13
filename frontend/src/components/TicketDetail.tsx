import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle,
  Clock,
  User,
  Users,
  Tag,
  MessageSquare,
  Paperclip,
  TrendingUp,
  RotateCw,
  Plus,
  Trash2,
  Lock,
  ChevronDown,
  Info,
  Tablet
} from "lucide-react";
import { Ticket, Comment, Attachment, Escalation, Keyword, User as UserType, TicketStatus, TicketPriority, SupportLevel, TicketStatusHistory, PAGES } from "../types";
import { userInfo } from "os";
interface metric {
        openTickets : number
        assignedTickets : number,
        slaBreachedTickets : number,
        resolvedTickets : number,
        totalSubmissions : number,
}


interface TicketDetailProps {
  ticketId: string;
  token: string;
  currentUser: UserType;
  setCurrentView : React.Dispatch<React.SetStateAction<string>>,
  onBack: () => void;
  metric : metric
  
}

export default function TicketDetail({ ticketId, token, currentUser, onBack,metric,setCurrentView }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [statusHistories, setStatusHistories] = useState<TicketStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sub-component states
  const [commentText, setCommentText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [attachFileName, setAttachFileName] = useState("");
  const [attachFileUrl, setAttachFileUrl] = useState("");

  // Escalation form
  const [showEscalateForm, setShowEscalateForm] = useState(false);
  const [escalateReason, setEscalateReason] = useState("");
  const [escalateLevel, setEscalateLevel] = useState<string>("");

  // Assign agent form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<UserType[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");

  const isStaff = ["AGENT"].includes(currentUser.role);
  const isdepartmentHeads = ["CXO","HOD"].includes(currentUser.role)
  const isAdmin = ["GLOBAL_ADMIN"].includes(currentUser.role);

  const [sla,setSla] = useState<{
    text: string;
    color: string;
} | null>(null)
  const [tat,setTat] = useState<string | null>(null)

  useEffect(()=>{
    const slar = getSlaStatus()
    setSla(sla)
    const tat = getTurnaroundTime()
    setTat(tat)

  },[])

  const fetchTicketDetails = async () => {
    try {
      setError("");
      // Fetch ticket
      const ticketRes = await fetch(`http://localhost:3000/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!ticketRes.ok) {
        const err = await ticketRes.json();
        throw new Error(err.error || "Failed to load ticket");
      }
      const ticketData = await ticketRes.json();
      setTicket(ticketData);

      // Fetch comments
      const commentsRes = await fetch(`http://localhost:3000/tickets/${ticketId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(commentsData);
      }

      // Fetch attachments
      const attachRes = await fetch(`http://localhost:3000/tickets/${ticketId}/attachments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (attachRes.ok) {
        const attachData = await attachRes.json();
        setAttachments(attachData);
      }

      // Fetch escalations
      const escRes = await fetch(`http://localhost:3000/tickets/${ticketId}/escalations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (escRes.ok) {
        const escData = await escRes.json();
        setEscalations(escData);
      }

      // Fetch status histories if GLOBAL_ADMIN
      if (currentUser.role === "GLOBAL_ADMIN") {
        const statusHistRes = await fetch(`http://localhost:3000/tickets/${ticketId}/status-history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statusHistRes.ok) {
          const statusHistData = await statusHistRes.json();
          setStatusHistories(statusHistData);
        }
      }

      // Fetch agents in the department for manual assignment
      if (isStaff && ticketRes) {
        const agentsRes = await fetch(`http://localhost:3000/users?departmentId=${ticketData.departmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (agentsRes.ok) {
          const agentsData: UserType[] = await agentsRes.json();
          setAvailableAgents(agentsData.filter(u => u.isActive && ["AGENT", "TEAM_LEAD", "MANAGER", "DEPT_MANAGER", "DEPT_ADMIN"].includes(u.role)));
        }
      }


    } catch (err: any) {
      setError(err.message || "Something went wrong while fetching ticket details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
  }, [ticketId]);

  // Action: Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ commentText: commentText.trim(), isInternal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add comment");

      setCommentText("");
      setIsInternal(false);
      // Refresh comments
      fetchTicketDetails();
      setSuccess("Comment posted successfully.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Action: Add Attachment
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attachFileName.trim() || !attachFileUrl.trim()) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/tickets/${ticketId}/attachments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fileName: attachFileName.trim(), fileUrl: attachFileUrl.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add attachment");

      setAttachFileName("");
      setAttachFileUrl("");
      fetchTicketDetails();
      setSuccess("Attachment added successfully.");
    } catch (err: any) {
      setError(err.message);
    }
  };



  // Action: Assign Agent
  const handleAssignAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/tickets/${ticketId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ agentId: selectedAgentId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign agent");

      setShowAssignForm(false);
      fetchTicketDetails();
      setSuccess("Agent assigned successfully.");
      setCurrentView(PAGES.DASHBOARD)
      
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Action: Re-run auto assign
  const handleRerunAutoAssign = async () => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/tickets/${ticketId}/reassign`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger auto routing");

      fetchTicketDetails();
      setSuccess("Auto-assignment sweep executed. Assigned to matching agent.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Action: Escalate Ticket
  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReason.trim()) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/tickets/${ticketId}/escalate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: escalateReason.trim(),
          toLevel: escalateLevel || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to escalate ticket");

      setShowEscalateForm(false);
      setEscalateReason("");
      setEscalateLevel("");
      fetchTicketDetails();
      setSuccess("Ticket escalated and support tier promoted.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Action: Change Status
  const handleStatusChange = async (newStatus: TicketStatus) => {
    
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus,turnOverTime:getTurnaroundTime().seconds })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      // Log action to audit log from frontend
      await fetch("http://localhost:3000/audit-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: `Status changed to ${newStatus} on ${ticket?.ticketNumber}`,
          entityType: "Ticket",
          entityId: ticketId
        })
      });

      fetchTicketDetails();
      setSuccess(`Status changed to ${newStatus}.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Action: Change Priority (Admin Override)
  const handlePriorityChange = async (newPriority: TicketPriority) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ priority: newPriority })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update priority");

      // Log action
      await fetch("http://localhost:3000/audit-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: `Priority overridden to ${newPriority} on ${ticket?.ticketNumber}`,
          entityType: "Ticket",
          entityId: ticketId
        })
      });

      fetchTicketDetails();
      setSuccess(`Priority overridden to ${newPriority}.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Action: Resolve
  const handleResolve = async () => {
    if (ticket && ticket.requesterId === currentUser.id){
      setError("You cant change the resolve your own ticket")
      return
    } 
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/tickets/${ticketId}/resolve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve ticket");

      fetchTicketDetails();
      setSuccess("Ticket resolved successfully.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  

  // Compute countdown client-side
  const getSlaStatus = () => {
    if (!ticket || !ticket.slaDeadline) return null;
    if (ticket.slaBreached) {
      return { text: "Breached", color: "text-red-700 bg-red-100 border-red-300" };
    }
    const diff = new Date(ticket.slaDeadline).getTime() - Date.now();
    if (diff <= 0) {
      return { text: "Breached", color: "text-red-700 bg-red-100 border-red-300" };
    }

    const hours = Math.floor(diff / (3600 * 1000));
    const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));

    if (hours < 2) {
      return { text: `${hours}h ${mins}m left`, color: "text-orange-700 bg-orange-100 border-orange-300 animate-pulse" };
    }
    return { text: `${hours}h ${mins}m left`, color: "text-zinc-700 bg-zinc-100 border-zinc-300" };
  };

  const getTurnaroundTime = () :{display:string,seconds:number} => {
    if (!ticket) return {display : "-",seconds:0};

    const sortedHistories = [...statusHistories].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());

    let totalActiveMs = 0;
    let lastTime = new Date(ticket.createdAt).getTime();
    let runningStatus: string = sortedHistories.length > 0 && sortedHistories[0].fromStatus ? sortedHistories[0].fromStatus : "OPEN";

    const isActiveWorkingStatus = (s: string) => s === "OPEN" || s === "IN_PROGRESS";
    const isResolvedOrClosed = (s: string) => s === "RESOLVED" ;

    for (const h of sortedHistories) {
      const changeTime = new Date(h.changedAt).getTime();
      if (changeTime > lastTime) {
        if (isActiveWorkingStatus(runningStatus)) {
          totalActiveMs += (changeTime - lastTime);
        }
        lastTime = changeTime;
      }
      runningStatus = h.status;
      if (isResolvedOrClosed(runningStatus)) {
        break;
      }
    }

    const isResolved = isResolvedOrClosed(ticket.status) || ticket.resolvedAt;
    const endTime = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() : (isResolved ? new Date(ticket.updatedAt).getTime() : Date.now());

    if (endTime > lastTime && isActiveWorkingStatus(runningStatus)) {
      totalActiveMs += (endTime - lastTime);
    }

    if (totalActiveMs < 0) totalActiveMs = 0;

    const seconds = Math.floor(totalActiveMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remHours = hours % 24;
      return {
        display: `${days}d ${remHours}`,
        seconds: seconds
      };
    } else if (hours > 0) {
      const remMins = minutes % 60;
      return {
        display : `${hours}h ${remMins}m`,
        seconds : seconds
      };
    } else {
      return {
        display : `${Math.max(1,minutes)}m`,
        seconds : seconds
      };
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-zinc-200 p-8 text-center text-sm text-zinc-500">
        Loading ticket records...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-white border border-zinc-200 p-8 text-center text-sm text-red-600">
        Ticket not found or access denied.
      </div>
    );
  }

  const slaStatus = getSlaStatus();

  return (
    <div className="space-y-6">
      {/* Top breadcrumb & back bar */}
      <div className="flex justify-between items-center bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer"
          >
            ← Back to Queue
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-mono font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">{ticket.ticketNumber}</span>
          {ticket.requester?.role === "REQUESTER" && (
            <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-md">
              External Ticket
            </span>
          )}
        </div>

        {/* Action button bar */}
        <div className="flex items-center gap-2">
          {/* Reopen Ticket option for Requesters */}
          {(!isStaff || ticket.requesterId === currentUser.id )&& ["RESOLVED", "CLOSED"].includes(ticket.status) && (
            <button
              onClick={()=>handleStatusChange(TicketStatus.REOPENED)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCw size={14} /> Reopen Ticket
            </button>
          )}

          {isStaff && ticket.requesterId !== currentUser.id && !["RESOLVED", "CLOSED"].includes(ticket.status) && (
            <button
              onClick={()=>handleStatusChange(TicketStatus.RESOLVED)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all duration-200 cursor-pointer"
            >
              Resolve Ticket
            </button>
          )}

          {/* Quick status transitions for Staff */}
          {isStaff && ticket.requesterId !== currentUser.id && !["RESOLVED", "CLOSED"].includes(ticket.status) && (
            <div className="relative inline-block text-left">
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 shadow-xs cursor-pointer transition-all duration-200"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="ON_HOLD">ON-HOLD</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <ShieldAlert size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {/* Main Grid: Ticket Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Central Core: Detail, Comments, Files */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Record Header & Description */}
          <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                  {ticket.department?.name || "No Dept"} • {ticket.category?.name || "General"}
                </span>
                <h1 className="text-xl font-bold text-slate-900 mt-2">{ticket.title}</h1>
              </div>

              {/* Priority Badges */}
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`text-xs font-bold px-2.5 py-1 border font-mono rounded-md ${
                    ticket.priority === "P1"
                      ? "bg-red-50 text-red-800 border-red-200"
                      : ticket.priority === "P2"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : ticket.priority === "P3"
                          ? "bg-slate-100 text-slate-800 border-slate-200"
                          : "bg-slate-50 text-slate-800 border-slate-200"
                  }`}
                >
                  Priority: {ticket.priority}
                </span>

                
              </div>
            </div>

            {/* Description Body */}
            <div className="bg-slate-50/75 border border-slate-100 p-4 mt-4 rounded-xl text-sm text-slate-800 whitespace-pre-wrap min-h-[100px]">
              {ticket.description || <span className="text-slate-400 italic">No description provided.</span>}
            </div>

            {/* Structured ticket metadata */}
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono text-slate-600">
              <div>
                <span className="text-slate-400 block font-sans text-[10px] uppercase font-bold tracking-wider mb-0.5">Representative</span>
                <span className="font-semibold text-slate-900">{ticket.representative || "Unspecified"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[10px] uppercase font-bold tracking-wider mb-0.5">Employee ID</span>
                <span className="font-semibold text-slate-900">{ticket.employeeId || "Unspecified"}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[10px] uppercase font-bold tracking-wider mb-0.5">Client / Company</span>
                <span className="font-semibold text-slate-900">{ticket.clientName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[10px] uppercase font-bold tracking-wider mb-0.5">Client Email</span>
                <span className="font-semibold text-slate-900">{ticket.clientEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[10px] uppercase font-bold tracking-wider mb-0.5">Site / Location</span>
                <span className="font-semibold text-slate-900">{ticket.site}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans text-[10px] uppercase font-bold tracking-wider mb-0.5">Occurred On</span>
                <span className="font-semibold text-slate-900">{new Date(ticket.dateOfOccurance).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Tags area */}
            {ticket.tags && ticket.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-6 pt-4 border-t border-slate-100">
                {Array.isArray(ticket.tags) && ticket.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] px-2.5 py-1 rounded-md font-mono border border-slate-200/60">
                    #{tag}
                  </span> 
                ))}
              </div>
            )}
          </div>

          {/* Comments section */}
          <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <MessageSquare size={16} className="text-slate-500" />
              Comments & Activity
            </h2>

            {/* Comment block forms */}
            {["RESOLVED", "CLOSED"].includes(ticket.status) ? (
              <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2 mb-6 rounded-lg">
                <Lock size={14} />
                Comments are disabled as this ticket is now <strong>{ticket.status}</strong>.
              </div>
            ) : (
              <form onSubmit={handleAddComment} className="mb-6 space-y-3">
                <textarea
                  placeholder="Type a response..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 min-h-[80px] transition-all"
                  required
                />
                <div className="flex justify-between items-center">
                  {/* Internal comment toggle for staff only */}
                  {isStaff  && currentUser.id != ticket.requesterId? (
                    <label className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50/50 px-2.5 py-1.5 rounded-lg border border-amber-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded-md border-amber-300 text-amber-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Internal Work Note</span>
                    </label>
                  ) : (
                    <div />
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 rounded-lg transition-all duration-200 cursor-pointer"
                  >
                    Submit Comment
                  </button>
                </div>
              </form>
            )}

            {/* Comment Thread List */}
            {comments.length === 0 ? (
              <p className="text-zinc-400 italic text-xs text-center py-4">No comments or activity logs yet.</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3.5 border ${
                      comment.isInternal
                        ? "bg-amber-50/70 border-l-4 border-l-amber-500 border-zinc-200"
                        : "bg-white border-zinc-200"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[11px] text-zinc-500 font-mono mb-1.5 pb-1 border-b border-zinc-100">
                      <span className="font-semibold text-zinc-700">
                        {comment.userName}
                        <span className="text-[10px] ml-1.5 text-zinc-400 bg-zinc-100 px-1 border">
                          {comment.userRole}
                        </span>
                      </span>
                      <span>{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-zinc-800 whitespace-pre-wrap">{comment.commentText}</p>
                    {comment.isInternal && (
                      <span className="inline-block mt-2 text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 font-mono border border-amber-200">
                        Internal Work Note - Hidden from Requesters
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div className="bg-white border border-zinc-200 p-6">
            <h2 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-zinc-100 pb-2">
              <Paperclip size={16} />
              Attachments ({attachments.length})
            </h2>

            {/* Create Attachment form or locked notice */}
            {["RESOLVED", "CLOSED"].includes(ticket.status) ? (
              <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2 mb-4 rounded-lg">
                <Lock size={14} />
                Adding attachments is disabled as this ticket is now <strong>{ticket.status}</strong>.
              </div>
            ) : (
              <form onSubmit={handleAddAttachment} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  placeholder="File name (e.g., error_log.txt)"
                  value={attachFileName}
                  onChange={(e) => setAttachFileName(e.target.value)}
                  className="text-xs p-2.5 border border-zinc-300 rounded-none bg-white focus:outline-none focus:border-zinc-500"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste URL (e.g., https://example.com/log)"
                    value={attachFileUrl}
                    onChange={(e) => setAttachFileUrl(e.target.value)}
                    className="w-full text-xs p-2.5 border border-zinc-300 rounded-none bg-white focus:outline-none focus:border-zinc-500"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-[#032d26] hover:bg-[#021f1a] text-white text-xs font-semibold px-3 py-2 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus size={14} /> Link
                  </button>
                </div>
              </form>
            )}

            {/* Attachments List */}
            {attachments.length === 0 ? (
              <p className="text-zinc-400 italic text-xs text-center py-2">No attachments linked to this ticket.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {attachments.map((a) => (
                  <div key={a.id} className="flex justify-between items-center p-2.5 bg-zinc-50 border border-zinc-200">
                    <div className="overflow-hidden">
                      <a
                        href={a.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono font-medium text-[#032d26] hover:underline block truncate"
                      >
                        {a.fileName}
                      </a>
                      <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                        Uploaded by: {a.uploaderName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VIEW: TICKET STATUS HISTORY (GLOBAL ADMIN ONLY) */}
          {isdepartmentHeads && (
            <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Clock size={16} className="text-slate-500" />
                Ticket Status History 
              </h2>
              {statusHistories.length === 0 ? (
                <p className="text-slate-400 italic text-xs text-center py-4">No status changes have been recorded for this ticket.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200/60 rounded-xl overflow-hidden shadow-xs">
                  <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3">Previous State</th>
                        <th className="px-5 py-3">New State</th>
                        <th className="px-5 py-3">Changed By</th>
                        <th className="px-5 py-3">Date / Time (Local)</th>
                        <th className="px-5 py-3">Activity / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                      {statusHistories.map((hist) => (
                        <tr key={hist.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-mono">
                            {hist.fromStatus ? (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hist.fromStatus === "OPEN" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                hist.fromStatus === "IN_PROGRESS" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                                hist.fromStatus === "PENDING" ? "bg-yellow-50 text-yellow-700 border border-yellow-100" :
                                hist.fromStatus === "RESOLVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                "bg-slate-50 text-slate-700 border border-slate-100"
                              }`}>
                                {hist.fromStatus}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">— Initial</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              
                              hist.status === "OPEN" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                              hist.status === "IN_PROGRESS" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" :
                              hist.status === "PENDING" ? "bg-yellow-50 text-yellow-700 border border-yellow-100" :
                              hist.status === "RESOLVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              "bg-slate-50 text-slate-700 border border-slate-100"
                            }`}>
                              {hist.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-800">{hist.changedBy.fullName || "System"}</div>
                            {hist.changerEmail && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{hist.changerEmail}</div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-500">
                            {new Date(hist.changedAt).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-600 max-w-xs break-words">
                            {hist.note || "No comments or details provided."}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Metadata and Assignments Panel */}
        <div className="space-y-6">
          {/* Status & SLA Indicators */}
          <div className="bg-white border border-zinc-200 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Status & SLA Summary</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">Status</span>
                <span
                  className={`inline-block text-xs font-bold px-2 py-0.5 ${
                      ticket.status === "OPEN"
                        ? "bg-blue-100 text-blue-800"
                        : ticket.status === "IN_PROGRESS"
                          ? "bg-indigo-100 text-indigo-800"
                          : ticket.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : ticket.status === "RESOLVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">Support Tier</span>
                <span className="inline-block text-xs font-bold bg-zinc-100 text-zinc-800 border px-2 py-0.5 font-mono">
                  {ticket.supportLevel || "L1"}
                </span>
              </div>
            </div>

            {/* SLA countdown clock */}
            {ticket.slaDeadline && ticket.status !=  "RESOLVED" ? (
              <div className="pt-3 border-t border-zinc-100">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1 flex items-center gap-1">
                  <Clock size={11} /> SLA Deadline
                </span>
                <div className={`p-2 border text-xs font-mono font-semibold ${slaStatus?.color || ""}`}>
                  {slaStatus?.text}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                  Deadline: {new Date(ticket.slaDeadline).toLocaleString()}
                </span>
              </div>
            ):null}

            {/* Turnaround Time (TAT) */}
            <div className="pt-3 border-t border-zinc-100">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1 flex items-center gap-1">
                <Clock size={11} /> Turnaround Time (TAT)
              </span>
              <div className="p-2 border border-zinc-200 bg-zinc-50 text-xs font-mono font-semibold text-zinc-800">
                {getTurnaroundTime().display} {["RESOLVED", "CLOSED"].includes(ticket.status) ? "(Resolved)" : "(Active)"}
              </div>
              <span className="text-[10px] text-zinc-400 font-mono mt-1 block">
                Excludes time spent on hold (Pending)
              </span>
            </div>

          </div>

          {/* People & Assignment Control panel */}
          <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <User size={16} className="text-slate-500" />
              People & Assignment
            </h2>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                  {ticket.requester?.fullName ? ticket.requester.fullName[0].toUpperCase() : "U"}
                </div>
                <div className="text-xs">
                  <span className="text-slate-400 block font-medium">Requester / Employee</span>
                  <span className="font-bold text-slate-800">{ticket.requester?.fullName || "System User"}</span>
                  <span className="text-slate-400 block font-mono text-[10px]">{ticket.requester?.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-800 font-bold text-xs shrink-0">
                  {ticket.assignee?.fullName ? ticket.assignee.fullName[0].toUpperCase() : "?"}
                </div>
                <div className="text-xs flex-1">
                  <span className="text-slate-400 block font-medium">Assigned Support Agent</span>
                  {ticket.assignee ? (
                    <div>
                      <span className="font-bold text-slate-800">{ticket.assignee.fullName}</span>
                      <span className="text-slate-400 block font-mono text-[10px]">Level: {ticket.assignee.supportLevel || "L1"}</span>
                      {ticket.assignmentMethod && (
                        <span className="inline-block bg-slate-100 border border-slate-200 rounded text-[9px] font-mono px-1.5 mt-1 text-slate-500">
                          Routed: {ticket.assignmentMethod}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-amber-600 font-medium italic block mt-0.5">Currently Unassigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Staff Assignment actions or locked notice */}
            {isStaff && currentUser.id == ticket.assigneeId && (
              ["RESOLVED", "CLOSED"].includes(ticket.status) ? (
                <div className="p-3 flex   bg-slate-50 border border-slate-200 text-slate-500 text-xs items-center gap-2 mt-3 rounded-lg">
                  <Lock size={20} />
                  Assignment modifications are disabled as this ticket is now <strong>{ticket.status}</strong>.
                </div>
              ) : (
               metric.assignedTickets >= 3 && !ticket.slaBreached && !ticket.escalatedToId  ? (
               <div className="pt-3 border-t border-slate-100  space-y-2 w-full">
                <div className="flex w-full">
                    <button
                      onClick={() => setShowAssignForm(!showAssignForm)}
                      className="flex justify-center w-full items-center gap-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs py-2 rounded-lg cursor-pointer font-semibold transition-colors"
                    >
                      Manual Assign
                    </button>
                  </div>

                  {/* Agent Selector form dropdown */}
                  {showAssignForm && (
                    <form onSubmit={handleAssignAgent} className="p-3 bg-slate-50 border border-slate-100 rounded-xl mt-2 space-y-2.5">
                      <label className="block text-[10px] font-mono font-bold uppercase text-slate-500">Select Available Agent</label>
                      <select
                        value={selectedAgentId}
                        onChange={(e) => setSelectedAgentId(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        required
                      >
                        <option value="">-- Choose Agent --</option>
                        {availableAgents.filter(agent => agent.id !== currentUser.id).map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.fullName} ({agent.role} - {agent.supportLevel || "L1"})
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="w-full bg-slate-900 text-white text-xs py-2 rounded-lg font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Confirm Assignment
                      </button>
                    </form>
                  )}
                </div> 
              ) : (<div></div>)
            ))}
          </div>

          
          
          {/* Escalation Control (Staff/Admin only - disallowed after resolution) */}
          {isStaff && ticket.slaBreached &&  !["RESOLVED"].includes(ticket.status) && (
            <div className="bg-white border border-zinc-200 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Support Escalations</h2>

              <button
                onClick={() => setShowEscalateForm(!showEscalateForm)}
                className="w-full bg-[#032d26] hover:bg-[#021f1a] text-white text-xs font-semibold py-2 cursor-pointer flex justify-center items-center gap-1"
              >
                <TrendingUp size={14} /> Promote support Tier
              </button>

              {showEscalateForm && (
                <form onSubmit={handleEscalate} className="p-3 bg-zinc-50 border border-zinc-200 space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-zinc-600 mb-1">Target Tier (Optional)</label>
                    <select
                      value={escalateLevel}
                      onChange={(e) => setEscalateLevel(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-300 bg-white"
                    >
                      <option value="">-- Next Tier --</option>
                      <option value="L1">L1 Support</option>
                      <option value="L2">L2 Senior Support</option>
                      <option value="L3">L3 Specialist Tier</option>
                      <option value="L4">L4 Executive Tier</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-zinc-600 mb-1">Justification Reason</label>
                    <textarea
                      placeholder="Why are you escalating this case?"
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      className="w-full text-xs p-2 border border-zinc-300 bg-white"
                      rows={2}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-red-700 hover:bg-red-800 text-white text-xs py-1.5 font-semibold cursor-pointer"
                  >
                    Confirm Escalation
                  </button>
                </form>
              )}

              {/* History Timeline */}
              {escalations.length > 0 && (
                <div className="pt-3 border-t border-zinc-100 space-y-3">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">Escalation History</span>
                  <div className="space-y-3.5 pl-2 border-l border-zinc-200">
                    {escalations.map((esc) => (
                      <div key={esc.id} className="text-[11px] relative">
                        <span className="absolute -left-[13px] top-1 w-2.5 h-2.5 bg-red-600 rounded-full border-2 border-white" />
                        <div className="font-mono text-zinc-500 flex justify-between">
                          <span>
                            Tier: <strong className="text-red-700">{esc.fromLevel || "L1"} → {esc.toLevel}</strong>
                          </span>
                          <span>{new Date(esc.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-zinc-700 font-medium mt-0.5">{esc.reason}</p>
                        <span className="text-[10px] text-zinc-400 font-mono block">
                          Escalated by: {esc.escalatedByName || "System"} to {esc.escalatedToName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show escalation history even if resolved, without promote button */}
          {isStaff && ["RESOLVED"].includes(ticket.status) && escalations.length > 0 && (
            <div className="bg-white border border-zinc-200 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Support Escalations (Closed)</h2>
              <div className="space-y-3.5 pl-2 border-l border-zinc-200">
                {escalations.map((esc) => (
                  <div key={esc.id} className="text-[11px] relative">
                    <span className="absolute -left-[13px] top-1 w-2.5 h-2.5 bg-slate-400 rounded-full border-2 border-white" />
                    <div className="font-mono text-zinc-500 flex justify-between">
                      <span>
                        Tier: <strong className="text-slate-700">{esc.fromLevel || "L1"} → {esc.toLevel}</strong>
                      </span>
                      <span>{new Date(esc.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-zinc-700 font-medium mt-0.5">{esc.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}