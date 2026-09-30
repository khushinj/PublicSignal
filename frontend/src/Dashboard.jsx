
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./Dashboard.css";


export default function Dashboard() {


  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [language, setLanguage] = useState("all");
  const [hotspots, setHotspots] = useState([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(true);

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

      setComplaints(data.complaints || []);
    } catch (error) {
      console.error("Error fetching complaints:", error);
    } finally {
      setLoading(false);
    }
  };


  const fetchHotspots = async () => {
    try {
      const token = sessionStorage.getItem("admin_token");

      if (!token) {
        return;
      }

      const response = await fetch("/api/analytics/hotspots", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log(data)
      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch hotspots");
      }

      setHotspots(data.hotspots || []);
    } catch (error) {
      console.error("Error fetching hotspots:", error);
    } finally {
      setHotspotsLoading(false);
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
    fetchHotspots();
  }, []);


  const filteredComplaints = complaints.filter((complaint) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      String(complaint.id || "")
        .toLowerCase()
        .includes(searchText) ||
      (complaint.text || "")
        .toLowerCase()
        .includes(searchText) ||
      (complaint.location_raw || "")
        .toLowerCase()
        .includes(searchText) ||
      (complaint.landmark || "")
        .toLowerCase()
        .includes(searchText);

    const matchesLanguage =
      language === "all" ||
      (complaint.language || "").toLowerCase() ===
      language.toLowerCase();

    return matchesSearch && matchesLanguage;
  });


  // const filteredComplaints = complaints;

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


  const getHotspotColor = (hotspot) => {
    if ((hotspot.high_severity || 0) > 0) {
      return "#dc2626";
    }

    if ((hotspot.complaint_count || 0) >= 5) {
      return "#ea580c";
    }

    return "#f59e0b";
  };

  const getHotspotRadius = (hotspot) => {
    const count = hotspot.complaint_count || 0;

    return Math.min(30, Math.max(10, 8 + count * 2));
  };

  const maxHotspotComplaints = Math.max(
    ...hotspots.map((hotspot) => hotspot.complaint_count || 0),
    1
  );

  const priorityHotspots = hotspots
    .map((hotspot) => {
      const complaintCount = hotspot.complaint_count || 0;
      const highSeverity = hotspot.high_severity || 0;

      const volumeScore =
        (complaintCount / maxHotspotComplaints) * 60;

      const severityRatio =
        complaintCount > 0
          ? highSeverity / complaintCount
          : 0;

      const severityScore = severityRatio * 40;

      const priorityScore = Math.round(
        volumeScore + severityScore
      );

      return {
        ...hotspot,
        priority_score: priorityScore,
      };
    })
    .sort(
      (a, b) =>
        b.priority_score - a.priority_score
    );

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
          <p>Pending</p>
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

      <section className="hotspots-section">
        <div className="table-heading">
          <div>
            <h2>Civic issue hotspots</h2>
            <p>
              Areas with multiple reported infrastructure issues within 1 km.
            </p>
          </div>
        </div>

        {hotspotsLoading ? (
          <p className="dashboard-message">
            Loading hotspots...
          </p>
        ) : hotspots.length === 0 ? (
          <p className="dashboard-message">
            No hotspots detected yet.
          </p>
        ) : (
          <div className="hotspot-map-wrapper">
            <div className="hotspot-summary">
              <div className="hotspot-summary-card">
                <span>Hotspots</span>
                <strong>{hotspots.length}</strong>
              </div>

              <div className="hotspot-summary-card">
                <span>Reports in hotspots</span>
                <strong>
                  {hotspots.reduce(
                    (total, hotspot) => total + (hotspot.complaint_count || 0),
                    0
                  )}
                </strong>
              </div>

              <div className="hotspot-summary-card">
                <span>High severity</span>
                <strong>
                  {hotspots.reduce(
                    (total, hotspot) => total + (hotspot.high_severity || 0),
                    0
                  )}
                </strong>
              </div>
            </div>

            <div className="hotspot-legend">
              <span className="legend-title">Map legend</span>

              <span className="legend-item">
                <span className="legend-dot high"></span>
                High severity
              </span>

              <span className="legend-item">
                <span className="legend-dot multiple"></span>
                Multiple reports
              </span>

              <span className="legend-item">
                <span className="legend-dot emerging"></span>
                Emerging hotspot
              </span>
            </div>

            <MapContainer
              center={[19.076, 72.8777]}
              zoom={11}
              className="hotspot-map"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attribution/">CARTO</a>'
                url="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_44mo_1_b55d330c46d5f98f24d57eba"
                maxZoom={20}
              />

              {hotspots.map((hotspot, index) => (
                <CircleMarker
                  key={`${hotspot.latitude}-${hotspot.longitude}-${index}`}
                  center={[hotspot.latitude, hotspot.longitude]}
                  radius={getHotspotRadius(hotspot)}
                  pathOptions={{
                    color: getHotspotColor(hotspot),
                    fillColor: getHotspotColor(hotspot),
                    fillOpacity: 0.45,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="hotspot-popup">
                      <h3>Civic issue hotspot</h3>

                      <div className="hotspot-popup-stat">
                        <span>Reports</span>
                        <strong>{hotspot.complaint_count || 0}</strong>
                      </div>

                      <div className="hotspot-popup-stat">
                        <span>High severity</span>
                        <strong>{hotspot.high_severity || 0}</strong>
                      </div>

                      <div className="hotspot-popup-row">
                        <span>Categories</span>
                        <p>
                          {Object.entries(hotspot.categories || {})
                            .map(([category, count]) => `${category} (${count})`)
                            .join(", ") || "No category data"}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>

            <section className="priority-section">
              <div className="priority-heading">
                <div>
                  <h2>Priority locations</h2>
                  <p>
                    Areas ranked using complaint concentration and severity.
                  </p>
                </div>
              </div>

              <div className="priority-list">
                {priorityHotspots.map((hotspot, index) => (
                  <div
                    className="priority-item"
                    key={`${hotspot.latitude}-${hotspot.longitude}-${index}`}
                  >
                    <div className="priority-rank">
                      {index + 1}
                    </div>

                    <div className="priority-main">
                      <div className="priority-title-row">
                        <h3>
                          Civic hotspot {index + 1}
                        </h3>

                        <span className="priority-score">
                          {hotspot.priority_score}/100
                        </span>
                      </div>

                      <p className="priority-details">
                        {hotspot.complaint_count || 0} reports
                        {" · "}
                        {hotspot.high_severity || 0} high-severity
                        {" · "}
                        {Object.entries(hotspot.categories || {})
                          .map(([category, count]) => `${category} (${count})`)
                          .join(", ") || "No category data"}
                      </p>

                      <p className="priority-reason">
                        Priority is driven by complaint concentration
                        and reported severity.
                      </p>
                    </div>
                  </div>
                ))}

                {priorityHotspots.length === 0 && (
                  <p className="priority-empty">
                    No hotspot data available yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
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
                  <th>Complaint No.</th>
                  <th>Complaint</th>
                  <th>Audio</th>
                  <th>Location</th>
                  <th>Language</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredComplaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td className="complaint-number">
                      {complaint.id || "N/A"}
                    </td>

                    <td className="complaint-text">
                      {complaint.text}
                    </td>

                    <td className="audio-cell">
                      {complaint.audio_url ? (
                        <audio
                          controls
                          preload="none"
                          src={complaint.audio_url}
                          style={{ width: "220px" }}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      ) : (
                        <span>No recording</span>
                      )}
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
                    <td colSpan="7" className="empty-state">
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