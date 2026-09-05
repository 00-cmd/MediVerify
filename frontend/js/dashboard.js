const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}


async function loadDashboardStats() {

    try {

        const response = await fetch(
            `${API_URL}/medicines/stats`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {

            if (response.status === 401) {
                localStorage.removeItem("token");
                window.location.href = "index.html";
                return;
            }

            throw new Error("Failed to load dashboard statistics");
        }

        const data = await response.json();

        document.getElementById("totalMedicines").textContent =
            data.total_medicines;

        document.getElementById("totalBatches").textContent =
            data.total_batches;

        document.getElementById("totalSerialized").textContent =
            data.total_serialized;

        document.getElementById("activeBatches").textContent =
            data.active_batches;

    } catch (error) {

        console.error("Dashboard error:", error);

    }
}


loadDashboardStats();