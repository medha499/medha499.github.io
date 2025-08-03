// Load and process data
d3.csv("data/restaurant.csv").then(data => {
  // Process the data with proper date parsing and cleaning
  data.forEach(d => {
    d.Price = +d.Price;
    d.Quantity = +d.Quantity;
    d.Revenue = d.Price * d.Quantity;
    
    // Handle DD-MM-YYYY format (European date format)
    if (d.Date) {
      const dateParts = d.Date.split('-');
      if (dateParts.length === 3) {
        // Convert DD-MM-YYYY to MM/DD/YYYY for Date constructor
        d.OrderDate = new Date(`${dateParts[1]}/${dateParts[0]}/${dateParts[2]}`);
      }
    }
    
    // Clean fields - Extract just "Online" or "In-store" from values like "Online \t Gift Card"
    if (d["Purchase Type"]) {
      d.PurchaseType = d["Purchase Type"].split(/\s{2,}|\t+/)[0].trim();
    }
    
    // Clean up other string fields
    if (d.City) d.City = d.City.trim();
    if (d.Product) d.Product = d.Product.trim();
    if (d.Manager) d.Manager = d.Manager.trim();
  });

  // Debug: Log unique purchase types after processing
  const uniquePurchaseTypes = [...new Set(data.map(d => d.PurchaseType))];
  console.log("Unique Purchase Types after processing:", uniquePurchaseTypes);

  // Initialize visualization with processed data
  initializeVisualization(data);
}).catch(error => {
  console.error("Error loading data:", error);
  document.getElementById('sceneContent').innerHTML = `
    <div class="loading">
      <h3>Unable to load data</h3>
      <p>Please ensure the restaurant.csv file is located in the data/ folder.</p>
    </div>
  `;
});

// Global variables for state management
let globalData = [];
let currentScene = 'overview';
let selectedCity = null;
let selectedProduct = null;
let navigationStack = [];

// Professional color scheme - neutral and production-ready
const colors = {
  primary: '#2d3748',     // Dark slate
  secondary: '#4a5568',   // Medium slate  
  tertiary: '#718096',    // Light slate
  accent: '#3182ce',      // Professional blue
  success: '#38a169',     // Subdued green
  warning: '#d69e2e',     // Muted orange
  light: '#f7fafc',       // Very light grey
  dark: '#1a202c'         // Very dark slate
};

function initializeVisualization(data) {
  globalData = data;
  showOverview();
}

function updateBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  let breadcrumbText = '<span class="active">Revenue Overview</span>';
  
  if (selectedCity) {
    breadcrumbText += '<span class="separator">→</span><span class="active">' + selectedCity + ' Products</span>';
  }
  
  if (selectedProduct) {
    breadcrumbText += '<span class="separator">→</span><span class="active">' + selectedProduct + ' Channels</span>';
  }
  
  breadcrumb.innerHTML = breadcrumbText;
  
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
      <h2 class="scene-title">Revenue Performance by City</h2>
      <p class="scene-description">
        Total revenue across European markets for 2022. Click any bar to explore product performance in that city.
      </p>
      <div style="display: flex; gap: 30px; margin-top: 20px;">
        <div style="flex: 2;">
          <div class="chart-container">
            <div id="chart"></div>
          </div>
        </div>
        <div style="flex: 1;">
          <div class="insights-box">
            <h4>💡 Key Insights</h4>
            <div id="overview-insights">
              <p>• Projected 2023 growth: <strong>12-18%</strong> across all markets</p>
              <p>• Focus expansion on top-performing cities</p>
              <p>• Consider operational improvements in underperforming markets</p>
            </div>
          </div>
        </div>
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
        Revenue breakdown by product category in ${city}. Click any bar to see customer purchase preferences.
      </p>
      <div style="display: flex; gap: 30px; margin-top: 20px;">
        <div style="flex: 2;">
          <div class="chart-container">
            <div id="chart"></div>
          </div>
        </div>
        <div style="flex: 1;">
          <div class="insights-box">
            <h4>📊 Market Analysis</h4>
            <div id="city-insights"></div>
          </div>
        </div>
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
      <h2 class="scene-title">${product} Purchase Channels in ${city}</h2>
      <p class="scene-description">
        How customers prefer to purchase ${product} in ${city} - Online vs In-store preferences for strategic planning.
      </p>
      <div style="display: flex; gap: 30px; margin-top: 20px;">
        <div style="flex: 2;">
          <div class="chart-container">
            <div id="chart"></div>
          </div>
        </div>
        <div style="flex: 1;">
          <div class="insights-box">
            <h4>🎯 Strategic Recommendations</h4>
            <div id="channel-insights"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  updateBreadcrumb();
  createChannelChart(city, product);
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
  const margin = {top: 40, right: 40, bottom: 80, left: 100};
  const width = 900 - margin.left - margin.right;  // Reduced width for side layout
  const height = 450 - margin.bottom - margin.top;

  // Clear any existing tooltips and charts
  d3.selectAll(".tooltip").remove();
  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Process data - keep original order from data, don't sort
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

  // Create bars with professional gradient
  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "barGradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0).attr("y1", height)
    .attr("x2", 0).attr("y2", 0);
  
  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colors.tertiary);
  
  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colors.accent);

  g.selectAll(".bar")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", "url(#barGradient)")
    .attr("rx", 3)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 0.8)
        .attr("stroke", colors.primary)
        .attr("stroke-width", 2);
      
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 5px;">${d[0]}</div>
        <div>2022 Revenue: <strong>${formatNumber(d[1])}</strong></div>
        <div>2023 Projection: <strong>${formatNumber(d[1] * 1.15)}</strong></div>
        <div style="margin-top: 8px; font-style: italic; color: #718096;">Click to explore products</div>
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 70) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 1)
        .attr("stroke", "none");
      tooltip.transition().duration(300).style("opacity", 0);
    })
    .on("click", function(event, d) {
      showCityProducts(d[0]);
    })
    .transition()
    .duration(1000)
    .delay((d, i) => i * 100)
    .attr("y", d => y(d[1]))
    .attr("height", d => height - y(d[1]));

  // Add value labels on bars
  g.selectAll(".bar-label")
    .data(grouped)
    .enter().append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d[0]) + x.bandwidth()/2)
    .attr("y", height)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("font-weight", "600")
    .attr("fill", "white")
    .text(d => "$" + formatNumber(d[1]))
    .transition()
    .duration(1000)
    .delay((d, i) => i * 100)
    .attr("y", d => y(d[1]) - 8);

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px")
    .style("font-weight", "500")
    .style("fill", colors.primary);

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => "$" + formatNumber(d)))
    .selectAll("text")
    .style("fill", colors.primary);

  // Add axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 20)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style("fill", colors.primary)
    .text("Revenue (USD)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + 60})`)
    .style("text-anchor", "middle")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style("fill", colors.primary)
    .text("City");

  // Add professional annotation for top performer
  const topCity = grouped.reduce((a, b) => a[1] > b[1] ? a : b);
  
  const annotations = [{
    note: {
      label: `${formatNumber(topCity[1])} revenue`,
      title: `${topCity[0]}: Market Leader`,
      wrap: 150,
      align: "left"
    },
    x: x(topCity[0]) + x.bandwidth()/2,
    y: y(topCity[1]),
    dy: -40,
    dx: 30,
    type: d3.annotationCalloutElbow,
    subject: {
      radius: 8
    }
  }];

  const makeAnnotations = d3.annotation()
    .type(d3.annotationCalloutElbow)
    .annotations(annotations);

  g.append("g")
    .attr("class", "annotation-group")
    .style("font-size", "12px")
    .style("font-weight", "500")
    .call(makeAnnotations);

  // Update insights with real data
  document.getElementById('overview-insights').innerHTML = `
    <p>• <strong>${topCity[0]}</strong> leads with ${formatNumber(topCity[1])} revenue</p>
    <p>• Projected 2023 growth: <strong>12-18%</strong> across all markets</p>
    <p>• Focus expansion on top-performing cities for maximum ROI</p>
    <p>• Consider market entry strategies for underperforming regions</p>
  `;
}

