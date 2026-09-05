// ============================================================
// AUTHENTICATION
// ============================================================

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}


// ============================================================
// LOAD QR CODES
// ============================================================

async function loadQRCodes() {

    const qrList =
        document.getElementById("qrList");

    try {

        // ----------------------------------------------------
        // GET ALL BATCHES
        // ----------------------------------------------------

        const batchResponse = await fetch(
            `${API_URL}/batches/`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (!batchResponse.ok) {

            if (batchResponse.status === 401) {

                localStorage.removeItem("token");

                window.location.href = "index.html";

                return;
            }

            throw new Error(
                "Failed to load batches"
            );
        }


        const batches =
            await batchResponse.json();


        if (batches.length === 0) {

            qrList.innerHTML =
                "<p>No batches found.</p>";

            return;
        }


        qrList.innerHTML = "";


        // ----------------------------------------------------
        // PROCESS EACH BATCH
        // ----------------------------------------------------

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


            // ------------------------------------------------
            // SKIP BATCHES WITHOUT SERIALIZED MEDICINES
            // ------------------------------------------------

            if (medicines.length === 0) {
                continue;
            }


            // ------------------------------------------------
            // BATCH HEADING
            // ------------------------------------------------

            const batchHeading =
                document.createElement("h3");

            batchHeading.textContent =
                `Batch: ${batch.batch_number}`;

            batchHeading.style.marginTop =
                "30px";

            qrList.appendChild(
                batchHeading
            );


            // ------------------------------------------------
            // QR GRID
            // ------------------------------------------------

            const grid =
                document.createElement("div");

            grid.className =
                "qr-grid";


            // ------------------------------------------------
            // CREATE QR CARDS
            // ------------------------------------------------

            medicines.forEach(
                function (medicine) {

                    const card =
                        document.createElement(
                            "div"
                        );

                    card.className =
                        "qr-card";


                    // ------------------------------------------------
                    // QR CONTAINER
                    // ------------------------------------------------

                    const qrContainer =
                        document.createElement("div");

                    qrContainer.className =
                        "qr-image";


                    // ------------------------------------------------
                    // VERIFICATION URL
                    // ------------------------------------------------

                    const verificationURL =
                        `${QR_FRONTEND_URL}/verification.html?token=${medicine.qr_token}`;


                    // ------------------------------------------------
                    // GENERATE QR CODE
                    // ------------------------------------------------

                    new QRCode(
                        qrContainer,
                        {
                            text: verificationURL,
                            width: 200,
                            height: 200
                        }
                    );


                    // ------------------------------------------------
                    // SERIAL NUMBER
                    // ------------------------------------------------

                    const serial =
                        document.createElement(
                            "p"
                        );

                    serial.innerHTML =
                        `<strong>Serial:</strong> ${medicine.serial_number}`;


                    // ------------------------------------------------
                    // STATUS
                    // ------------------------------------------------

                    const status =
                        document.createElement(
                            "p"
                        );

                    status.innerHTML =
                        `<strong>Status:</strong> ${medicine.status}`;


                    // ------------------------------------------------
                    // ADD TO CARD
                    // ------------------------------------------------

                    card.appendChild(
                        qrContainer
                    );

                    card.appendChild(
                        serial
                    );

                    card.appendChild(
                        status
                    );


                    grid.appendChild(
                        card
                    );

                }
            );


            qrList.appendChild(
                grid
            );

        }


        // ----------------------------------------------------
        // NO QR CODES
        // ----------------------------------------------------

        if (qrList.innerHTML === "") {

            qrList.innerHTML =
                "<p>No serialized medicines found.</p>";
        }


    } catch (error) {

        console.error(
            "QR loading error:",
            error
        );

        qrList.innerHTML =
            "<p>Could not load QR codes.</p>";
    }
}


// ============================================================
// LOGOUT
// ============================================================

document.getElementById("logoutBtn")
    .addEventListener(
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

loadQRCodes();