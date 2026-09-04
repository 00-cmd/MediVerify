const token = localStorage.getItem("access_token");

if (!token) {
    window.location.href = "index.html";
}


async function loadDashboardStats() {

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/medicines/stats",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {

            if (response.status === 401) {
                localStorage.removeItem("access_token");
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