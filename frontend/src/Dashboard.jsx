
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";


export default function Dashboard() {


  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");


  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    navigate("/admin/login", { replace: true });
  };

  const fetchComplaints = async () => {
    try {
      const token = sessionStorage.getItem("admin_token");

      // console.log("Admin token exists:", Boolean(token));

      if (!token) {
        window.location.href = "/admin/login";
        return;
      }

      const response = await fetch("/api/complaints", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // console.log("Complaints response status:", response.status);

      const responseText = await response.text();

      // console.log("Backend response:", responseText);

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Backend returned invalid JSON: ${responseText}`
        );
      }

      if (!response.ok) {
        throw new Error(data.detail || data.message || "Status update failed");
      }

      // Update dashboard immediately without refreshing
      setComplaints((prevComplaints) =>
        prevComplaints.map((complaint) =>
          complaint.id === complaint.Id
            ? { ...complaint, status: newStatus }
            : complaint
        )
      );

      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch complaints");
      }

      setComplaints(data);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };


  const updateComplaintStatus = async (complaintId, newStatus) => {
    try {
      const token = sessionStorage.getItem("admin_token");

      const response = await fetch(
        `/api/complaints/${complaintId}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to update status");
      }

      // Update the dashboard without refreshing the page
      setComplaints((prevComplaints) =>
        prevComplaints.map((complaint) =>
          complaint.id === complaintId
            ? { ...complaint, status: newStatus }
            : complaint
        )
      );

    } catch (error) {
      console.error("Status update error:", error);
      alert(error.message || "Could not update complaint status");
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // const filteredComplaints = complaints.filter((complaint) => {
  //   const searchText = search.toLowerCase();

  //   const matchesSearch =
  //     (complaint.text || "").toLowerCase().includes(searchText) ||
  //     (complaint.location_raw || "").toLowerCase().includes(searchText);

  //   const matchesLanguage =
  //     language === "all" ||
  //     complaint.language === language;

  //   return matchesSearch && matchesLanguage;
  // });


  const filteredComplaints = complaints;

  const pendingCount = complaints.filter(
    (complaint) =>
      complaint.status === "Pending"
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

        <div className="dashboard-actions">
          <button
            className="refresh-button"
            onClick={fetchComplaints}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh data"}
          </button>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
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

                    <td className="location-cell">
                      <div className="complaint-location">
                        <span className="location-name">
                          {complaint.location_raw || "N/A"}
                        </span>

                        {complaint.landmark && (
                          <span className="landmark-name">
                            {complaint.landmark}
                          </span>
                        )}
                      </div>
                    </td>

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
                      <select
                        className="status-select"
                        value={
                          (complaint.status || "Pending")
                            .toLowerCase()
                            .replace(/_/g, " ") === "pending processing"
                            ? "Pending"
                            : (complaint.status || "Pending")
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())
                        }
                        onChange={(e) =>
                          updateComplaintStatus(complaint.id, e.target.value)
                        }
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
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