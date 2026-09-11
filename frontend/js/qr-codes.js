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

            for (const medicine of medicines) {

                // ====================================================
                // CARD
                // ====================================================

                const card =
                    document.createElement("div");

                card.className =
                    "qr-card";


                // ====================================================
                // QR SECTION
                // ====================================================

                const qrSection =
                    document.createElement("div");

                qrSection.style.display =
                    "flex";

                qrSection.style.flexWrap =
                    "wrap";

                qrSection.style.gap =
                    "30px";

                qrSection.style.justifyContent =
                    "center";


                // ====================================================
                // OUTER QR
                // EXISTING SYSTEM — DO NOT CHANGE
                // ====================================================

                const outerSection =
                    document.createElement("div");

                outerSection.style.textAlign =
                    "center";


                const outerTitle =
                    document.createElement("h4");

                outerTitle.textContent =
                    "Outer QR";

                outerSection.appendChild(
                    outerTitle
                );


                const outerQRContainer =
                    document.createElement("div");

                outerQRContainer.className =
                    "qr-image";


                // ------------------------------------------------
                // EXISTING OUTER QR URL
                // ------------------------------------------------

                const verificationURL =
                    `${QR_FRONTEND_URL}/verification.html?token=${medicine.qr_token}`;


                // ------------------------------------------------
                // EXISTING OUTER QR GENERATION
                // ------------------------------------------------

                new QRCode(
                    outerQRContainer,
                    {
                        text: verificationURL,
                        width: 200,
                        height: 200
                    }
                );


                outerSection.appendChild(
                    outerQRContainer
                );


                // ====================================================
                // INNER QR
                // NEW SYSTEM
                // ====================================================

                const innerSection =
                    document.createElement("div");

                innerSection.style.textAlign =
                    "center";


                const innerTitle =
                    document.createElement("h4");

                innerTitle.textContent =
                    "Inner QR";

                innerSection.appendChild(
                    innerTitle
                );


                const innerQRContainer =
                    document.createElement("div");

                innerQRContainer.className =
                    "qr-image";


                // ------------------------------------------------
                // INNER QR LOADING MESSAGE
                // ------------------------------------------------

                innerQRContainer.innerHTML =
                    "<p>Loading...</p>";


                innerSection.appendChild(
                    innerQRContainer
                );


                // ------------------------------------------------
                // ADD BOTH QR SECTIONS
                // ------------------------------------------------

                qrSection.appendChild(
                    outerSection
                );

                qrSection.appendChild(
                    innerSection
                );


                card.appendChild(
                    qrSection
                );


                // ====================================================
                // SERIAL NUMBER
                // ====================================================

                const serial =
                    document.createElement(
                        "p"
                    );

                serial.innerHTML =
                    `<strong>Serial:</strong> ${medicine.serial_number}`;


                // ====================================================
                // STATUS
                // ====================================================

                const status =
                    document.createElement(
                        "p"
                    );

                status.innerHTML =
                    `<strong>Status:</strong> ${medicine.status}`;


                card.appendChild(
                    serial
                );

                card.appendChild(
                    status
                );


                // ====================================================
                // ADD CARD TO GRID
                // ====================================================

                grid.appendChild(
                    card
                );


                // ====================================================
                // GET INNER QR TOKEN
                // ====================================================

                try {

                    const innerResponse =
                        await fetch(
                            `${API_URL}/inner-qr/${medicine.id}`,
                            {
                                method: "GET",

                                headers: {
                                    "Authorization":
                                        `Bearer ${token}`
                                }
                            }
                        );


                    if (!innerResponse.ok) {

                        throw new Error(
                            "Failed to get Inner QR token"
                        );
                    }


                    const innerData =
                        await innerResponse.json();


                    // ------------------------------------------------
                    // CLEAR LOADING MESSAGE
                    // ------------------------------------------------

                    innerQRContainer.innerHTML =
                        "";


                    // ------------------------------------------------
                    // INNER VERIFICATION URL
                    // ------------------------------------------------

                    const innerVerificationURL =
                        `${QR_FRONTEND_URL}/inner-verification.html?token=${encodeURIComponent(innerData.authentication_token)}`;


                    // ------------------------------------------------
                    // GENERATE ACTUAL INNER QR
                    // ------------------------------------------------

                    new QRCode(
                        innerQRContainer,
                        {
                            text:
                                innerVerificationURL,

                            width: 200,

                            height: 200
                        }
                    );


                } catch (innerError) {

                    console.error(
                        "Inner QR error:",
                        innerError
                    );


                    innerQRContainer.innerHTML =
                        "<p>Inner QR unavailable</p>";
                }

            }


            // ----------------------------------------------------
            // ADD GRID TO PAGE
            // ----------------------------------------------------

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
// INITIAL LOAD
// ============================================================

loadQRCodes();