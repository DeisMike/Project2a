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

    loadTopAttributes(4);
    updateScatterplotMatrix(4);
}

function setupLayout() {
    const scatterContainer = d3.select("body").append("div").attr("id", "scatter-container").style("display", "flex");
    scatterContainer.append("div").attr("id", "scatterplot-matrix").style("flex", "1");
    scatterContainer.append("div").attr("id", "scatterplot-legend").style("flex", "2");

    const container = d3.select("body").append("div").attr("id", "visualization-container").style("display", "flex");
    container.append("div").attr("id", "scree-container").style("flex", "1");
    container.append("div").attr("id", "biplot-container").style("flex", "1");

    d3.select("body").append("div").attr("id", "top-attributes-table");

}

let selectedPCs = [0, 1];

async function drawScreePlot(varianceExplained) {
    console.log(" Sending varianceExplained to Flask:", varianceExplained);
    // Convert to query string format
    const valuesQuery = varianceExplained.map(v => `values=${v}`).join("&");
    const elbowResponse = await fetch(`/find-elbow?scree=1&${valuesQuery}`); // Flask API to get elbow
    let elbowIndex = await elbowResponse.json();
    console.log("Elbow index, scree:", elbowIndex);
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
        .attr("stroke", (d, i) => i === elbowIndex ? "black" : "none")
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
            elbowIndex = varianceExplained.indexOf(d);
            console.log(`Intrinsic Dimensionality Updated: ${elbowIndex}`);
            // Update visuals
            bars.attr("stroke", (d, i) => i === elbowIndex ? "black" : "none");
            loadTopAttributes(elbowIndex + 1);
            updateScatterplotMatrix(elbowIndex + 1);
        });

}

async function drawMSEPlot(mseScores) {
    console.log("Sending mseScores to Flask:", mseScores);
    // Convert to query string format
    const valuesQuery = mseScores.map(v => `values=${v}`).join("&");
    const elbowResponse = await fetch(`/find-elbow?kmeans=1&${valuesQuery}`); // Flask API to get elbow
    let elbowIndex = await elbowResponse.json();
    console.log("Elbow index, MSE:", elbowIndex);
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
    const bars = svg.selectAll("rect").data(mseScores).enter().append("rect")
        .attr("x", (d, i) => xScale(i + 1))
        .attr("y", d => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", d => 250 - yScale(d))
        .attr("fill", (d, i) => i === elbowIndex ? "orange" : "steelblue")
        .on("click", function(event, d) {
            elbowIndex = mseScores.indexOf(d);
            console.log(`k Updated: ${elbowIndex + 1}`);
            // Update K means bar chart 
            bars.attr("fill", (d, i) => i === elbowIndex ? "orange" : "steelblue");
            // Update biplot and scatterplot matrix
            updateBiplot(elbowIndex + 1);
            updateScatterplotMatrixClusters(elbowIndex + 1);
        });
}


async function drawBiplot(selectedPCs) {
    if (selectedPCs.length !== 2) return;
    const pcaResponse = await fetch('/pca');
    const pcaData = await pcaResponse.json();
    const scores = pcaData.scores;
    const eigenvectors = pcaData.eigenvectors;
    const columnNames = pcaData.column_names;

    const kmeansResponse = await fetch('/kmeans');
    const kmeansData = await kmeansResponse.json();
    // Convert to query string format
    const valuesQuery = kmeansData.mse_scores.map(v => `values=${v}`).join("&");
    const elbowResponse = await fetch(`/find-elbow?kmeans=1&${valuesQuery}`); // Flask API to get elbow
    const elbowIndex = await elbowResponse.json();
    console.log("Elbow index, k:", elbowIndex);
    const clusters = kmeansData.clusters;
    const initialK = elbowIndex + 1;
    const clusterLabels = clusters[initialK];

    d3.select("#biplot-container").html("");
    const svg = d3.select("#biplot-container").append("svg").attr("width", 500).attr("height", 400);
    const xScale = d3.scaleLinear().domain(d3.extent(scores, d => d[selectedPCs[0]])).range([50, 450]);
    const yScale = d3.scaleLinear().domain(d3.extent(scores, d => d[selectedPCs[1]])).range([350, 50]);

    svg.append("text").attr("x", 250).attr("y", 20).attr("class", "title-typography").attr("text-anchor", "middle").text(`Biplot (PC${selectedPCs[0] + 1} vs PC${selectedPCs[1] + 1})`);

    //Add Y-axis label
    svg.append("text")
        .attr("x", -200).attr("y", 10)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text(`PC${selectedPCs[1] + 1}`);

    //Add X-axis label
    svg.append("text")
        .attr("x", 250).attr("y", 395)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .text(`PC${selectedPCs[0] + 1}`);

    svg.append("g").attr("transform", "translate(0,350)").call(d3.axisBottom(xScale));
    svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(yScale));

    // Color scale for clusters
    const uniqueClusters = [...new Set(clusterLabels)];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueClusters);

    // Projected data points
    svg.selectAll("circle").data(scores).enter().append("circle")
        .attr("cx", d => xScale(d[selectedPCs[0]]))
        .attr("cy", d => yScale(d[selectedPCs[1]]))
        .attr("r", 4).attr("fill", (d, i) => colorScale(clusterLabels[i]));

    // Scale for arrows
    const arrowScale = 15;

    // Arrows: Dimension axes
    eigenvectors[selectedPCs[0]].forEach((value, i) => {
        const xEnd = xScale(value * arrowScale);
        const yEnd = yScale(eigenvectors[selectedPCs[1]][i] * arrowScale);

        svg.append("line")
            .attr("x1", xScale(0))
            .attr("y1", yScale(0))
            .attr("x2", xEnd)
            .attr("y2", yEnd)
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrow)");

        svg.append("text")
            .attr("x", xEnd + 5)
            .attr("y", yEnd - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text(columnNames[i]);
    });

    // Define arrow markers
    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
    .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "black");
    
    // Add Legend
    const legend = svg.append("g").attr("transform", "translate(380, 20)");
    uniqueClusters.forEach((cluster, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", colorScale(cluster));

        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 10)
            .text(`Cluster ${cluster}`);
    });
}

