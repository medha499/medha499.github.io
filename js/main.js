// Load and process data
d3.csv("data/restaurant.csv").then(data => {
  // Process the data
  data.forEach(d => {
    d.Price = +d.Price;
    d.Quantity = +d.Quantity;
    d.Revenue = d.Price * d.Quantity;
    d.OrderDate = new Date(d.Date || d.OrderDate);
  });

  // Initialize visualization with processed data
  initializeVisualization(data);
}).catch(error => {
  console.error("Error loading data:", error);
  // Show error message to user
  document.getElementById('sceneContent').innerHTML = `
    <div class="loading">
      Error loading data. Please check that the restaurant.csv file is in the data/ folder.
    </div>
  `;
});

// Global variables for state management
let globalData = [];
let currentScene = 'overview';
let selectedCity = null;
let selectedProduct = null;
let navigationStack = [];

// Color scheme
const colors = {
  primary: '#3498db',
  secondary: '#2ecc71', 
  tertiary: '#f39c12',
  accent: '#e74c3c'
};

function initializeVisualization(data) {
  globalData = data;
  showOverview();
}

function updateBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  let breadcrumbText = '<span class="active">City Overview</span>';
  
  if (selectedCity) {
    breadcrumbText += '<span class="separator">→</span><span class="active">' + selectedCity + ' Products</span>';
  }
  
  if (selectedProduct) {
    breadcrumbText += '<span class="separator">→</span><span class="active">' + selectedProduct + ' Details</span>';
  }
  
  breadcrumb.innerHTML = breadcrumbText;
  
  // Update back button
  const backButton = document.getElementById('backButton');
  backButton.disabled = navigationStack.length === 0;
}

function showOverview() {
  currentScene = 'overview';
  selectedCity = null;
  selectedProduct = null;
  navigationStack = [];
  
  const content = document.getElementById('sceneContent');
  content.innerHTML = `
    <div class="scene-content">
      <h2 class="scene-title">City Sales Performance</h2>
      <p class="scene-description">
        Explore total revenue by city to identify top-performing locations. 
        Click on any bar to drill down into product-level performance for that city.
      </p>
      <div class="instruction">
        💡 <strong>Tip:</strong> Click on any city bar to explore product sales in that location
      </div>
      <div class="chart-container">
        <div id="chart"></div>
      </div>
    </div>
  `;
  
  updateBreadcrumb();
  createCityChart();
}

function showCityProducts(city) {
  navigationStack.push({scene: 'overview'});
  currentScene = 'city';
  selectedCity = city;
  selectedProduct = null;
  
  const content = document.getElementById('sceneContent');
  content.innerHTML = `
    <div class="scene-content">
      <h2 class="scene-title">Product Performance in ${city}</h2>
      <p class="scene-description">
        Analyze which products drive the most revenue in ${city}. 
        Click on any product to see purchase type breakdown.
      </p>
      <div class="instruction">
        💡 <strong>Tip:</strong> Click on any product bar to see how customers prefer to purchase that item
      </div>
      <div class="chart-container">
        <div id="chart"></div>
      </div>
    </div>
  `;
  
  updateBreadcrumb();
  createProductChart(city);
}

function showProductDetails(city, product) {
  navigationStack.push({scene: 'city', city: city});
  currentScene = 'product';
  selectedProduct = product;
  
  const content = document.getElementById('sceneContent');
  content.innerHTML = `
    <div class="scene-content">
      <h2 class="scene-title">${product} Purchase Patterns in ${city}</h2>
      <p class="scene-description">
        Understand how customers prefer to purchase ${product} in ${city}. 
        This data helps optimize service delivery and staffing.
      </p>
      <div class="instruction">
        📊 <strong>Insight:</strong> Use this data to optimize service capacity for different purchase types
      </div>
      <div class="chart-container">
        <div id="chart"></div>
      </div>
    </div>
  `;
  
  updateBreadcrumb();
  createPurchaseTypeChart(city, product);
}

function goBack() {
  if (navigationStack.length === 0) return;
  
  const previous = navigationStack.pop();
  
  if (previous.scene === 'overview') {
    showOverview();
  } else if (previous.scene === 'city') {
    showCityProducts(previous.city);
  }
}

