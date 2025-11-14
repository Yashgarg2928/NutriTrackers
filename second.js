//
// second.js - for the results page
//

let chart = null;

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const barcode = params.get('barcode');

    if (barcode) {
        try {
            const data = await generateNutritionData(barcode);
            displayProductInfo(data);
        } catch (error) {
            console.error("Error fetching or displaying product data:", error.message);
            document.querySelector(".left").innerHTML = "<h3>Product not found</h3>";
        }
    }
});

function displayProductInfo(data) {
    document.querySelector(".left h3").textContent = data.productName;
    document.querySelector(".table-box").innerHTML = `<h3>Nutrition Table</h3>${data.tableHTML}`;
    
    const ctx = document.getElementById('nutritionChart').getContext('2d');

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Sugars", "Fat", "Carbs", "Protein", "Salt"],
            datasets: [{
                data: data.chartData,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                ]
            }]
        }
    });
}