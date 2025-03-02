// static/js/d3_script_2a.js

async function loadDashboard() {
    const pcaResponse = await fetch('/pca');
    const pcaData = await pcaResponse.json();

    const eigenvalues = pcaData.eigenvalues;
    drawScreePlot(eigenvalues);

    const kmeansResponse = await fetch('/kmeans');
    const kmeansData = await kmeansResponse.json();
    drawMSEPlot(kmeansData.mse_scores);

    populatePCSelectors(eigenvalues.length);

    loadTopAttributes(2);
}

function drawScreePlot(eigenvalues) {
    const svg = d3.select("#scree-plot").append("svg").attr("width", 500).attr("height", 300);
    const xScale = d3.scaleBand().domain(d3.range(eigenvalues.length)).range([50, 500]).padding(0.1);
    const yScale = d3.scaleLinear().domain([0, d3.max(eigenvalues)]).range([250, 50]);
    svg.append("text").attr("x", 250).attr("y", 20).attr("text-anchor", "middle").text("Scree Plot");

    //Add Y-axis label
    svg.append("text")
        .attr("x", -150).attr("y", 25)
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Variance Explained");

    svg.append("g").attr("transform", "translate(0,250)").call(d3.axisBottom(xScale).tickFormat(d => d + 1));
    svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(yScale));
    svg.selectAll("rect").data(eigenvalues).enter().append("rect")
        .attr("x", (d, i) => xScale(i))
        .attr("y", d => yScale(d))
        .attr("width", xScale.bandwidth())
        .attr("height", d => 250 - yScale(d))
        .attr("fill", (d, i) => i === findElbowIndex(eigenvalues) ? "orange" : "steelblue");

}

function drawMSEPlot(mseScores) {
    const svg = d3.select("#mse-plot").append("svg").attr("width", 500).attr("height", 300);
    const xScale = d3.scaleBand().domain(d3.range(1, mseScores.length + 1)).range([50, 500]).padding(0.1);
    const yScale = d3.scaleLinear().domain([0, d3.max(mseScores)]).range([250, 50]);
    svg.append("text").attr("x", 250).attr("y", 20).attr("text-anchor", "middle").text("K-Means MSE Plot");

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

async function drawBiplot() {
    const pc1 = +document.getElementById('pc1').value;
    const pc2 = +document.getElementById('pc2').value;
    const response = await fetch('/pca');
    const data = await response.json();
    const scores = data.scores;

    d3.select("#biplot").html("");
    const svg = d3.select("#biplot").append("svg").attr("width", 500).attr("height", 300);
    const xScale = d3.scaleLinear().domain(d3.extent(scores, d => d[pc1])).range([50, 500]);
    const yScale = d3.scaleLinear().domain(d3.extent(scores, d => d[pc2])).range([250, 50]);
    svg.append("text").attr("x", 250).attr("y", 20).attr("text-anchor", "middle").text("Biplot");

    svg.append("g").attr("transform", "translate(0,250)").call(d3.axisBottom(xScale));
    svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(yScale));

    svg.selectAll("circle").data(scores).enter().append("circle")
        .attr("cx", d => xScale(d[pc1]))
        .attr("cy", d => yScale(d[pc2]))
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
            elbowIndex = i;
        }
    }
    return elbowIndex;
}
