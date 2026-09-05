const API_URL = "http://127.0.0.1:8000";


// ============================================================
// CHECK LOGIN
// ============================================================

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}


// ============================================================
// LOAD ADMIN DASHBOARD
// ============================================================

async function loadDashboardStats() {

    const errorMessage = document.getElementById("errorMessage");

    try {

        const response = await fetch(
            `${API_URL}/admin/dashboard/stats`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        // ====================================================
        // HANDLE UNAUTHORIZED
        // ====================================================

        if (response.status === 401) {

            localStorage.removeItem("token");

            window.location.href = "index.html";

            return;
        }


        // ====================================================
        // HANDLE FORBIDDEN
        // ====================================================

        if (response.status === 403) {

            errorMessage.textContent =
                "Access denied. Only administrators can access this dashboard.";

            return;
        }


        if (!response.ok) {

            throw new Error(
                "Failed to load dashboard statistics"
            );
        }


        const data = await response.json();


        // ====================================================
        // USERS
        // ====================================================

        document.getElementById("totalUsers").textContent =
            data.users.total;

        document.getElementById("activeUsers").textContent =
            data.users.active;

        document.getElementById("inactiveUsers").textContent =
            data.users.inactive;

        document.getElementById("manufacturers").textContent =
            data.users.manufacturers;

        document.getElementById("chemists").textContent =
            data.users.chemists;

        document.getElementById("admins").textContent =
            data.users.admins;


        // ====================================================
        // MEDICINES
        // ====================================================

        document.getElementById("totalMedicines").textContent =
            data.medicines.total;


        // ====================================================
        // BATCHES
        // ====================================================

        document.getElementById("totalBatches").textContent =
            data.batches.total;

        document.getElementById("activeBatches").textContent =
            data.batches.active;

        document.getElementById("recalledBatches").textContent =
            data.batches.recalled;


        // ====================================================
        // SERIALIZED MEDICINES
        // ====================================================

        document.getElementById("totalSerialized").textContent =
            data.serialized_medicines.total;

        document.getElementById("manufacturedMedicines").textContent =
            data.serialized_medicines.manufactured;


        // ====================================================
        // VERIFICATIONS
        // ====================================================

        document.getElementById("totalVerifications").textContent =
            data.verifications.total;

        document.getElementById("authenticVerifications").textContent =
            data.verifications.authentic;

        document.getElementById("expiredVerifications").textContent =
            data.verifications.expired;

        document.getElementById("recalledVerifications").textContent =
            data.verifications.recalled;

        document.getElementById("invalidVerifications").textContent =
            data.verifications.invalid;


        // ====================================================
        // LIFECYCLE
        // ====================================================

        document.getElementById("totalLifecycle").textContent =
            data.lifecycle.total;

        document.getElementById("manufacturedEvents").textContent =
            data.lifecycle.manufactured;

        document.getElementById("distributedEvents").textContent =
            data.lifecycle.distributed;

        document.getElementById("receivedEvents").textContent =
            data.lifecycle.received;

        document.getElementById("soldEvents").textContent =
            data.lifecycle.sold;


        // ====================================================
        // RECALLS
        // ====================================================

        document.getElementById("totalRecalls").textContent =
            data.recalls.total;

        document.getElementById("activeRecalls").textContent =
            data.recalls.active;

    }

    catch (error) {

        console.error(error);

        errorMessage.textContent =
            "Unable to load dashboard statistics.";
    }
}


// ============================================================
// LOGOUT
// ============================================================

document.getElementById("logoutBtn").addEventListener(
    "click",
    function () {

        localStorage.removeItem("token");

        window.location.href = "index.html";

    }
);


// ============================================================
// START
// ============================================================

loadDashboardStats();