async function updateBiplot(k) {
    const response = await fetch('/pca');
    const pcaData = await response.json();
    const scores = pcaData.scores;
    const eigenvectors = pcaData.eigenvectors;
    const columnNames = pcaData.column_names;

    const kmeansResponse = await fetch('/kmeans');
    const kmeansData = await kmeansResponse.json();
    const clusterLabels = kmeansData.clusters[k];

    d3.select("#biplot-container").html("");
    const svg = d3.select("#biplot-container").append("svg").attr("width", 500).attr("height", 400);
    const xScale = d3.scaleLinear().domain(d3.extent(scores, d => d[selectedPCs[0]])).range([50, 450]);
    const yScale = d3.scaleLinear().domain(d3.extent(scores, d => d[selectedPCs[1]])).range([350, 50]);

    svg.append("text").attr("x", 250).attr("y", 20).attr("class", "title-typography").attr("text-anchor", "middle").text(`Biplot (PC${selectedPCs[0] + 1} vs PC${selectedPCs[1] + 1})`);

    //Add Y-axis label
    svg.append("text")
        .attr("x", -200).attr("y", 10)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text(`PC${selectedPCs[1] + 1}`);

    //Add X-axis label
    svg.append("text")
        .attr("x", 250).attr("y", 395)
        .attr("class", "title-typography")
        .attr("text-anchor", "middle")
        .text(`PC${selectedPCs[0] + 1}`);

    svg.append("g").attr("transform", "translate(0,350)").call(d3.axisBottom(xScale));
    svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(yScale));

    // Color scale for clusters
    const uniqueClusters = [...new Set(clusterLabels)];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueClusters);

    // Projected data points
    svg.selectAll("circle").data(scores).enter().append("circle")
        .attr("cx", d => xScale(d[selectedPCs[0]]))
        .attr("cy", d => yScale(d[selectedPCs[1]]))
        .attr("r", 4).attr("fill", (d, i) => colorScale(clusterLabels[i]));

    // Scale for arrows
    const arrowScale = 15;

    // Arrows: Dimension axes
    eigenvectors[selectedPCs[0]].forEach((value, i) => {
        const xEnd = xScale(value * arrowScale);
        const yEnd = yScale(eigenvectors[selectedPCs[1]][i] * arrowScale);

        svg.append("line")
            .attr("x1", xScale(0))
            .attr("y1", yScale(0))
            .attr("x2", xEnd)
            .attr("y2", yEnd)
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrow)");

        svg.append("text")
            .attr("x", xEnd + 5)
            .attr("y", yEnd - 5)
            .attr("text-anchor", "middle")
            .attr("font-size", "10px")
            .text(columnNames[i]);
    });

    // Define arrow markers
    svg.append("defs").append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
    .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "black");
    
    // Add Legend
    const legend = svg.append("g").attr("transform", "translate(380, 20)");
    uniqueClusters.forEach((cluster, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 20)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", colorScale(cluster));

        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 20 + 10)
            .text(`Cluster ${cluster}`);
    });
}

