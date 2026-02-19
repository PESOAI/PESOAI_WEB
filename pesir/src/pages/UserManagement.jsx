import React, { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([
    { id: 1, name: 'Tina M. Ran', email: 'TinaM@example.com', status: 'Active' },
    { id: 2, name: 'Max Verstappen', email: 'MaxV@example.com', status: 'Inactive' },
    { id: 3, name: 'Lando Norris', email: 'lando@mclaren.com', status: 'Active' },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const toggleStatus = (id) => {
    setUsers(users.map(user => {
      if (user.id === id) {
        return {  ...user, 
           status: user.status === 'Active' ? 'Inactive' : 'Active' 
        };
      }
      return user;
    }));
  };

  const deleteUser = (id) => {
    if(window.confirm("Are you sure you want to delete this user?")) {
      setUsers(users.filter(user => user.id !== id));
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 font-sans">
      
      {/* HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">User Management</h1>
          <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Admin Control Panel</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search users..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-slate-300 transition-all text-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* COMPACT TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Full Name</th>
              <th className="px-6 py-4">Email Address</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                  {user.name}
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">
                  {user.email}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleStatus(user.id)}
                    className={`text-[10px] font-black px-3 py-1 rounded-md transition-all uppercase tracking-tighter border ${
                      user.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    }`}
                  >
                    {user.status}
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => deleteUser(user.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-slate-400 text-sm">
            No results matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;