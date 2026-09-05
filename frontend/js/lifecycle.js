const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}

// ============================================================
// ELEMENTS
// ============================================================

const medicineSelect =
document.getElementById("medicineSelect");

const eventSection =
document.getElementById("eventSection");

const historySection =
document.getElementById("historySection");

const eventType =
document.getElementById("eventType");

const locationInput =
document.getElementById("location");

const notesInput =
document.getElementById("notes");

const addEventBtn =
document.getElementById("addEventBtn");

const eventMessage =
document.getElementById("eventMessage");

const lifecycleHistory =
document.getElementById("lifecycleHistory");

// ============================================================
// LOAD SERIALIZED MEDICINES
// ============================================================

async function loadSerializedMedicines() {

    try {

        const batchResponse = await fetch(
            `${API_URL}/batches/`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        if (!batchResponse.ok) {

            if (batchResponse.status === 401) {

                localStorage.removeItem(
                    "token"
                );

                window.location.href =
                    "index.html";

                return;
            }

            throw new Error(
                "Failed to load batches"
            );
        }


        const batches =
            await batchResponse.json();


        medicineSelect.innerHTML =
            `<option value="">
                Select serialized medicine
            </option>`;


        for (const batch of batches) {

            const response = await fetch(
                `${API_URL}/batches/${batch.id}/serialized`,
                {
                    method: "GET",

                    headers: {
                        "Authorization":
                            `Bearer ${token}`
                    }
                }
            );


            if (!response.ok) {
                continue;
            }


            const medicines =
                await response.json();


            medicines.forEach(function (medicine) {

                const option =
                    document.createElement("option");


                option.value =
                    medicine.id;


                option.textContent =
                    `${medicine.serial_number} — Batch ${batch.batch_number}`;


                medicineSelect.appendChild(
                    option
                );

            });

        }


    } catch (error) {

        console.error(
            "Loading medicines error:",
            error
        );

        medicineSelect.innerHTML =
            `<option value="">
                Could not load medicines
            </option>`;
    }
}

// ============================================================
// SELECT MEDICINE
// ============================================================

medicineSelect.addEventListener(
"change",
function () {

    const medicineId =
        medicineSelect.value;


    if (!medicineId) {

        eventSection.style.display =
            "none";

        historySection.style.display =
            "none";

        return;
    }


    eventSection.style.display =
        "block";

    historySection.style.display =
        "block";


    loadLifecycleHistory(
        medicineId
    );

}
);

// ============================================================
// ADD LIFECYCLE EVENT
// ============================================================

addEventBtn.addEventListener(
"click",
async function () {

    const medicineId =
        medicineSelect.value;


    if (!medicineId) {

        alert(
            "Please select a medicine."
        );

        return;
    }


    eventMessage.textContent =
        "Adding lifecycle event...";


    const eventData = {

        event_type:
            eventType.value,

        location:
            locationInput.value || null,

        notes:
            notesInput.value || null

    };


    try {

        const response = await fetch(
            `${API_URL}/lifecycle/${medicineId}`,
            {
                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`

                },

                body:
                    JSON.stringify(
                        eventData
                    )
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            if (
                response.status === 401
            ) {

                localStorage.removeItem(
                    "token"
                );

                window.location.href =
                    "index.html";

                return;
            }


            eventMessage.textContent =
                data.detail ||
                "Failed to add lifecycle event.";

            return;
        }


        eventMessage.textContent =
            "Lifecycle event added successfully!";


        locationInput.value =
            "";

        notesInput.value =
            "";


        loadLifecycleHistory(
            medicineId
        );

    } catch (error) {

        console.error(
            "Lifecycle error:",
            error
        );

        eventMessage.textContent =
            "Could not connect to the server.";
    }

}
);

// ============================================================
// LOAD LIFECYCLE HISTORY
// ============================================================

async function loadLifecycleHistory(
medicineId
) {

    lifecycleHistory.innerHTML =
        "<p>Loading lifecycle history...</p>";


    try {

        const response = await fetch(
            `${API_URL}/lifecycle/${medicineId}`,
            {
                method: "GET",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            lifecycleHistory.innerHTML =
                `<p>
                    ${data.detail ||
                    "Could not load lifecycle history."}
                </p>`;

            return;
        }


        if (
            !data.events ||
            data.events.length === 0
        ) {

            lifecycleHistory.innerHTML =
                `<p>
                    No lifecycle events recorded yet.
                </p>`;

            return;
        }


        lifecycleHistory.innerHTML =
            "";


        data.events.forEach(
            function (event) {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "activity-card";


                const timestamp =
                    new Date(
                        event.timestamp
                    ).toLocaleString();


                card.innerHTML = `

                    <div>

                        <h3>
                            ${event.event_type}
                        </h3>

                        <p>
                            <strong>
                                Location:
                            </strong>

                            ${event.location ||
                            "Not specified"}
                        </p>

                        <p>
                            <strong>
                                Time:
                            </strong>

                            ${timestamp}
                        </p>

                        <p>
                            <strong>
                                Notes:
                            </strong>

                            ${event.notes ||
                            "No notes"}
                        </p>

                    </div>

                `;


                lifecycleHistory.appendChild(
                    card
                );

            }
        );


    } catch (error) {

        console.error(
            "History error:",
            error
        );

        lifecycleHistory.innerHTML =
            "<p>Could not connect to the server.</p>";
    }
}

// ============================================================
// LOGOUT
// ============================================================

document.getElementById(
"logoutBtn"
).addEventListener(
"click",
function () {

    localStorage.removeItem(
        "token"
    );

    window.location.href =
        "index.html";

}
);

// ============================================================
// INITIAL LOAD
// ============================================================

loadSerializedMedicines();