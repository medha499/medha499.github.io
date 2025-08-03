d3.csv("data/restaurant.csv").then(data => {
  data.forEach(d => {
    d.Price = +d.Price;
    d.Quantity = +d.Quantity;
    d.Revenue = d.Price * d.Quantity;

    if (d.Date) {
      const dateParts = d.Date.split('-');
      if (dateParts.length === 3) {
        d.OrderDate = new Date(`${dateParts[1]}/${dateParts[0]}/${dateParts[2]}`);
      }
    }

    // Clean fields
    if (d["Purchase Type"]) {
      // Extract just "Online" or "In-store" from values like "Online \t Gift Card"
      d.PurchaseType = d["Purchase Type"].split(/\s{2,}|\t+/)[0].trim();
    }

    if (d.City) d.City = d.City.trim();
    if (d.Product) d.Product = d.Product.trim();
    if (d.Manager) d.Manager = d.Manager.trim();
  });

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

// Professional color scheme
const colors = {
  primary: '#2c3e50',
  secondary: '#3498db', 
  tertiary: '#27ae60',
  accent: '#e74c3c',
  light: '#ecf0f1',
  dark: '#34495e'
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
      <div class="chart-container">
        <div id="chart"></div>
      </div>
      <div class="insights-box">
        <h4>💡 Key Insights</h4>
        <div id="overview-insights">
          <p>• Projected 2023 growth: <strong>12-18%</strong> across all markets</p>
          <p>• Focus expansion on top-performing cities</p>
          <p>• Consider operational improvements in underperforming markets</p>
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
      <div class="chart-container">
        <div id="chart"></div>
      </div>
      <div class="insights-box">
        <h4>📊 Market Analysis</h4>
        <div id="city-insights"></div>
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
        How customers prefer to purchase ${product} in ${city} - Online vs In-store preferences.
      </p>
      <div class="chart-container">
        <div id="chart"></div>
      </div>
      <div class="insights-box">
        <h4>🎯 Strategic Recommendations</h4>
        <div id="channel-insights"></div>
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
  const width = 1200 - margin.left - margin.right;
  const height = 450 - margin.bottom - margin.top;

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
  ).sort((a, b) => b[1] - a[1]); // Sort by revenue descending

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

  // Create bars with gradient
  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "barGradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0).attr("y1", height)
    .attr("x2", 0).attr("y2", 0);
  
  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colors.secondary);
  
  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colors.primary);

  g.selectAll(".bar")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", "url(#barGradient)")
    .attr("rx", 4)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 0.8)
        .attr("stroke", colors.accent)
        .attr("stroke-width", 2);
      
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 5px;">${d[0]}</div>
        <div>2022 Revenue: <strong>$${formatNumber(d[1])}</strong></div>
        <div>2023 Projection: <strong>$${formatNumber(d[1] * 1.15)}</strong></div>
        <div style="margin-top: 8px; font-style: italic; color: #7f8c8d;">Click to explore products</div>
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
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
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
    .style("font-size", "13px")
    .style("font-weight", "500");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => "$" + formatNumber(d)));

  // Add axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 20)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("fill", colors.dark)
    .text("Revenue (USD)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + 60})`)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("fill", colors.dark)
    .text("City");

  // Update insights
  const topCity = grouped[0];
  document.getElementById('overview-insights').innerHTML = `
    <p>• <strong>${topCity[0]}</strong> leads with $${formatNumber(topCity[1])} revenue</p>
    <p>• Projected 2023 growth: <strong>12-18%</strong> across all markets</p>
    <p>• Focus expansion on top-performing cities for maximum ROI</p>
  `;
}

