// ManageUsersTable.jsx
import { useState, useMemo } from "react";

export default function ManageUsersTable({ users }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredUsers = useMemo(() => {
    const s = search.toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        u.firstName.toLowerCase().includes(s) ||
        u.lastName.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.dorm || "").toLowerCase().includes(s);

      const matchesRole =
        roleFilter === "all" ||
        u.role.toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  return (
    <div style={{ background: "white", padding: "20px", borderRadius: "8px" }}>
      <h2>Users</h2>

      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        >
          <option value="all">All Roles</option>
          <option value="RA">RA</option>
          <option value="Admin">Admin</option>
        </select>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
              Name
            </th>
            <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
              Email
            </th>
            <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
              Role
            </th>
            <th style={{ padding: "8px", borderBottom: "1px solid #ddd" }}>
              Dorm
            </th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((u) => (
            <tr key={u.id}>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {u.firstName} {u.lastName}
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {u.email}
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {u.role}
              </td>
              <td style={{ padding: "8px", borderBottom: "1px solid #eee" }}>
                {u.dorm || "-"}
              </td>
            </tr>
          ))}

          {filteredUsers.length === 0 && (
            <tr>
              <td
                colSpan={4}
                style={{
                  padding: "12px",
                  textAlign: "center",
                  color: "#777",
                }}
              >
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
