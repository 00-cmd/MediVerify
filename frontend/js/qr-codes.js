// ============================================================
// AUTHENTICATION
// ============================================================

const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "index.html";
}


// ============================================================
// QR MODAL STATE
// ============================================================

let currentQrForPrint = null;


// ============================================================
// OPEN QR MODAL
// ============================================================

function openQrModal(qrData) {

    const modal = document.getElementById("qrModal");
    const modalQrCode = document.getElementById("modalQrCode");

    const modalSerialNumber =
        document.getElementById("modalSerialNumber");

    const modalStatus =
        document.getElementById("modalStatus");

    if (!modal || !modalQrCode) {
        return;
    }

    currentQrForPrint = qrData;

    modalQrCode.innerHTML = "";

    new QRCode(
        modalQrCode,
        {
            text: qrData.url,
            width: 300,
            height: 300
        }
    );

    if (modalSerialNumber) {
        modalSerialNumber.textContent =
            qrData.serialNumber || "-";
    }

    if (modalStatus) {
        modalStatus.textContent =
            qrData.status || "-";
    }

    modal.classList.add("show");

    document.body.classList.add("qr-modal-open");
}


// ============================================================
// CLOSE QR MODAL
// ============================================================

function closeQrModal() {

    const modal =
        document.getElementById("qrModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("show");

    document.body.classList.remove("qr-modal-open");

    currentQrForPrint = null;
}


// ============================================================
// PRINT SINGLE QR
// ============================================================

function printSingleQr() {

    if (!currentQrForPrint) {
        return;
    }

    printQRCodes([
        currentQrForPrint
    ]);
}


// ============================================================
// PRINT QR CODES
// ============================================================

function printQRCodes(qrCodes) {

    if (!qrCodes || qrCodes.length === 0) {
        return;
    }

    const printArea =
        document.getElementById("qrPrintArea");

    if (!printArea) {
        return;
    }

    printArea.innerHTML = "";

    // --------------------------------------------------------
    // PRINT HEADER
    // --------------------------------------------------------

    const header =
        document.createElement("div");

    header.className =
        "qr-print-header";

    header.innerHTML = `
        <h1>MediVerify</h1>
        <p>Medicine QR Codes</p>
    `;

    printArea.appendChild(header);


    // --------------------------------------------------------
    // QR GRID
    // --------------------------------------------------------

    const printGrid =
        document.createElement("div");

    printGrid.className =
        "qr-print-grid";


    qrCodes.forEach((qrData) => {

        const printCard =
            document.createElement("div");

        printCard.className =
            "qr-print-card";


        const qrContainer =
            document.createElement("div");

        qrContainer.className =
            "qr-print-image";


        new QRCode(
            qrContainer,
            {
                text: qrData.url,
                width: 220,
                height: 220
            }
        );


        const title =
            document.createElement("h3");

        title.textContent =
            qrData.type || "Outer QR";


        const serial =
            document.createElement("p");

        serial.innerHTML =
            `<strong>Serial:</strong> ${qrData.serialNumber}`;


        const status =
            document.createElement("p");

        status.innerHTML =
            `<strong>Status:</strong> ${qrData.status}`;


        printCard.appendChild(
            title
        );

        printCard.appendChild(
            qrContainer
        );

        printCard.appendChild(
            serial
        );

        printCard.appendChild(
            status
        );


        printGrid.appendChild(
            printCard
        );

    });


    printArea.appendChild(
        printGrid
    );


    // --------------------------------------------------------
    // OPEN PRINT DIALOG
    // --------------------------------------------------------

    setTimeout(() => {

        window.print();

    }, 300);
}


// ============================================================
// SETUP MODAL EVENTS
// ============================================================

function setupQrModal() {

    const closeButton =
        document.getElementById("closeQrModal");

    const closeBottomButton =
        document.getElementById(
            "closeQrModalBottom"
        );

    const printButton =
        document.getElementById("printSingleQr");

    const backdrop =
        document.querySelector(
            ".qr-modal-backdrop"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeQrModal
        );

    }


    if (closeBottomButton) {

        closeBottomButton.addEventListener(
            "click",
            closeQrModal
        );

    }


    if (printButton) {

        printButton.addEventListener(
            "click",
            printSingleQr
        );

    }


    if (backdrop) {

        backdrop.addEventListener(
            "click",
            closeQrModal
        );

    }


    // --------------------------------------------------------
    // ESCAPE KEY
    // --------------------------------------------------------

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape"
            ) {

                closeQrModal();

            }

        }
    );

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
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        if (!batchResponse.ok) {

            if (
                batchResponse.status === 401
            ) {

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
            // SKIP EMPTY BATCHES
            // ------------------------------------------------

            if (medicines.length === 0) {
                continue;
            }


            // ------------------------------------------------
            // BATCH HEADING
            // ------------------------------------------------

            const batchContainer =
                document.createElement("div");

            batchContainer.className =
                "qr-batch-container";


            const batchHeader =
                document.createElement("div");

            batchHeader.className =
                "qr-batch-header";


            const batchHeading =
                document.createElement("h3");

            batchHeading.textContent =
                `Batch: ${batch.batch_number}`;


            const printBatchButton =
                document.createElement("button");

            printBatchButton.type =
                "button";

            printBatchButton.className =
                "print-batch-btn";

            printBatchButton.textContent =
                "Print All QRs";


            // ------------------------------------------------
            // BATCH PRINT DATA
            // ------------------------------------------------

            const batchPrintData = [];


            // ------------------------------------------------
            // BATCH HEADER
            // ------------------------------------------------

            batchHeader.appendChild(
                batchHeading
            );

            batchHeader.appendChild(
                printBatchButton
            );

            batchContainer.appendChild(
                batchHeader
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
                        text:
                            verificationURL,

                        width: 200,

                        height: 200
                    }
                );


                outerSection.appendChild(
                    outerQRContainer
                );


                // ------------------------------------------------
                // CLICK OUTER QR
                // ------------------------------------------------

                outerQRContainer.addEventListener(
                    "click",
                    () => {

                        openQrModal({

                            type:
                                "Outer QR",

                            url:
                                verificationURL,

                            serialNumber:
                                medicine.serial_number,

                            status:
                                medicine.status

                        });

                    }
                );


                // ====================================================
                // INNER QR
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
                // ADD OUTER QR TO PRINT-ALL
                // ====================================================

                batchPrintData.push({

                    type:
                        "Outer QR",

                    url:
                        verificationURL,

                    serialNumber:
                        medicine.serial_number,

                    status:
                        medicine.status

                });


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
                    // GENERATE INNER QR
                    // ------------------------------------------------

                    new QRCode(
                        innerQRContainer,
                        {
                            text:
                                innerVerificationURL,

                            width:
                                200,

                            height:
                                200
                        }
                    );


                    // ------------------------------------------------
                    // CLICK INNER QR
                    // ------------------------------------------------

                    innerQRContainer.addEventListener(
                        "click",
                        () => {

                            openQrModal({

                                type:
                                    "Inner QR",

                                url:
                                    innerVerificationURL,

                                serialNumber:
                                    medicine.serial_number,

                                status:
                                    medicine.status

                            });

                        }
                    );


                    // ------------------------------------------------
                    // ADD INNER QR TO PRINT-ALL
                    // ------------------------------------------------

                    batchPrintData.push({

                        type:
                            "Inner QR",

                        url:
                            innerVerificationURL,

                        serialNumber:
                            medicine.serial_number,

                        status:
                            medicine.status

                    });


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
            // PRINT ALL BUTTON
            // ----------------------------------------------------

            printBatchButton.addEventListener(
                "click",
                () => {

                    printQRCodes(
                        batchPrintData
                    );

                }
            );


            // ----------------------------------------------------
            // ADD GRID TO BATCH CONTAINER
            // ----------------------------------------------------

            batchContainer.appendChild(
                grid
            );


            // ----------------------------------------------------
            // ADD BATCH TO PAGE
            // ----------------------------------------------------

            qrList.appendChild(
                batchContainer
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

setupQrModal();

loadQRCodes();