function createProductChart(city) {
  const margin = {top: 40, right: 40, bottom: 80, left: 100};
  const width = 1200 - margin.left - margin.right;
  const height = 450 - margin.bottom - margin.top;

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

  const x = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1]) * 1.1])
    .range([height, 0]);

  const colorScale = d3.scaleOrdinal()
    .domain(grouped.map(d => d[0]))
    .range([colors.tertiary, colors.secondary, colors.accent, '#9b59b6', '#1abc9c']);

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
    .attr("fill", d => colorScale(d[0]))
    .attr("rx", 4)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 0.8)
        .attr("stroke", colors.dark)
        .attr("stroke-width", 2);
      
      const percentage = ((d[1] / d3.sum(grouped, d => d[1])) * 100).toFixed(1);
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 5px;">${d[0]}</div>
        <div>Revenue: <strong>$${formatNumber(d[1])}</strong></div>
        <div>Market Share: <strong>${percentage}%</strong></div>
        <div style="margin-top: 8px; font-style: italic; color: #7f8c8d;">Click to see purchase channels</div>
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
    .attr("font-weight", "bold")
    .attr("fill", "white")
    .text(d => "$" + formatNumber(d[1]))
    .transition()
    .duration(800)
    .delay((d, i) => i * 100)
    .attr("y", d => y(d[1]) - 8);

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px")
    .style("font-weight", "500");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => "$" + formatNumber(d)));

  // Add axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 20)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("fill", colors.dark)
    .text("Revenue (USD)");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + 60})`)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("fill", colors.dark)
    .text("Product Category");

  // Update insights
  const topProduct = grouped[0];
  const totalRevenue = d3.sum(grouped, d => d[1]);
  const topShare = ((topProduct[1] / totalRevenue) * 100).toFixed(1);
  
  document.getElementById('city-insights').innerHTML = `
    <p>• <strong>${topProduct[0]}</strong> dominates with ${topShare}% market share</p>
    <p>• Total ${city} revenue: <strong>$${formatNumber(totalRevenue)}</strong></p>
    <p>• ${grouped.length} product categories active in this market</p>
  `;
}

function createChannelChart(city, product) {
  const margin = {top: 40, right: 40, bottom: 80, left: 100};
  const width = 1200 - margin.left - margin.right;
  const height = 450 - margin.bottom - margin.top;

  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Filter data and debug
  const filtered = globalData.filter(d => d.City === city && d.Product === product);
  console.log(`Filtered data for ${product} in ${city}:`, filtered);
  console.log(`Available purchase types:`, [...new Set(filtered.map(d => d.PurchaseType))]);

  if (filtered.length === 0) {
    // Show error message
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", colors.dark)
      .text(`No data available for ${product} in ${city}`);
    
    document.getElementById('channel-insights').innerHTML = `
      <p style="color: #e74c3c;">⚠️ No purchase channel data found for this combination</p>
    `;
    return;
  }

  // Process purchase type data more robustly
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
      .attr("x", width / 2)
      .attr("y", height / 2 - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", colors.dark)
      .text(`Purchase channel data not available`);
    
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2 + 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .attr("fill", colors.dark)
      .text(`for ${product} in ${city}`);
    
    document.getElementById('channel-insights').innerHTML = `
      <p style="color: #e74c3c;">⚠️ Purchase type data needs to be properly formatted in the CSV</p>
      <p>Available data: ${filtered.length} orders found, but purchase types are not properly categorized</p>
    `;
    return;
  }

  // Create scales
  const x = d3.scaleBand()
    .domain(validGrouped.map(d => d[0]))
    .range([0, width])
    .padding(0.4);

  const y = d3.scaleLinear()
    .domain([0, d3.max(validGrouped, d => d[1].quantity) * 1.1])
    .range([height, 0]);

  // Color mapping for known purchase types
  const colorMap = {
    'Online': colors.secondary,
    'In-store': colors.tertiary,
    'Delivery': colors.accent,
    'Takeout': '#9b59b6',
    'Drive-thru': '#1abc9c'
  };

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Create bars
  g.selectAll(".bar")
    .data(validGrouped)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d[0]))
    .attr("width", x.bandwidth())
    .attr("y", height)
    .attr("height", 0)
    .attr("fill", d => colorMap[d[0]] || colors.accent)
    .attr("rx", 6)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 0.8)
        .attr("stroke", colors.dark)
        .attr("stroke-width", 2);
      
      const total = d3.sum(validGrouped, d => d[1].quantity);
      const percentage = ((d[1].quantity / total) * 100).toFixed(1);
      const avgOrder = d[1].quantity > 0 ? (d[1].revenue / d[1].quantity).toFixed(2) : "0.00";
      
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 5px;">${d[0]}</div>
        <div>Orders: <strong>${d[1].quantity}</strong> (${percentage}%)</div>
        <div>Revenue: <strong>${formatNumber(d[1].revenue)}</strong></div>
        <div>Avg per Order: <strong>${avgOrder}</strong></div>
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 80) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 1)
        .attr("stroke", "none");
      tooltip.transition().duration(300).style("opacity", 0);
    })
    .transition()
    .duration(800)
    .delay((d, i) => i * 200)
    .attr("y", d => y(d[1].quantity))
    .attr("height", d => height - y(d[1].quantity));

  // Add value labels on bars
  g.selectAll(".bar-label")
    .data(validGrouped)
    .enter().append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d[0]) + x.bandwidth()/2)
    .attr("y", height)
    .attr("text-anchor", "middle")
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .attr("fill", "white")
    .text(d => d[1].quantity)
    .transition()
    .duration(800)
    .delay((d, i) => i * 200)
    .attr("y", d => y(d[1].quantity) - 8);

  // Add percentage labels
  g.selectAll(".percentage-label")
    .data(validGrouped)
    .enter().append("text")
    .attr("class", "percentage-label")
    .attr("x", d => x(d[0]) + x.bandwidth()/2)
    .attr("y", height)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "500")
    .attr("fill", "white")
    .text(d => {
      const total = d3.sum(validGrouped, d => d[1].quantity);
      return ((d[1].quantity / total) * 100).toFixed(0) + "%";
    })
    .transition()
    .duration(800)
    .delay((d, i) => i * 200)
    .attr("y", d => y(d[1].quantity) + 25);

  // Add axes
  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "14px")
    .style("font-weight", "600");

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y));

  // Add axis labels
  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 20)
    .attr("x", 0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("fill", colors.dark)
    .text("Number of Orders");

  g.append("text")
    .attr("class", "axis-label")
    .attr("transform", `translate(${width / 2}, ${height + 60})`)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "500")
    .style("fill", colors.dark)
    .text("Purchase Channel");

  // Update insights
  if (validGrouped.length > 0) {
    const topChannel = validGrouped[0];
    const total = d3.sum(validGrouped, d => d[1].quantity);
    const topPercentage = ((topChannel[1].quantity / total) * 100).toFixed(0);
    
    let recommendation = "";
    if (topChannel[0] === "Online") {
      recommendation = "Invest in digital marketing and mobile app optimization";
    } else if (topChannel[0] === "In-store") {
      recommendation = "Focus on enhancing in-store experience and staff training";
    } else {
      recommendation = `Optimize ${topChannel[0]} operations for better customer experience`;
    }
    
    document.getElementById('channel-insights').innerHTML = `
      <p>• <strong>${topChannel[0]}</strong> is preferred by ${topPercentage}% of customers</p>
      <p>• Total orders: <strong>${total}</strong> for ${product} in ${city}</p>
      <p>• <strong>2023 Strategy:</strong> ${recommendation}</p>
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