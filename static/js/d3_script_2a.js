// static/js/d3_script_2a.js

async function loadDashboard() {
    const pcaResponse = await fetch('/pca');
    const pcaData = await pcaResponse.json();

    const eigenvalues = pcaData.eigenvalues;
    const totalVariance = d3.sum(eigenvalues);
    const varianceExplained = eigenvalues.map(d => (d / totalVariance) * 100);

    setupLayout();
    drawScreePlot(varianceExplained);

    selectedPCs = [0, 1];
    drawBiplot(selectedPCs);

    const kmeansResponse = await fetch('/kmeans');
    const kmeansData = await kmeansResponse.json();
    drawMSEPlot(kmeansData.mse_scores);

    loadTopAttributes(2);
    updateScatterplotMatrix(2);
}

function setupLayout() {
    const container = d3.select("body").append("div").attr("id", "visualization-container").style("display", "flex");

    container.append("div").attr("id", "scree-container").style("flex", "1");
    container.append("div").attr("id", "biplot-container").style("flex", "1");

    d3.select("body").append("div").attr("id", "top-attributes-table");

}

let selectedPCs = [0, 1];
let intrinsicDimensionality = findElbowIndex([]);

function drawScreePlot(varianceExplained) {
    const svg = d3.select("#scree-container").append("svg").attr("width", 500).attr("height", 300);
    const xScale = d3.scaleBand().domain(d3.range(varianceExplained.length)).range([50, 500]).padding(0.1);    
    const yScale = d3.scaleLinear().domain([0, d3.max(varianceExplained)]).range([250, 50]);

    //Add title
    svg.append("text")
        .attr("class", "title-typography")
        .attr("x", 250)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .text("Scree Plot");

    //Add Y-axis label
    svg.append("text")
        .attr("x", -150).attr("y", 10)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Variance Explained");

    //Add X-axis label
    svg.append("text")
        .attr("x", 260).attr("y", 285)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .text("Principal Components");

    svg.append("g").attr("transform", "translate(0,250)").call(d3.axisBottom(xScale).tickFormat(d => d + 1));
    svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(yScale).tickFormat(d => `${d.toFixed(1)}%`));

    const bars = svg.selectAll("rect").data(varianceExplained).enter().append("rect")
        .attr("x", (d, i) => xScale(i))
        .attr("y", d => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", d => 250 - yScale(d))
        .attr("fill", (d, i) => selectedPCs.includes(i) ? "orange" : "steelblue")
        .attr("stroke", (d, i) => i === intrinsicDimensionality ? "black" : "none")
        .attr("stroke-width", 3)
        .on("click", function(event, d) {
            const clickedIndex = varianceExplained.indexOf(d);
            
            if (selectedPCs.includes(clickedIndex)) {
                selectedPCs = selectedPCs.filter(pc => pc !== clickedIndex);
            } else if (selectedPCs.length < 2) {
                selectedPCs.push(clickedIndex);
            } else {
                selectedPCs.shift();
                selectedPCs.push(clickedIndex);
            }
            
            bars.attr("fill", (d, i) => selectedPCs.includes(i) ? "orange" : "steelblue");
            drawBiplot(selectedPCs);
        })
        .on("mousedown", function(event, d) {
            intrinsicDimensionality = varianceExplained.indexOf(d);
            bars.attr("stroke", (d, i) => i === intrinsicDimensionality ? "black" : "none");
            loadTopAttributes(intrinsicDimensionality + 1);
            updateScatterplotMatrix(intrinsicDimensionality + 1);
        });

}

function drawMSEPlot(mseScores) {
    const svg = d3.select("#mse-plot").append("svg").attr("width", 500).attr("height", 300);
    const xScale = d3.scaleBand().domain(d3.range(1, mseScores.length + 1)).range([50, 500]).padding(0.1);
    const yScale = d3.scaleLinear().domain([0, d3.max(mseScores)]).range([250, 50]);
    svg.append("text").attr("x", 250).attr("y", 20).attr("class", "title-typography").attr("text-anchor", "middle").text("K-Means MSE Plot");

    //Add Y-axis label
    svg.append("text")
        .attr("x", -150).attr("y", 10)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Mean Squared Error Score");

    //Add X-axis label
    svg.append("text")
        .attr("x", 260).attr("y", 285)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .text("k");

    svg.append("g").attr("transform", "translate(0,250)").call(d3.axisBottom(xScale));
    svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(yScale));
    svg.selectAll("rect").data(mseScores).enter().append("rect")
        .attr("x", (d, i) => xScale(i + 1))
        .attr("y", d => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", d => 250 - yScale(d))
        .attr("fill", (d, i) => i === findElbowIndex(mseScores) ? "orange" : "steelblue");
}


async function drawBiplot(selectedPCs) {
    if (selectedPCs.length !== 2) return;
    const response = await fetch('/pca');
    const data = await response.json();
    const scores = data.scores;

    d3.select("#biplot-container").html("");
    const svg = d3.select("#biplot-container").append("svg").attr("width", 500).attr("height", 300);
    const xScale = d3.scaleLinear().domain(d3.extent(scores, d => d[selectedPCs[0]])).range([50, 500]);
    const yScale = d3.scaleLinear().domain(d3.extent(scores, d => d[selectedPCs[1]])).range([250, 50]);

    svg.append("text").attr("x", 250).attr("y", 20).attr("class", "title-typography").attr("text-anchor", "middle").text(`Biplot (PC${selectedPCs[0] + 1} vs PC${selectedPCs[1] + 1})`);

    //Add Y-axis label
    svg.append("text")
        .attr("x", -150).attr("y", 10)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text(`PC${selectedPCs[1] + 1}`);

    //Add X-axis label
    svg.append("text")
        .attr("x", 260).attr("y", 285)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .text(`PC${selectedPCs[0] + 1}`);

    svg.append("g").attr("transform", "translate(0,250)").call(d3.axisBottom(xScale));
    svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(yScale));

    svg.selectAll("circle").data(scores).enter().append("circle")
        .attr("cx", d => xScale(d[selectedPCs[0]]))
        .attr("cy", d => yScale(d[selectedPCs[1]]))
        .attr("r", 5).attr("fill", "steelblue");
}