async function loadTopAttributes(d_i) {
    const response = await fetch(`/top-attributes?d=${d_i}`);
    const data = await response.json();

    // Fetch column names from PCA from Flask API
    const pcaResponse = await fetch('/pca');
    const pcaData = await pcaResponse.json();

    // Ensure columnNames is defined
    if (!pcaData.column_names || pcaData.column_names.length === 0) {
        console.error("Error: columnNames is undefined or empty", pcaData);
        return;
    }

    const columnNames = pcaData.column_names;

    // Fetch dataset
    const datasetResponse = await fetch('/dataset');
    const datasetData = await datasetResponse.json();
    if (!datasetData.dataset || datasetData.dataset.length === 0) {
        console.error("Error: Dataset is missing or empty", datasetData);
        return;
    }

    // Fetch cluster labels
    const kmeansResponse = await fetch('/kmeans');
    const kmeansData = await kmeansResponse.json();

    // Convert to query string format
    const valuesQuery = kmeansData.mse_scores.map(v => `values=${v}`).join("&");

    const elbowResponse = await fetch(`/find-elbow?kmeans=1&${valuesQuery}`);
    const elbowIndex = await elbowResponse.json();
    const initialK = elbowIndex;

    console.log(`Initial k detected for coloring: ${initialK}`);
    const clusterLabels = kmeansData.clusters[initialK];
    if (!clusterLabels || clusterLabels.length === 0) {
        console.error("Error: Cluster labels missing or empty", kmeansData);
        return;
    }
    console.log("Cluster labels received:", clusterLabels);

    // Ensure top_attributes exists and is valid
    if (!data.top_attributes || data.top_attributes.length === 0) {
        console.error("Error: top_attributes is undefined or empty", data);
        return;
    }

    // Ensure only attribute names are extracted (ignore PCA scores)
    const attributes = data.top_attributes.map(attr => attr[0]);

    console.log("Raw top_attributes data:", attributes);
    
    const table = d3.select("#top-attributes-table").html("").append("table").style("border", "1px solid black");
    // Table header
    table.append("tr").selectAll("th")
        .data(["Attribute Name", "Squared Sum of PCA Loadings"])
        .enter().append("th")
        .text(d => d)
        .style("border", "1px solid black");
    
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

    //drawScatterplotMatrix(attributes, datasetData.dataset, clusterLabels);
}

