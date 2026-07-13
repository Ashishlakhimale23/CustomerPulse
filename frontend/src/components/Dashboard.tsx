import React, { useEffect, useState } from "react";
import { Plus,Inbox,User,CheckCircle,Clock,Layers } from "lucide-react";
import { PAGES, Ticket, User as UserType, metric } from "../types";


export const Dashboard = ({setCurrentView,user,setSelectedTicketId,token,metric}:{
    setCurrentView : React.Dispatch<React.SetStateAction<string>>
    user:UserType,
    setSelectedTicketId:React.Dispatch<React.SetStateAction<string>>
    token:string
    metric : metric
}) => {
    const [tickets,setTickets] = useState<Ticket[]>([])

    const isStaff = user ? ["AGENT"].includes(user.role) : false;
    const isAdmin = user ? ["GLOBAL_ADMIN","HOD","CXO"].includes(user.role) : false;

    const fetchTickets = async () => {
    try {
      let deptId 
      if (isStaff && !isAdmin && user?.departmentId) {
        deptId = user.departmentId;
      }

      let url = `http://localhost:3000/tickets`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.items);
      }
      
    } catch (err) {}
  };
    return (
         <div className="space-y-6 font-sans">
              {/* Top Banner section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xs">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ticket Operations Dashboard</h1>
                  <p className="text-sm text-slate-500 mt-1">
                    System health indicators and support queue metrics for <strong className="text-slate-900">{user.fullName}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView(PAGES.NEW_TICKET)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 cursor-pointer flex items-center gap-2 rounded-lg transition-all shadow-xs"
                >
                  <Plus size={16} />
                  Submit New Ticket
                </button>
              </div>

              {/* Bento Indicator count cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {isStaff ? (
                  <>
                    {/* STAFF / ADMIN VIEW CARDS */}
                    <div 
                      onClick={() => {
                        setCurrentView(PAGES.MY_TICKETS);
                      }}
                      className="bg-white border border-slate-200 hover:border-slate-400 shadow-xs rounded-2xl p-6 flex items-center justify-between cursor-pointer transition-all duration-200 group"
                    >
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">My Tickets</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 mt-1 group-hover:text-black transition-colors">{metric?.openTickets}</h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Active, unresolved cases</p>
                      </div>
                      <span className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-150 group-hover:bg-slate-100 group-hover:text-slate-900 transition-all">
                        <Inbox size={24} />
                      </span>
                    </div>

                    <div 
                      onClick={() => {
                        
                        setCurrentView(PAGES.ASSINGED_TICKETS);
                      }}
                      className="bg-white border border-slate-200 hover:border-slate-400 shadow-xs rounded-2xl p-6 flex items-center justify-between cursor-pointer transition-all duration-200 group"
                    >
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">Personal Workload</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 mt-1 group-hover:text-black transition-colors">{metric?.assignedTickets}</h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Cases assigned to you</p>
                      </div>
                      <span className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-150 group-hover:bg-slate-100 group-hover:text-slate-900 transition-all">
                        <User size={24} />
                      </span>
                    </div>

                    <div 
                      onClick={() => {
                        
                        setCurrentView(PAGES.BREACHED_TICKETS);
                      }}
                      className="bg-white border border-slate-200 hover:border-red-400 shadow-xs rounded-2xl p-6 flex items-center justify-between cursor-pointer transition-all duration-200 group"
                    >
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">SLA Breach Alerts</span>
                        {/* COLOR AS INDICATOR: RED text indicating breached SLAs */}
                        <h2 className="text-3xl font-extrabold text-rose-600 mt-1 group-hover:text-rose-700 transition-colors flex items-center gap-2">
                          {metric?.slaBreachedTickets}
                          {metric?.slaBreachedTickets! > 0 && (
                            <span className="inline-flex w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                          )}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Past deadline / Breached state</p>
                      </div>
                      <span className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 group-hover:bg-rose-100 group-hover:text-rose-700 transition-all">
                        <Clock size={24} />
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* REQUESTER VIEW CARDS */}
                    <div 
                      onClick={() => {
                        setCurrentView(PAGES.MY_TICKETS);
                      }}
                      className="bg-white border border-slate-200 hover:border-slate-400 shadow-xs rounded-2xl p-6 flex items-center justify-between cursor-pointer transition-all duration-200 group"
                    >
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">My Active Tickets</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 mt-1 group-hover:text-black transition-colors">
                           {metric?.openTickets}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Unresolved support requests</p>
                      </div>
                      <span className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-150 group-hover:bg-slate-100 group-hover:text-slate-900 transition-all">
                        <Inbox size={24} />
                      </span>
                    </div>

                    <div 
                      onClick={() => {
                        setCurrentView(PAGES.RESOLVED_TICKETS);
                      }}
                      className="bg-white border border-slate-200 hover:border-emerald-400 shadow-xs rounded-2xl p-6 flex items-center justify-between cursor-pointer transition-all duration-200 group"
                    >
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">Resolved Tickets</span>
                        {/* COLOR AS INDICATOR: EMERALD text indicating resolved status */}
                        <h2 className="text-3xl font-extrabold text-emerald-600 mt-1 group-hover:text-emerald-700 transition-colors">
                          {metric?.resolvedTickets}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Completed / Solved issues</p>
                      </div>
                      <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-all">
                        <CheckCircle size={24} />
                      </span>
                    </div>

                    <div 
                      onClick={() => {
                        setCurrentView(PAGES.ON_HOLD);
                      }}
                      className="bg-white border border-slate-200 hover:border-slate-400 shadow-xs rounded-2xl p-6 flex items-center justify-between cursor-pointer transition-all duration-200 group"
                    >
                      <div>
                        <span className="text-xs text-slate-400 uppercase font-mono font-bold tracking-wider">ON HOLD</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 mt-1 group-hover:text-black transition-colors">
                            {metric?.onhold}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Tickects put on hold for some reason</p>
                      </div>
                      <span className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-150 group-hover:bg-slate-100 group-hover:text-slate-900 transition-all">
                        <Layers size={24} />
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Quick Ticket List Table */}
              <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6">

                
             <div className="py-8 text-center text-slate-400 text-sm">More features will be added soon</div>
                  
              </div>
            </div>
    )
}