function createCityChart() {
  const margin = {top: 60, right: 30, bottom: 80, left: 80};
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.bottom - margin.top;

  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Process data
  const grouped = d3.rollups(globalData, 
    v => d3.sum(v, d => d.Revenue), 
    d => d.City
  );

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1]) * 1.1])
    .range([height, 0]);

  // Create tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Create bars
  g.selectAll(".bar")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", colors.primary)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", colors.accent);
      tooltip.transition().duration(200).style("opacity", .9);
      tooltip.html(`
        <strong>${d[0]}</strong><br/>
        Revenue: $${d[1].toFixed(2)}<br/>
        <em>Click to explore products</em>
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).attr("fill", colors.primary);
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function(event, d) {
      showCityProducts(d[0]);
    })
    .transition()
    .duration(800)
    .attr("y", d => y(d[1]))
    .attr("height", d => height - y(d[1]));

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => "$" + d.toFixed(0)));

  // Add axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Total Revenue ($)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 20})`)
    .style("text-anchor", "middle")
    .text("City");

  // Add annotation for highest performing city
  if (grouped.length > 0) {
    const topCity = grouped.reduce((a, b) => a[1] > b[1] ? a : b);
    
    const annotations = [{
      note: {
        label: `Highest revenue: $${topCity[1].toFixed(2)}`,
        title: `${topCity[0]} leads in sales`
      },
      x: x(topCity[0]) + x.bandwidth()/2,
      y: y(topCity[1]) - 10,
      dy: -30,
      dx: 30
    }];

    const makeAnnotations = d3.annotation()
      .type(d3.annotationCalloutCircle)
      .annotations(annotations);

    g.append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations);
  }
}

function createProductChart(city) {
  const margin = {top: 60, right: 30, bottom: 80, left: 80};
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.bottom - margin.top;

  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const cityData = globalData.filter(d => d.City === city);
  const grouped = d3.rollups(cityData, 
    v => d3.sum(v, d => d.Revenue), 
    d => d.Product
  );

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1]) * 1.1])
    .range([height, 0]);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  g.selectAll(".bar")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", colors.secondary)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", colors.accent);
      tooltip.transition().duration(200).style("opacity", .9);
      tooltip.html(`
        <strong>${d[0]}</strong><br/>
        Revenue: $${d[1].toFixed(2)}<br/>
        <em>Click to see purchase types</em>
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).attr("fill", colors.secondary);
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function(event, d) {
      showProductDetails(city, d[0]);
    })
    .transition()
    .duration(800)
    .attr("y", d => y(d[1]))
    .attr("height", d => height - y(d[1]));

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => "$" + d.toFixed(0)));

  // Add axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Revenue ($)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 20})`)
    .style("text-anchor", "middle")
    .text("Product");

  // Add annotation for top product
  if (grouped.length > 0) {
    const topProduct = grouped.reduce((a, b) => a[1] > b[1] ? a : b);
    
    const annotations = [{
      note: {
        label: `$${topProduct[1].toFixed(2)} revenue`,
        title: `Top seller in ${city}`
      },
      x: x(topProduct[0]) + x.bandwidth()/2,
      y: y(topProduct[1]) - 10,
      dy: -30,
      dx: 30
    }];

    const makeAnnotations = d3.annotation()
      .type(d3.annotationCalloutCircle)
      .annotations(annotations);

    g.append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations);
  }
}

function createPurchaseTypeChart(city, product) {
  const margin = {top: 60, right: 30, bottom: 80, left: 80};
  const width = 800 - margin.left - margin.right;
  const height = 400 - margin.bottom - margin.top;

  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = globalData.filter(d => d.City === city && d.Product === product);
  const grouped = d3.rollups(filtered, 
    v => d3.sum(v, d => d.Quantity), 
    d => d.PurchaseType
  );

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1]) * 1.1])
    .range([height, 0]);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  g.selectAll(".bar")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", colors.tertiary)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", colors.accent);
      tooltip.transition().duration(200).style("opacity", .9);
      tooltip.html(`
        <strong>${d[0]}</strong><br/>
        Quantity: ${d[1]} orders
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).attr("fill", colors.tertiary);
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .transition()
    .duration(800)
    .attr("y", d => y(d[1]))
    .attr("height", d => height - y(d[1]));

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y));

  // Add axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Quantity Sold");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 20})`)
    .style("text-anchor", "middle")
    .text("Purchase Type");

  // Add annotation for most popular purchase type
  if (grouped.length > 0) {
    const topType = grouped.reduce((a, b) => a[1] > b[1] ? a : b);
    
    const annotations = [{
      note: {
        label: `${topType[1]} orders`,
        title: `Most popular: ${topType[0]}`
      },
      x: x(topType[0]) + x.bandwidth()/2,
      y: y(topType[1]) - 10,
      dy: -30,
      dx: 30
    }];

    const makeAnnotations = d3.annotation()
      .type(d3.annotationCalloutCircle)
      .annotations(annotations);

    g.append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations);
  }
}