async function drawScatterplotMatrix(attributes, dataset, clusterLabels) {
    console.log("Dataset column names:", Object.keys(dataset[0]));
    console.log("Attributes passed to scatterplot matrix:", attributes);
    if (!dataset || dataset.length === 0) {
        console.warn("Warning: dataset is undefined or empty in drawScatterplotMatrix.");
        return;
    }
    if (!clusterLabels || clusterLabels.length !== dataset.length) {
        console.error("Cluster labels do not match dataset size!", clusterLabels.length, dataset.length);
        return;
    }

    d3.select("#scatterplot-matrix").html(""); // Clear previous plots
    d3.select("#scatterplot-legend").html(""); // Clear previous legend
    const svgSize = 500;
    const padding = 50;
    const cellSize = (svgSize - padding) / attributes.length;
    const svg = d3.select("#scatterplot-matrix").append("svg").attr("width", svgSize + 50).attr("height", svgSize);

    svg.append("text").attr("x", 97).attr("y", 20).attr("class", "title-typography").attr("text-anchor", "middle").text("Scatterplot Matrix");

    // Get unique clusters and set up color scale
    const uniqueClusters = [...new Set(clusterLabels)];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueClusters);

    console.log("Using cluster labels:", clusterLabels);

    attributes.forEach((attrX, col) => {
        attributes.forEach((attrY, row) => {
            if (!dataset.every(d => d[attrX] !== undefined && d[attrY] !== undefined)) {
                console.error(`Missing values for ${attrX} or ${attrY}`);
                return;
            }

            const xOffset = col * cellSize + padding;
            const yOffset = row * cellSize;

            // Draw a border around each plot
            svg.append("rect")
                .attr("x", xOffset)
                .attr("y", yOffset)
                .attr("width", cellSize)
                .attr("height", cellSize)
                .attr("stroke", "black")
                .attr("fill", "none")
                .attr("stroke-width", 1);


            const xScale = d3.scaleLinear()
                .domain(d3.extent(dataset, d => parseFloat(d[attrX])))
                .range([xOffset, xOffset + cellSize]);

            const yScale = d3.scaleLinear()
                .domain(d3.extent(dataset, d => parseFloat(d[attrY])))
                .range([yOffset + cellSize, yOffset]);

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
                    .attr("fill", (d, i) => colorScale(clusterLabels[i]));

                // Add axes to left-most and bottom-most plots
                if (col === 0) {
                    svg.append("g")
                        .attr("transform", `translate(${xOffset},0)`)
                        .call(d3.axisLeft(yScale).ticks(4));
                }
                if (row === attributes.length - 1) {
                    svg.append("g")
                        .attr("transform", `translate(0,${yOffset + cellSize})`)
                        .call(d3.axisBottom(xScale).ticks(4));
                }
                if (row === 0 && col === attributes.length - 1) { // Add axes to top row, right-most plot
                    svg.append("g")
                        .attr("transform", `translate(0,${yOffset})`)
                        .call(d3.axisTop(xScale).ticks(4));
                    svg.append("g")
                        .attr("transform", `translate(${xOffset + cellSize},0)`)
                        .call(d3.axisRight(yScale).ticks(4));
                }
            }
        });
    });

    // Add legend as a separate SVG
    const legendSvg = d3.select("#scatterplot-legend").append("svg")
        .attr("width", 200)
        .attr("height", uniqueClusters.length * 20 + 20);
    uniqueClusters.forEach((cluster, i) => {
        legendSvg.append("rect")
            .attr("x", 10)
            .attr("y", i * 20 + 10)
            .attr("width", 12)
            .attr("height", 12)
            .attr("fill", colorScale(cluster));

        legendSvg.append("text")
            .attr("x", 30)
            .attr("y", i * 20 + 20)
            .text(`Cluster ${cluster}`)
            .attr("font-size", "12px");
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

    // Fetch cluster assignments from Flask
    const kmeansResponse = await fetch('/kmeans');
    const kmeansData = await kmeansResponse.json();

    // Convert to query string format
    const valuesQuery = kmeansData.mse_scores.map(v => `values=${v}`).join("&");

    const elbowResponse = await fetch(`/find-elbow?kmeans=1&${valuesQuery}`);
    const elbowIndex = await elbowResponse.json();
    const initialK = elbowIndex + 1;
    console.log(`Initial k detected for coloring: ${initialK}`);

    // Get cluster labels for the selected k
    const clusterLabels = kmeansData.clusters[initialK];
    if (!clusterLabels || clusterLabels.length === 0) {
        console.error("Error: Cluster labels missing or empty", kmeansData);
        return;
    }

    console.log("Cluster labels received:", clusterLabels);

    console.log("Using attributes:", attributes);
    console.log("Received dataset:", datasetData.dataset);

    drawScatterplotMatrix(attributes, datasetData.dataset, clusterLabels);
        
}

// Update scatterplot matrix when new k is selected
async function updateScatterplotMatrixClusters(k) {
    const datasetResponse = await fetch('/dataset');
    const datasetData = await datasetResponse.json();

    const attributesResponse = await fetch(`/top-attributes?d=4`);
    const attributesData = await attributesResponse.json();
    const attributes = attributesData.top_attributes.map(attr => attr[0]);

    const kmeansResponse = await fetch('/kmeans');
    const kmeansData = await kmeansResponse.json();
    const clusterLabels = kmeansData.clusters[k];

    drawScatterplotMatrix(attributes, datasetData.dataset, clusterLabels);
}

