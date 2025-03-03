// static/js/d3_script_2a.js

async function loadDashboard() {
    const pcaResponse = await fetch('/pca');
    const pcaData = await pcaResponse.json();

    const eigenvalues = pcaData.eigenvalues;
    const totalVariance = d3.sum(eigenvalues);
    const varianceExplained = eigenvalues.map(d => (d / totalVariance) * 100);

    setupLayout();
    drawScreePlot(varianceExplained);

    const kmeansResponse = await fetch('/kmeans');
    const kmeansData = await kmeansResponse.json();
    drawMSEPlot(kmeansData.mse_scores);

    loadTopAttributes(2);
}

function setupLayout() {
    const container = d3.select("body").append("div").attr("id", "visualization-container").style("display", "flex");

    container.append("div").attr("id", "scree-container").style("flex", "1");
    container.append("div").attr("id", "biplot-container").style("flex", "1");
}

let selectedPCs = [];

function drawScreePlot(varianceExplained) {
    const svg = d3.select("#scree-container").append("svg").attr("width", 500).attr("height", 300);
    const xScale = d3.scaleBand().domain(d3.range(varianceExplained.length)).range([50, 500]).padding(0.1);    
    const yScale = d3.scaleLinear().domain([0, d3.max(varianceExplained)]).range([250, 50]);

    const selectedIndex = findElbowIndex(varianceExplained);
    selectedPCs = [selectedIndex];
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
        .text("Mean Square Error Score");

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

function populatePCSelectors(count) {
    const pc1 = document.getElementById('pc1');
    const pc2 = document.getElementById('pc2');
    for (let i = 0; i < count; i++) {
        pc1.innerHTML += `<option value="${i}">PC${i + 1}</option>`;
        pc2.innerHTML += `<option value="${i}">PC${i + 1}</option>`;
    }
    pc1.value = 0;
    pc2.value = 1;
    pc1.onchange = drawBiplot;
    pc2.onchange = drawBiplot;
    drawBiplot();
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
    document.getElementById('top-attributes').innerText = 'Top Attributes: ' + data.top_attributes.join(', ');

    drawScatterplotMatrix(data.top_attributes);
}

async function drawScatterplotMatrix(attributes) {
    const response = await fetch('/dataset');
    const dataset = await response.json();

    d3.select("#scatterplot-matrix").html("");
    const svg = d3.select("#scatterplot-matrix").append("svg").attr("width", 500).attr("height", 500);

    const padding = 50;
    const size = (500 - padding) / attributes.length;

    svg.append("text").attr("x", 250).attr("y", 20).attr("text-anchor", "middle").text("Scatterplot Matrix");

    attributes.forEach((attrX, col) => {
        attributes.forEach((attrY, row) => {
            const xScale = d3.scaleLinear().domain(d3.extent(dataset, d => d[attrX])).range([col * size + padding, (col + 1) * size + padding]);
            const yScale = d3.scaleLinear().domain(d3.extent(dataset, d => d[attrY])).range([(row + 1) * size, row * size]);

            svg.selectAll(`circle-${col}-${row}`).data(dataset).enter().append("circle")
                .attr("cx", d => xScale(d[attrX]))
                .attr("cy", d => yScale(d[attrY]))
                .attr("r", 2).attr("fill", "steelblue");

            if (row === attributes.length - 1) svg.append("text").attr("x", col * size + padding + size / 2).attr("y", 500).attr("text-anchor", "middle").text(attrX);
            if (col === 0) svg.append("text").attr("x", 10).attr("y", row * size + size / 2).attr("text-anchor", "end").text(attrY);
        });
    });
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