async function loadTopAttributes(d_i) {
    const response = await fetch(`/top-attributes?d=${d_i}`);
    const data = await response.json();

    // Fetch column names from PCA API
    const pcaResponse = await fetch('/pca');
    const pcaData = await pcaResponse.json();

    // Ensure columnNames is defined
    if (!pcaData.column_names || pcaData.column_names.length === 0) {
        console.error("Error: columnNames is undefined or empty", pcaData);
        return;
    }

    const columnNames = pcaData.column_names;

    // Ensure top_attributes exists and is valid
    if (!data.top_attributes || data.top_attributes.length === 0) {
        console.error("Error: top_attributes is undefined or empty", data);
        return;
    }

    console.log("Raw top_attributes data:", data.top_attributes);
    
    const table = d3.select("#top-attributes-table").html("").append("table").style("border", "1px solid black");
    // Table header
    table.append("tr").selectAll("th")
        .data(["Attribute Name", "Squared Sum of PCA Loadings"])
        .enter().append("th")
        .text(d => d)
        .style("border", "1px solid black");
    
    // Table rows
    // Table rows (Fix extracting values properly)
    data.top_attributes.forEach(attr => {
        if (!Array.isArray(attr) || attr.length !== 2) {
            console.error("Invalid attribute format:", attr);
            return;
        }

        const [name, score] = attr; // Correctly extract name and score

        const row = table.append("tr");
        row.append("td").text(name).style("border", "1px solid black").style("padding", "5px");
        row.append("td").text(parseFloat(score).toFixed(4)).style("border", "1px solid black").style("padding", "5px");
    });

    drawScatterplotMatrix(data.top_attributes);
}

async function drawScatterplotMatrix(attributes, dataset) {
    if (!dataset || dataset.length === 0) {
        console.warn("Warning: dataset is undefined or empty in drawScatterplotMatrix.");
        return;
    }

    d3.select("#scatterplot-matrix").html("");
    const svgSize = 500;
    const padding = 50;
    const cellSize = (svgSize - padding) / attributes.length;
    const svg = d3.select("#scatterplot-matrix").append("svg").attr("width", svgSize).attr("height", svgSize);

    svg.append("text").attr("x", 95).attr("y", 20).attr("class", "title-typography").attr("text-anchor", "middle").text("Scatterplot Matrix");

    attributes.forEach((attrX, col) => {
        attributes.forEach((attrY, row) => {
            if (!dataset.every(d => d[attrX] !== undefined && d[attrY] !== undefined)) {
                console.error(`Missing values for ${attrX} or ${attrY}`);
                return;
            }

            const xScale = d3.scaleLinear()
                .domain(d3.extent(dataset, d => parseFloat(d[attrX])))
                .range([col * cellSize + padding, (col + 1) * cellSize + padding]);

            const yScale = d3.scaleLinear()
                .domain(d3.extent(dataset, d => parseFloat(d[attrY])))
                .range([(row + 1) * cellSize, row * cellSize]);

            if (row === col) {
                // Diagonal: Display attribute name only
                svg.append("text")
                    .attr("x", col * cellSize + padding + cellSize / 2)
                    .attr("y", row * cellSize + cellSize / 2)
                    .attr("text-anchor", "middle")
                    .attr("alignment-baseline", "middle")
                    .text(attrX);
            } else {
                // Scatterplot for non-diagonal cells
                svg.selectAll(`circle-${col}-${row}`)
                    .data(dataset)
                    .enter().append("circle")
                    .attr("cx", d => xScale(parseFloat(d[attrX])))
                    .attr("cy", d => yScale(parseFloat(d[attrY])))
                    .attr("r", 2)
                    .attr("fill", "steelblue");
            }
        });
    });
}

// Update scatterplot matrix when new intrinsic dimensionality is selected
async function updateScatterplotMatrix(d_i) {
    const response = await fetch(`/top-attributes?d=${d_i}`);
    const data = await response.json();

    if (!data.top_attributes || data.top_attributes.length === 0) {
        console.error("Error: top_attributes is undefined or empty", data);
        return;
    }

    // Extract only attribute names (ignore PCA scores)
    const attributes = data.top_attributes.map(attr => attr[0]);

    const datasetResponse = await fetch('/dataset');
    const datasetData = await datasetResponse.json();

    if (!datasetData.dataset || datasetData.dataset.length === 0) {
        console.error("Error: Dataset is missing or empty", datasetData);
        return;
    }

    console.log("Using attributes:", attributes);
    console.log("Received dataset:", datasetData.dataset);

    drawScatterplotMatrix(attributes, datasetData.dataset);
        
}

function findElbowIndex(values) {
    let maxSlope = 0, elbowIndex = 0;
    for (let i = 1; i < values.length - 1; i++) {
        const slope = Math.abs(values[i - 1] - values[i]) + Math.abs(values[i] - values[i + 1]);
        if (slope > maxSlope) {
            maxSlope = slope;
            elbowIndex = i + 1;
        }
    }
    return elbowIndex;
}
