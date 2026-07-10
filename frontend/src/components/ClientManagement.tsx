import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ShieldAlert, CheckCircle } from "lucide-react";
import { Client } from "../types";

interface ClientManagementProps {
  token: string;
}

type DeleteClientDialogProps = {
  isOpen: boolean;
  clientName?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export default function ClientManagement({ token }: ClientManagementProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteId,setDeleteId] = useState<string>("")
  const [success, setSuccess] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientName, setEditClientName] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("http://localhost:3000/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newClientName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create client");
      setSuccess("Client added successfully.");
      setNewClientName("");
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
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
        body: JSON.stringify({ name: editClientName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update client");
      setSuccess("Client updated successfully.");
      setEditingClient(null);
      setEditClientName("");
      fetchClients();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:3000/clients/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete client");
      setSuccess("Client deleted successfully.");
      setDeleteId("")
      setIsDeleteOpen(false)
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
          <p className="text-sm text-slate-500 mt-1">Configure global business clients and accounts linked to ticket reporting.</p>
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

      {

<DeleteClientDialog
  isOpen={isDeleteOpen}
  clientName="Acme Corp"
  onClose={() =>{
    setIsDeleteOpen(false)
  }}
  //@ts-ignore
  onConfirm={() => handleDelete()}
/>
      }

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left pane: Client list */}
        <div className="lg:col-span-2">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-3">Seeded/Configured Clients</h3>
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-sm">Loading clients...</div>
          ) : clients.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">No clients registered yet.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-xs overflow-hidden">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5 text-left">Client Name</th>
                    <th className="px-6 py-3.5 text-left">Registered Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {Array.isArray(clients) &&  clients.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{c.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => {
                              setEditingClient(c);
                              setEditClientName(c.name);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded"
                            title="Edit Client"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setIsDeleteOpen(true)
                              setDeleteId(c.id)

                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 border border-slate-200 hover:bg-red-50 rounded"
                            title="Delete Client"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right pane: Create / Edit forms */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl h-fit">
          {editingClient ? (
            <form onSubmit={handleUpdate} className="space-y-4">
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
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClient(null);
                    setEditClientName("");
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
            <form onSubmit={handleCreate} className="space-y-4">
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



const DeleteClientDialog: React.FC<DeleteClientDialogProps> = ({
  isOpen,
  clientName,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900">
          Delete Client
        </h2>

        <p className="mt-3 text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-medium text-gray-900">
            {clientName || "this client"}
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
            Delete Client
          </button>
        </div>
      </div>
    </div>
  );
};
