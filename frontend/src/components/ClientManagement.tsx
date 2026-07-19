import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ShieldAlert, CheckCircle, ChevronDown, ChevronUp, Star, PowerOff } from "lucide-react";
import { Client, Project } from "../types";

interface ClientManagementProps {
  token: string;
}

type DeleteDialogProps = {
  isOpen: boolean;
  title: string;
  itemName?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ClientManagement({ token }: ClientManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // client create/edit
  const [newClientName, setNewClientName] = useState("");
  const [newClientIsKey, setNewClientIsKey] = useState(false);
  const [newClientIsWind, setNewClientIsWind] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [editClientIsKey, setEditClientIsKey] = useState(false);
  const [editClientIsWind, setEditClientIsWind] = useState(false);

  // client delete
  const [deleteClientId, setDeleteClientId] = useState<string>("");
  const [deleteClientName, setDeleteClientName] = useState<string>("");
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState(false);

  // expanded rows (to show/manage projects)
  const [expandedClientId, setExpandedClientId] = useState<string>("");

  // project create (per client)
  const [newProjectName, setNewProjectName] = useState<Record<string, string>>({});
  const [newProjectShutdown, setNewProjectShutdown] = useState<Record<string, boolean>>({});

  // project edit
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectShutdown, setEditProjectShutdown] = useState(false);

  // project delete
  const [deleteProjectId, setDeleteProjectId] = useState<string>("");
  const [deleteProjectName, setDeleteProjectName] = useState<string>("");
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:3000/clients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      setClients(data.data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // ---- Client CRUD ----

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("http://localhost:3000/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newClientName.trim(), isKeyClient: newClientIsKey, isWindClient: newClientIsWind })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create client");
      setSuccess("Client added successfully.");
      setNewClientName("");
      setNewClientIsKey(false);
      setNewClientIsWind(false);
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editClientName.trim()) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/clients/${editingClient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editClientName.trim(), isKeyClient: editClientIsKey, isWindClient: editClientIsWind })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update client");
      setSuccess("Client updated successfully.");
      setEditingClient(null);
      setEditClientName("");
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClient = async () => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/clients/${deleteClientId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete client");
      setSuccess("Client deleted successfully.");
      setDeleteClientId("");
      setIsDeleteClientOpen(false);
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---- Project CRUD ----

  const handleCreateProject = async (clientId: string) => {
    const name = (newProjectName[clientId] || "").trim();
    if (!name) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/clients/${clientId}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, isShutdownJob: !!newProjectShutdown[clientId] })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create project");
      setSuccess("Project added successfully.");
      setNewProjectName((prev) => ({ ...prev, [clientId]: "" }));
      setNewProjectShutdown((prev) => ({ ...prev, [clientId]: false }));
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editProjectName.trim()) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/projects/${editingProject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editProjectName.trim(), isShutdownJob: editProjectShutdown })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update project");
      setSuccess("Project updated successfully.");
      setEditingProject(null);
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteProject = async () => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/projects/${deleteProjectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete project");
      setSuccess("Project deleted successfully.");
      setDeleteProjectId("");
      setIsDeleteProjectOpen(false);
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Clients Management</h1>
          <p className="text-sm text-slate-500 mt-1">Configure global business clients, mark key accounts, and manage each client's projects.</p>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <ShieldAlert size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      <DeleteDialog
        isOpen={isDeleteClientOpen}
        title="Delete Client"
        itemName={deleteClientName}
        onClose={() => setIsDeleteClientOpen(false)}
        onConfirm={handleDeleteClient}
      />

      <DeleteDialog
        isOpen={isDeleteProjectOpen}
        title="Delete Project"
        itemName={deleteProjectName}
        onClose={() => setIsDeleteProjectOpen(false)}
        onConfirm={handleDeleteProject}
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: Client list */}
        <div className="lg:col-span-2">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">Seeded/Configured Clients</h3>
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">No clients registered yet.</div>
          ) : (
            <div className="border border-slate-200/80 rounded-xl shadow-xs overflow-hidden divide-y divide-slate-100">
              {clients.map(c => {
                const isExpanded = expandedClientId === c.id;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <button
                        className="flex items-center gap-2 text-left"
                        onClick={() => setExpandedClientId(isExpanded ? "" : c.id)}
                      >
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                        {c.isKeyClient && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
                            <Star size={10} /> Key Client
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${c.isWindClient ? "bg-sky-50 border-sky-200 text-sky-700" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
                          {c.isWindClient ? "Wind" : "Non-Wind"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {c.projects?.length || 0} project{c.projects?.length === 1 ? "" : "s"}
                        </span>
                      </button>

                      <div className="inline-flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingClient(c);
                            setEditClientName(c.name);
                            setEditClientIsKey(c.isKeyClient);
                            setEditClientIsWind(c.isWindClient);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded"
                          title="Edit Client"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteClientId(c.id);
                            setDeleteClientName(c.name);
                            setIsDeleteClientOpen(true);
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 border border-slate-200 hover:bg-red-50 rounded"
                          title="Delete Client"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-6 pb-5 bg-slate-50/60">
                        {c.projects && c.projects.length > 0 ? (
                          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white mb-3">
                            <table className="min-w-full divide-y divide-slate-100 text-xs">
                              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                <tr>
                                  <th className="px-4 py-2.5 text-left">Project Name</th>
                                  <th className="px-4 py-2.5 text-left">Shutdown Job</th>
                                  <th className="px-4 py-2.5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {c.projects.map(p => (
                                  <tr key={p.id}>
                                    <td className="px-4 py-2.5 font-medium text-slate-800">{p.name}</td>
                                    <td className="px-4 py-2.5">
                                      {p.isShutdownJob ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wide">
                                          <PowerOff size={10} /> Shutdown
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 text-[10px] font-mono">Active</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      <div className="inline-flex gap-2">
                                        <button
                                          onClick={() => {
                                            setEditingProject(p);
                                            setEditProjectName(p.name);
                                            setEditProjectShutdown(p.isShutdownJob);
                                          }}
                                          className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded"
                                          title="Edit Project"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setDeleteProjectId(p.id);
                                            setDeleteProjectName(p.name);
                                            setIsDeleteProjectOpen(true);
                                          }}
                                          className="p-1 text-red-500 hover:text-red-700 border border-slate-200 hover:bg-red-50 rounded"
                                          title="Delete Project"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 py-3">No projects yet for this client.</div>
                        )}

                        {/* Edit project inline form */}
                        {editingProject && c.projects.some(p => p.id === editingProject.id) && (
                          <form onSubmit={handleUpdateProject} className="flex flex-wrap items-end gap-2 mb-3 p-3 bg-white border border-slate-200 rounded-lg">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Project Name</label>
                              <input
                                type="text"
                                value={editProjectName}
                                onChange={(e) => setEditProjectName(e.target.value)}
                                className="text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                                required
                              />
                            </div>
                            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 pb-2">
                              <input
                                type="checkbox"
                                checked={editProjectShutdown}
                                onChange={(e) => setEditProjectShutdown(e.target.checked)}
                              />
                              Shutdown Job
                            </label>
                            <button type="submit" className="px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800">Save</button>
                            <button type="button" onClick={() => setEditingProject(null)} className="px-3 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100">Cancel</button>
                          </form>
                        )}

                        {/* Add project inline form */}
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-1">New Project Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Migration Phase 2"
                              value={newProjectName[c.id] || ""}
                              onChange={(e) => setNewProjectName((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className="text-xs p-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                            />
                          </div>
                          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 pb-2">
                            <input
                              type="checkbox"
                              checked={!!newProjectShutdown[c.id]}
                              onChange={(e) => setNewProjectShutdown((prev) => ({ ...prev, [c.id]: e.target.checked }))}
                            />
                            Shutdown Job
                          </label>
                          <button
                            type="button"
                            onClick={() => handleCreateProject(c.id)}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
                          >
                            <Plus size={14} /> Add Project
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right pane: Create / Edit client forms */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl h-fit">
          {editingClient ? (
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">Edit Client</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Client Name</label>
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 font-medium"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={editClientIsKey}
                  onChange={(e) => setEditClientIsKey(e.target.checked)}
                />
                Key Client
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={editClientIsWind}
                  onChange={(e) => setEditClientIsWind(e.target.checked)}
                />
                Wind Client <span className="font-normal text-slate-400">(unchecked = Non-Wind)</span>
              </label>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClient(null);
                    setEditClientName("");
                    setEditClientIsKey(false);
                    setEditClientIsWind(false);
                  }}
                  className="px-3.5 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateClient} className="space-y-4">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-2">Add New Client</h3>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Client Name</label>
                <input
                  type="text"
                  placeholder="e.g. Wayne Enterprises"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 font-medium"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={newClientIsKey}
                  onChange={(e) => setNewClientIsKey(e.target.checked)}
                />
                Key Client
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={newClientIsWind}
                  onChange={(e) => setNewClientIsWind(e.target.checked)}
                />
                Wind Client <span className="font-normal text-slate-400">(unchecked = Non-Wind)</span>
              </label>
              <p className="text-[11px] text-slate-400">You can add projects for this client after it's created, from the list on the left.</p>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  <Plus size={16} />
                  Add Client
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}



const DeleteDialog: React.FC<DeleteDialogProps> = ({
  isOpen,
  title,
  itemName,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">
          {title}
        </h2>

        <p className="mt-3 text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">
            {itemName || "this item"}
          </span>
          ? This action cannot be undone.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
