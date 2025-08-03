d3.csv("data/restaurant.csv").then(data => {
  data.forEach(d => {
    d.Price = +d.Price;
    d.Quantity = +d.Quantity;
    d.Revenue = d.Price * d.Quantity;
    d.OrderDate = new Date(d.OrderDate);
  });

  showScene1(data);
});

const tooltip = d3.select("body")
  .append("div")
  .style("position", "absolute")
  .style("background", "#ffffff")
  .style("border", "1px solid #ccc")
  .style("padding", "8px")
  .style("border-radius", "5px")
  .style("box-shadow", "0px 2px 10px rgba(0,0,0,0.1)")
  .style("pointer-events", "none")
  .style("font-size", "13px")
  .style("display", "none")
  .on("mouseover", (event, d) => {
  tooltip.style("display", "block")
         .html(`Label: <strong>${d[0]}</strong><br>Value: <strong>${d[1].toFixed(2)}</strong>`)
         .style("left", (event.pageX + 10) + "px")
         .style("top", (event.pageY - 28) + "px");
})
.on("mouseout", () => tooltip.style("display", "none"));




function showScene1(data) {
  d3.select("#vis").html(""); // Clear previous

  const svg = d3.select("#vis").append("svg").attr("width", 800).attr("height", 500);
  const grouped = d3.rollups(data, v => d3.sum(v, d => d.Revenue), d => d.City);
  
  const x = d3.scaleBand().domain(grouped.map(d => d[0])).range([50, 750]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(grouped, d => d[1])]).range([450, 50]);

  svg.selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => 450 - y(d[1]))
    .attr("fill", "#3498db")
    .on("click", d => showScene2(data, d[0]));

    
  svg.append("g").attr("transform", "translate(0,450)").call(d3.axisBottom(x));
  svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(y));

  // Annotation
  const topCity = grouped.reduce((a,b) => a[1]>b[1]?a:b);
  svg.append("text")
     .attr("x", x(topCity[0]))
     .attr("y", y(topCity[1]) - 10)
     .attr("class", "annotation")
     .text(`Top City: ${topCity[0]}`);
}



function showScene2(data, city) {
  d3.select("#vis").html("");

  const cityData = data.filter(d => d.City === city);
  const grouped = d3.rollups(cityData, v => d3.sum(v, d => d.Revenue), d => d.Product);

  const svg = d3.select("#vis").append("svg").attr("width", 800).attr("height", 500);
  const x = d3.scaleBand().domain(grouped.map(d => d[0])).range([50, 750]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(grouped, d => d[1])]).range([450, 50]);

  svg.selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => 450 - y(d[1]))
    .attr("fill", "#2ecc71")
    .on("click", d => showScene3(cityData, d[0]));

  svg.append("g").attr("transform", "translate(0,450)").call(d3.axisBottom(x));
  svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(y));

  svg.append("text")
     .attr("x", 50)
     .attr("y", 30)
     .attr("class", "annotation")
     .text(`Product sales in ${city}`);
}



function showScene3(cityData, product) {
  d3.select("#vis").html("");

  const filtered = cityData.filter(d => d.Product === product);
  const grouped = d3.rollups(filtered, v => d3.sum(v, d => d.Quantity), d => d.PurchaseType);

  const svg = d3.select("#vis").append("svg").attr("width", 800).attr("height", 500);
  const x = d3.scaleBand().domain(grouped.map(d => d[0])).range([50, 750]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(grouped, d => d[1])]).range([450, 50]);

  svg.selectAll("rect")
    .data(grouped)
    .enter()
    .append("rect")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => 450 - y(d[1]))
    .attr("fill", "#f39c12");

  svg.append("g").attr("transform", "translate(0,450)").call(d3.axisBottom(x));
  svg.append("g").attr("transform", "translate(50,0)").call(d3.axisLeft(y));

  svg.append("text")
     .attr("x", 50)
     .attr("y", 30)
     .attr("class", "annotation")
     .text(`Purchase Type for ${product} in city`);
}

