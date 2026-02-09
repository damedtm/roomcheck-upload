// ViewUploads.jsx

export default function ViewUploads({
  uploads,
  search,
  setSearch,
  selectedDorm,
  setSelectedDorm,
  page,
  setPage,
  PER_PAGE,
  DORMS
}) {
  const searchLower = search.toLowerCase();

  const filtered = uploads.filter((u) => {
    const fields = [
      u.uploadedByName,
      u.dorm,
      u.room,
      u.residentName,
      u.residentEmail,
      u.notes
    ];
    return fields.some((f) => f?.toLowerCase().includes(searchLower));
  });

  const dormFiltered =
    selectedDorm === "All"
      ? filtered
      : filtered.filter((u) => u.dorm === selectedDorm);

  const paginated = dormFiltered.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );

  return (
    <div style={{ background: "white", padding: 20, borderRadius: 8 }}>
      <h2>Dorm Reports</h2>

      {/* Search + Dorm Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          placeholder="Search by RA, dorm, room, resident, notes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ flex: 1, padding: 10 }}
        />

        <select
          value={selectedDorm}
          onChange={(e) => {
            setSelectedDorm(e.target.value);
            setPage(1);
          }}
          style={{ padding: 10 }}
        >
          <option value="All">All Dorms</option>
          {DORMS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: "0 8px"
        }}
      >
        <thead>
          <tr>
            <th>Image</th>
            <th>RA</th>
            <th>Dorm</th>
            <th>Room</th>
            <th>Resident</th>
            <th>Status</th>
            <th>Issues</th>
            <th>Notes</th>
            <th>Uploaded</th>
          </tr>
        </thead>

        <tbody>
          {paginated.map((u, index) => (
            <tr key={index} style={{ background: "#fafafa" }}>
              <td style={{ padding: 10 }}>
                {u.imageUrl && (
                  <img
                    src={u.imageUrl}
                    alt="preview"
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 6
                    }}
                  />
                )}
              </td>

              <td>{u.uploadedByName}</td>
              <td>{u.dorm}</td>
              <td>{u.room}</td>

              <td>
                {u.residentName}
                <br />
                <small>{u.residentEmail}</small>
                <br />
                <small>{u.residentJNumber}</small>
              </td>

              <td>{u.inspectionStatus}</td>

              <td>
                {u.maintenanceIssues.length === 0
                  ? "None"
                  : u.maintenanceIssues.join(", ")}
              </td>

              <td>{u.notes}</td>

              <td>{new Date(u.uploadedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ marginTop: 20 }}>
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          style={{ marginRight: 10 }}
        >
          Previous
        </button>

        <button
          disabled={page * PER_PAGE >= dormFiltered.length}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