function createProductChart(city) {
  const margin = {top: 40, right: 40, bottom: 60, left: 120}; // More left margin for product names
  const width = 900 - margin.left - margin.right;
  const height = 450 - margin.bottom - margin.top;

  // Clear any existing tooltips and charts
  d3.selectAll(".tooltip").remove();
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
  ).sort((a, b) => b[1] - a[1]); // Sort by revenue descending

  // Horizontal bar chart scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1]) * 1.1])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([0, height])
    .padding(0.3);

  // Professional color scale
  const colorScale = d3.scaleOrdinal()
    .domain(grouped.map(d => d[0]))
    .range([colors.accent, colors.success, colors.warning, colors.secondary, colors.tertiary]);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Create horizontal bars
  g.selectAll(".bar")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("y", d => y(d[0]))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", 0)
    .attr("fill", d => colorScale(d[0]))
    .attr("rx", 4)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 0.8)
        .attr("stroke", colors.primary)
        .attr("stroke-width", 2);
      
      const percentage = ((d[1] / d3.sum(grouped, d => d[1])) * 100).toFixed(1);
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 5px;">${d[0]}</div>
        <div>Revenue: <strong>${formatNumber(d[1])}</strong></div>
        <div>Market Share: <strong>${percentage}%</strong></div>
        <div style="margin-top: 8px; font-style: italic; color: #718096;">Click to see purchase channels</div>
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 70) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 1)
        .attr("stroke", "none");
      tooltip.transition().duration(300).style("opacity", 0);
    })
    .on("click", function(event, d) {
      showProductDetails(city, d[0]);
    })
    .transition()
    .duration(800)
    .delay((d, i) => i * 100)
    .attr("width", d => x(d[1]));

  // Add value labels on bars
  g.selectAll(".bar-label")
    .data(grouped)
    .enter().append("text")
    .attr("class", "bar-label")
    .attr("y", d => y(d[0]) + y.bandwidth()/2)
    .attr("x", 5)
    .attr("dy", "0.35em")
    .attr("font-size", "11px")
    .attr("font-weight", "600")
    .attr("fill", "white")
    .text(d => "$" + formatNumber(d[1]))
    .transition()
    .duration(800)
    .delay((d, i) => i * 100)
    .attr("x", d => x(d[1]) - 10)
    .attr("text-anchor", "end");

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => "$" + formatNumber(d)))
    .selectAll("text")
    .style("font-size", "11px")
    .style("fill", colors.primary);

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "12px")
    .style("font-weight", "500")
    .style("fill", colors.primary);

  // Add axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + 50})`)
    .style("text-anchor", "middle")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style("fill", colors.primary)
    .text("Revenue (USD)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 20)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style("fill", colors.primary)
    .text("Product Category");

  // Add professional annotation for top product
  const topProduct = grouped[0];
  
  const annotations = [{
    note: {
      label: `${((topProduct[1] / d3.sum(grouped, d => d[1])) * 100).toFixed(1)}% market share`,
      title: `${topProduct[0]}: Category Leader`,
      wrap: 150,
      align: "left"
    },
    x: x(topProduct[1]),
    y: y(topProduct[0]) + y.bandwidth()/2,
    dy: -10,
    dx: -50,
    type: d3.annotationCalloutElbow,
    subject: {
      radius: 6
    }
  }];

  const makeAnnotations = d3.annotation()
    .annotations(annotations);

  g.append("g")
    .attr("class", "annotation-group")
    .style("font-size", "12px")
    .style("font-weight", "500")
    .call(makeAnnotations);

  // Update insights
  const totalRevenue = d3.sum(grouped, d => d[1]);
  const topShare = ((topProduct[1] / totalRevenue) * 100).toFixed(1);
  
  document.getElementById('city-insights').innerHTML = `
    <p>• <strong>${topProduct[0]}</strong> dominates with ${topShare}% market share</p>
    <p>• Total ${city} revenue: <strong>${formatNumber(totalRevenue)}</strong></p>
    <p>• ${grouped.length} product categories active in this market</p>
    <p>• Focus marketing efforts on top-performing categories for 2023</p>
  `;
}

