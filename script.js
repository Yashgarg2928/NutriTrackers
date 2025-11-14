
const codeReader = new ZXing.BrowserMultiFormatReader();
const scanButton = document.querySelector("#scan-button");

scanButton.addEventListener("click", async () => {
    try {
        const barcode = await startScanner();
        
        // After scanning, redirect to the results page with the barcode
        window.location.href = `sec.html?barcode=${barcode}`;

    } catch (err) {
        console.error("An error occurred during scanning:", err.message);
        alert(`An error occurred: ${err.message}`);
    }
});

function startScanner() {
    return new Promise(async (resolve, reject) => {
        try {
            const devices = await codeReader.listVideoInputDevices();
            if (devices.length === 0) {
                reject("No camera found");
                return;
            }

            const cameraId = devices[0].deviceId;

            codeReader.decodeFromVideoDevice(cameraId, 'video', (result, err) => {
                if (result) {
                    codeReader.reset();
                    resolve(result.text);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    reject(err);
                }
            });

        } catch (error) {
            reject(error);
        }
    });
}

//
// Data Fetching and Processing Logic (for the results page)
//
async function generateNutritionData(barcode) {
    if (!barcode) return;

    const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.product) {
        throw new Error("Product not found");
    }

    const product = data.product;
    const n = product.nutriments || {};

    // CO2 Calculation
    const co2 = (() => {
        try {
            if (product.ecoscore_data?.agribalyse?.co2) return Number(product.ecoscore_data.agribalyse.co2);
            if (product.agribalyse?.co2) return Number(product.agribalyse.co2);
            if (product.co2_100g) return Number(product.co2_100g);
        } catch {}
        
        const categories = (product.categories || "").toLowerCase();
        if (categories.includes("meat")) return 2.5;
        if (categories.includes("cheese") || categories.includes("dairy")) return 1.2;
        if (categories.includes("fish")) return 1.5;
        if (categories.includes("vegetable") || categories.includes("fruit")) return 0.05;

        const fat = Number(n.fat_100g || 0);
        const protein = Number(n.proteins_100g || 0);

        return Number((0.08 + protein * 0.02 + fat * 0.03).toFixed(2));
    })();

    // Eco-Points Calculation
    let ecoPoints = 5;
    if (co2 < 0.1) ecoPoints += 20;
    else if (co2 < 0.5) ecoPoints += 10;
    else if (co2 < 1.0) ecoPoints += 6;
    else ecoPoints += 2;

    const grade = (product.nutrition_grade_fr || product.nutrition_grades || "z").toLowerCase();
    if (grade === "a") ecoPoints += 10;
    else if (grade === "b") ecoPoints += 6;
    else if (grade === "c") ecoPoints += 2;

    return {
        productName: product.product_name || "Unknown Product",
        tableHTML: `
            <table>
                <tr><th>Nutrient</th><th>Amount / 100g</th></tr>
                <tr><td>Energy</td><td>${n["energy-kcal_100g"] ?? "—"} kcal</td></tr>
                <tr><td>Fat</td><td>${n.fat_100g ?? "—"} g</td></tr>
                <tr><td>Saturated Fat</td><td>${n["saturated-fat_100g"] ?? "—"} g</td></tr>
                <tr><td>Carbs</td><td>${n.carbohydrates_100g ?? "—"} g</td></tr>
                <tr><td>Sugars</td><td>${n.sugars_100g ?? "—"} g</td></tr>
                <tr><td>Protein</td><td>${n.proteins_100g ?? "—"} g</td></tr>
                <tr><td>Salt</td><td>${n.salt_100g ?? "—"} g</td></tr>
                <tr><td>CO₂ Emission</td><td>${co2} kg / 100g</td></tr>
                <tr><td>Eco-Points Earned</td><td>${ecoPoints}</td></tr>
            </table>
        `,
        chartData: [
            n.sugars_100g || 0,
            n.fat_100g || 0,
            n.carbohydrates_100g || 0,
            n.proteins_100g || 0,
            n.salt_100g || 0
        ],
        co2Value: co2,
        ecoPointsEarned: ecoPoints
    };
}