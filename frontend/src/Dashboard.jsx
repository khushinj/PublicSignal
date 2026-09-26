
import { useEffect, useState } from "react";
import "./Dashboard.css";

export default function Dashboard() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");

  const fetchComplaints = async () => {
    try {
      const token = sessionStorage.getItem("admin_token");

      const response = await fetch("/api/complaints", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      console.log("Complaints received:", data);

      setComplaints(data);
    } catch (error) {
      console.error("Error loading complaints:", error);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const filteredComplaints = complaints.filter((complaint) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      (complaint.text || "").toLowerCase().includes(searchText) ||
      (complaint.location_raw || "").toLowerCase().includes(searchText);

    const matchesLanguage =
      language === "all" ||
      complaint.language === language;

    return matchesSearch && matchesLanguage;
  });

  const pendingCount = complaints.filter(
    (complaint) =>
      complaint.status === "pending_processing"
  ).length;

  const hindiCount = complaints.filter(
    (complaint) => complaint.language === "hindi"
  ).length;

  const marathiCount = complaints.filter(
    (complaint) => complaint.language === "marathi"
  ).length;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">PUBLICSIGNAL / ADMIN</p>
          <h1>Dashboard</h1>
          <p className="dashboard-subtitle">
            An overview of citizen-reported infrastructure issues.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchComplaints}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh data"}
        </button>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <p>Total complaints</p>
          <h2>{complaints.length}</h2>
          <span>All submitted reports</span>
        </div>

        <div className="stat-card">
          <p>Pending processing</p>
          <h2>{pendingCount}</h2>
          <span>Awaiting classification</span>
        </div>

        <div className="stat-card">
          <p>Hindi reports</p>
          <h2>{hindiCount}</h2>
          <span>Submitted in Hindi</span>
        </div>

        <div className="stat-card">
          <p>Marathi reports</p>
          <h2>{marathiCount}</h2>
          <span>Submitted in Marathi</span>
        </div>
      </section>

      <section className="complaints-section">
        <div className="table-heading">
          <div>
            <h2>Citizen complaints</h2>
            <p>
              {filteredComplaints.length} reports displayed
            </p>
          </div>
        </div>

        <div className="table-filters">
          <input
            type="text"
            placeholder="Search complaint or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="all">All languages</option>
            <option value="hindi">Hindi</option>
            <option value="marathi">Marathi</option>
          </select>
        </div>

        {error && (
          <div className="dashboard-error">
            {error}
            <button onClick={fetchComplaints}>
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <p className="dashboard-message">
            Loading complaints...
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Location</th>
                  <th>Language</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td className="complaint-text">
                      {complaint.text}
                    </td>

                    <td>{complaint.location_raw}</td>

                    <td>
                      <span className="language-tag">
                        {complaint.language}
                      </span>
                    </td>

                    <td>
                      {complaint.timestamp
                        ? new Date(
                          complaint.timestamp
                        ).toLocaleDateString()
                        : "N/A"}
                    </td>

                    <td>
                      <span className="status-tag">
                        {complaint.status || "pending"}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredComplaints.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      {complaints.length === 0
                        ? "No complaints have been submitted yet."
                        : "No complaints match your search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}