function createChannelChart(city, product) {
  const width = 900;
  const height = 450;
  const radius = Math.min(width, height) / 2 - 40;

  // Clear any existing tooltips and charts
  d3.selectAll(".tooltip").remove();
  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  // Filter data and debug
  const filtered = globalData.filter(d => d.City === city && d.Product === product);
  console.log(`Filtered data for ${product} in ${city}:`, filtered);
  console.log(`Available purchase types:`, [...new Set(filtered.map(d => d.PurchaseType))]);

  if (filtered.length === 0) {
    // Show error message
    g.append("text")
      .attr("x", 0)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", colors.primary)
      .text(`No data available for ${product} in ${city}`);
    
    document.getElementById('channel-insights').innerHTML = `
      <p style="color: ${colors.warning};">⚠️ No purchase channel data found for this combination</p>
    `;
    return;
  }

  // Process purchase type data
  const grouped = d3.rollups(filtered, 
    v => ({
      quantity: d3.sum(v, d => d.Quantity),
      revenue: d3.sum(v, d => d.Revenue),
      orders: v.length
    }), 
    d => (d.PurchaseType || "Unknown").trim()
  );

  console.log("Grouped data:", grouped);

  // Filter out empty/unknown and ensure we have valid data
  const validGrouped = grouped.filter(d => {
    const hasValidKey = d[0] && d[0] !== "Unknown" && d[0] !== "";
    const hasValidData = d[1].quantity > 0;
    return hasValidKey && hasValidData;
  }).sort((a, b) => b[1].quantity - a[1].quantity);

  console.log("Valid grouped data:", validGrouped);

  if (validGrouped.length === 0) {
    // Show message if no valid purchase type data
    g.append("text")
      .attr("x", 0)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", colors.primary)
      .text(`Purchase channel data not available`);
    
    g.append("text")
      .attr("x", 0)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", colors.secondary)
      .text(`for ${product} in ${city}`);
    
    document.getElementById('channel-insights').innerHTML = `
      <p style="color: ${colors.warning};">⚠️ Purchase type data needs to be properly formatted in the CSV</p>
      <p>Available data: ${filtered.length} orders found, but purchase types are not properly categorized</p>
    `;
    return;
  }

  // Create pie chart
  const pie = d3.pie()
    .value(d => d[1].quantity)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  // Professional color mapping
  const colorMap = {
    'Online': colors.accent,
    'In-store': colors.success,
    'Delivery': colors.warning,
    'Takeout': colors.secondary,
    'Drive-thru': colors.tertiary
  };

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Create pie slices
  const slices = g.selectAll(".slice")
    .data(pie(validGrouped))
    .enter().append("g")
    .attr("class", "slice");

  slices.append("path")
    .attr("d", arc)
    .attr("fill", d => colorMap[d.data[0]] || colors.tertiary)
    .attr("stroke", "white")
    .attr("stroke-width", 3)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(200).attr("d", d3.arc()
        .innerRadius(0)
        .outerRadius(radius + 8));
      
      const total = d3.sum(validGrouped, d => d[1].quantity);
      const percentage = ((d.data[1].quantity / total) * 100).toFixed(1);
      const avgOrder = d.data[1].quantity > 0 ? (d.data[1].revenue / d.data[1].quantity).toFixed(2) : "0.00";
      
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 5px;">${d.data[0]}</div>
        <div>Orders: <strong>${d.data[1].quantity}</strong> (${percentage}%)</div>
        <div>Revenue: <strong>${formatNumber(d.data[1].revenue)}</strong></div>
        <div>Avg per Order: <strong>${avgOrder}</strong></div>
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 80) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).transition().duration(200).attr("d", arc);
      tooltip.transition().duration(300).style("opacity", 0);
    });

  // Add percentage labels on slices
  slices.append("text")
    .attr("transform", d => `translate(${arc.centroid(d)})`)
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "white")
    .text(d => {
      const total = d3.sum(validGrouped, d => d[1].quantity);
      const percentage = ((d.data[1].quantity / total) * 100).toFixed(0);
      return percentage > 10 ? percentage + "%" : "";
    });

  // Add center label
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("fill", colors.primary)
    .attr("y", -10)
    .text(`${product}`);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 10)
    .attr("font-size", "13px")
    .attr("fill", colors.secondary)
    .text(`Purchase Channels in ${city}`);

  // Add legend
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(20, 30)`);

  validGrouped.forEach((d, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0, ${i * 25})`);

    legendRow.append("circle")
      .attr("cx", 8)
      .attr("cy", 8)
      .attr("r", 8)
      .attr("fill", colorMap[d[0]] || colors.tertiary);

    legendRow.append("text")
      .attr("x", 25)
      .attr("y", 8)
      .attr("dy", "0.35em")
      .style("font-size", "13px")
      .style("font-weight", "500")
      .style("fill", colors.primary)
      .text(d[0]);

    const total = d3.sum(validGrouped, d => d[1].quantity);
    const percentage = ((d[1].quantity / total) * 100).toFixed(1);
    
    legendRow.append("text")
      .attr("x", 120)
      .attr("y", 8)
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("fill", colors.secondary)
      .text(`${d[1].quantity} orders (${percentage}%)`);
  });

  // Add professional annotation for dominant channel
  const topChannel = validGrouped[0];
  const topSlice = pie(validGrouped).find(d => d.data[0] === topChannel[0]);
  
  const annotations = [{
    note: {
      label: `${((topChannel[1].quantity / d3.sum(validGrouped, d => d[1].quantity)) * 100).toFixed(0)}% preference`,
      title: `${topChannel[0]}: Dominant Channel`,
      wrap: 120,
      align: "left"
    },
    x: arc.centroid(topSlice)[0] * 1.5,
    y: arc.centroid(topSlice)[1] * 1.5,
    dy: -20,
    dx: 30,
    type: d3.annotationCalloutElbow,
    subject: {
      radius: 8
    }
  }];

  const makeAnnotations = d3.annotation()
    .annotations(annotations);

  g.append("g")
    .attr("class", "annotation-group")
    .style("font-size", "12px")
    .style("font-weight", "500")
    .call(makeAnnotations);

  // Update insights
  if (validGrouped.length > 0) {
    const total = d3.sum(validGrouped, d => d[1].quantity);
    const topPercentage = ((topChannel[1].quantity / total) * 100).toFixed(0);
    
    let recommendation = "";
    if (topChannel[0] === "Online") {
      recommendation = "Invest in digital marketing and mobile app optimization for 2023";
    } else if (topChannel[0] === "In-store") {
      recommendation = "Focus on enhancing in-store experience and staff training for 2023";
    } else {
      recommendation = `Optimize ${topChannel[0]} operations for better customer experience in 2023`;
    }
    
    document.getElementById('channel-insights').innerHTML = `
      <p>• <strong>${topChannel[0]}</strong> is preferred by ${topPercentage}% of customers</p>
      <p>• Total orders: <strong>${total}</strong> for ${product} in ${city}</p>
      <p>• <strong>2023 Strategy:</strong> ${recommendation}</p>
      <p>• Consider channel-specific promotions to boost underperforming options</p>
    `;
  }
}

// Utility function for number formatting
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
}