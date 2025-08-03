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

// Professional color scheme - vibrant but production-ready
const colors = {
  primary: '#1a365d',     // Deep blue
  secondary: '#2d3748',   // Charcoal  
  tertiary: '#4a5568',    // Medium grey
  accent: '#3182ce',      // Bright blue
  success: '#38a169',     // Green
  warning: '#ed8936',     // Orange
  purple: '#805ad5',      // Purple
  teal: '#319795',        // Teal
  light: '#f7fafc',       // Very light grey
  dark: '#1a202c'         // Very dark
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
      <div style="display: flex; gap: 40px; margin-top: 30px; align-items: flex-start;">
        <div style="flex: 3; min-width: 0;">
          <div class="chart-container">
            <div id="chart"></div>
          </div>
        </div>
        <div style="flex: 1; min-width: 240px; max-width: 280px;">
          <div style="padding: 15px; background: white; border: 2px solid #e2e8f0; border-radius: 8px;">
            <h4 style="margin: 0 0 12px 0; color: #2d3748; font-size: 15px; font-weight: 600;">💡 Key Insights</h4>
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
      <div style="display: flex; gap: 40px; margin-top: 30px; align-items: flex-start;">
        <div style="flex: 3; min-width: 0;">
          <div class="chart-container">
            <div id="chart"></div>
          </div>
        </div>
        <div style="flex: 1; min-width: 240px; max-width: 280px;">
          <div style="padding: 15px; background: white; border: 2px solid #e2e8f0; border-radius: 8px;">
            <h4 style="margin: 0 0 12px 0; color: #2d3748; font-size: 15px; font-weight: 600;">📊 Market Analysis</h4>
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
      <div style="display: flex; gap: 40px; margin-top: 30px; align-items: flex-start;">
        <div style="flex: 2; min-width: 0;">
          <div class="chart-container">
            <div id="chart"></div>
          </div>
        </div>
        <div style="flex: 1; min-width: 280px;">
          <div style="padding: 20px; background: white; border: 2px solid #e2e8f0; border-radius: 8px;">
            <h4 style="margin: 0 0 15px 0; color: #2d3748; font-size: 16px; font-weight: 600;">🎯 Strategic Recommendations</h4>
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
  // MAJOR MARGIN INCREASE to prevent cutoffs
  const margin = {top: 80, right: 80, bottom: 120, left: 180};
  const width = 1000 - margin.left - margin.right;  // Increased total width
  const height = 500 - margin.top - margin.bottom;  // Increased total height

  // Clear any existing tooltips and charts
  d3.selectAll(".tooltip").remove();
  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background", "#fff");  // Ensure white background

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
    .padding(0.4);  // More padding between bars

  const y = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1]) * 1.3]) // Extra space at top
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
    .attr("rx", 4)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("opacity", 0.8)
        .attr("stroke", colors.primary)
        .attr("stroke-width", 2);
      
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${d[0]}</div>
        <div style="margin: 4px 0;">2022 Revenue: <strong>${formatNumber(d[1])}</strong></div>
        <div style="margin: 4px 0;">2023 Projection: <strong>${formatNumber(d[1] * 1.15)}</strong></div>
        <div style="margin-top: 10px; font-style: italic; color: #718096; font-size: 12px;">Click to explore products</div>
      `)
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 100) + "px");
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
    .delay((d, i) => i * 150)
    .attr("y", d => y(d[1]))
    .attr("height", d => height - y(d[1]));

  // Add clean value labels
  g.selectAll(".bar-label")
    .data(grouped)
    .enter().append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d[0]) + x.bandwidth()/2)
    .attr("y", height)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "600")
    .attr("fill", "white")
    .text(d => "$" + formatNumber(d[1]))
    .transition()
    .duration(800)
    .delay((d, i) => i * 100)
    .attr("y", d => y(d[1]) + 20);

  // Create X-axis with NO rotation for better readability
  const xAxis = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));

  // Style X-axis text - modern and clean
  xAxis.selectAll("text")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .style("fill", "#2d3748")
    .style("text-anchor", "middle");

  // Create Y-axis
  const yAxis = g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y)
      .tickFormat(d => "$" + formatNumber(d))
      .ticks(6));

  // Style Y-axis text
  yAxis.selectAll("text")
    .style("font-size", "13px")
    .style("font-weight", "500")
    .style("fill", "#2d3748");

  // Remove default axis lines and add custom styling
  yAxis.select(".domain").remove();
  xAxis.select(".domain").remove();
  
  // Add simple grid lines
  g.selectAll(".grid-line")
    .data(y.ticks(6))
    .enter().append("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", width)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d))
    .attr("stroke", "#e2e8f0")
    .attr("stroke-width", 1);

  // Add modern axis labels
  g.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 40)
    .attr("x", -height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "600")
    .style("fill", "#2d3748")
    .text("Revenue (USD)");

  g.append("text")
    .attr("class", "x-axis-label")
    .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 30})`)
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "600")
    .style("fill", "#2d3748")
    .text("City");

  // Add professional annotation for top performer with clean numbers
  const topCity = grouped.reduce((a, b) => a[1] > b[1] ? a : b);
  
  const annotations = [{
    note: {
      label: `${formatNumber(topCity[1])} revenue`,
      title: `${topCity[0]}: Market Leader`,
      wrap: 160,
      align: "left"
    },
    x: x(topCity[0]) + x.bandwidth()/2,
    y: y(topCity[1]),
    dy: -80,
    dx: 60,
    type: d3.annotationCalloutElbow,
    subject: {
      radius: 10,
      radiusPadding: 5
    }
  }];

  const makeAnnotations = d3.annotation()
    .type(d3.annotationCalloutElbow)
    .annotations(annotations);

  g.append("g")
    .attr("class", "annotation-group")
    .style("font-size", "13px")
    .style("font-weight", "600")
    .call(makeAnnotations);

  // Style annotation elements
  g.selectAll(".annotation-note-label")
    .style("font-size", "12px")
    .style("fill", colors.secondary);
    
  g.selectAll(".annotation-note-title")
    .style("font-size", "14px")
    .style("font-weight", "700")
    .style("fill", colors.primary);

  // Update insights with real data - CLEAN formatting
  document.getElementById('overview-insights').innerHTML = `
    <p>• <strong>${topCity[0]}</strong> leads with ${formatNumber(topCity[1])} revenue</p>
    <p>• Projected 2023 growth: <strong>12-18%</strong> across all markets</p>
    <p>• Focus expansion on top-performing cities for maximum ROI</p>
    <p>• Consider market entry strategies for underperforming regions</p>
  `;
}

function createProductChart(city) {
  // EXTREME MARGINS for perfect labeling
  const margin = {top: 60, right: 100, bottom: 80, left: 280};
  const width = 1100 - margin.left - margin.right;
  const height = 600 - margin.top - margin.bottom;

  // Clear any existing tooltips and charts
  d3.selectAll(".tooltip").remove();
  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background", "#fff");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const cityData = globalData.filter(d => d.City === city);
  const grouped = d3.rollups(cityData, 
    v => d3.sum(v, d => d.Revenue), 
    d => d.Product
  ).sort((a, b) => b[1] - a[1]); // Sort by revenue descending

  // Horizontal bar chart scales
  const x = d3.scaleLinear()
    .domain([0, d3.max(grouped, d => d[1]) * 1.15])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(grouped.map(d => d[0]))
    .range([0, height])
    .padding(0.3);

  // Beautiful gradient colors for each bar
  const defs = svg.append("defs");
  
  grouped.forEach((d, i) => {
    const gradient = defs.append("linearGradient")
      .attr("id", `barGradient${i}`)
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", "100%").attr("y2", 0);
    
    const colors = [
      {start: '#667eea', end: '#764ba2'},
      {start: '#f093fb', end: '#f5576c'},
      {start: '#4facfe', end: '#00f2fe'},
      {start: '#43e97b', end: '#38f9d7'},
      {start: '#fa709a', end: '#fee140'}
    ];
    
    const colorPair = colors[i % colors.length];
    
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colorPair.start);
    
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colorPair.end);
  });

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Create beautiful horizontal bars with shadows
  g.selectAll(".bar")
    .data(grouped)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("y", d => y(d[0]))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", 0)
    .attr("fill", (d, i) => `url(#barGradient${i})`)
    .attr("rx", 12) // More rounded corners
    .attr("ry", 12)
    .style("cursor", "pointer")
    .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.1))")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .style("filter", "drop-shadow(0 6px 12px rgba(0,0,0,0.15))")
        .attr("transform", "translateY(-2px)");
      
      const percentage = ((d[1] / d3.sum(grouped, d => d[1])) * 100).toFixed(1);
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${d[0]}</div>
        <div style="margin: 4px 0;">Revenue: <strong>${formatNumber(d[1])}</strong></div>
        <div style="margin: 4px 0;">Market Share: <strong>${percentage}%</strong></div>
        <div style="margin-top: 10px; font-style: italic; color: #718096; font-size: 12px;">Click to see purchase channels</div>
      `)
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 100) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this)
        .transition().duration(200)
        .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.1))")
        .attr("transform", "translateY(0px)");
      tooltip.transition().duration(300).style("opacity", 0);
    })
    .on("click", function(event, d) {
      showProductDetails(city, d[0]);
    })
    .transition()
    .duration(1200)
    .delay((d, i) => i * 150)
    .attr("width", d => x(d[1]));

  // Clean value labels
  g.selectAll(".bar-label")
    .data(grouped)
    .enter().append("text")
    .attr("class", "bar-label")
    .attr("y", d => y(d[0]) + y.bandwidth()/2)
    .attr("x", 0)
    .attr("dy", "0.35em")
    .attr("font-size", "13px")
    .attr("font-weight", "600")
    .attr("fill", "#1a202c")
    .attr("text-anchor", "start")
    .text(d => "$" + formatNumber(d[1]))
    .transition()
    .duration(800)
    .delay((d, i) => i * 100)
    .attr("x", d => x(d[1]) + 15);

  // Create X axis
  const xAxis = g.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x)
      .tickFormat(d => "$" + formatNumber(d))
      .ticks(5));

  xAxis.selectAll("text")
    .style("font-size", "12px")
    .style("font-weight", "500")
    .style("fill", "#1a202c");

  // Create Y axis with beautiful product names
  const yAxis = g.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(y));

  yAxis.selectAll("text")
    .style("font-size", "14px")
    .style("font-weight", "600")
    .style("fill", "#1a202c")
    .style("text-anchor", "end")
    .attr("x", -15);

  // Remove axis domains for cleaner look
  yAxis.select(".domain").remove();
  xAxis.select(".domain").remove();

  // Add subtle grid lines
  g.selectAll(".grid-line")
    .data(x.ticks(5))
    .enter().append("line")
    .attr("class", "grid-line")
    .attr("x1", d => x(d))
    .attr("x2", d => x(d))
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#e2e8f0")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3");

  // Beautiful axis labels
  g.append("text")
    .attr("class", "x-axis-label")
    .attr("transform", `translate(${width / 2}, ${height + 60})`)
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "600")
    .style("fill", "#1a202c")
    .text("Revenue (USD)");

  g.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 50)
    .attr("x", -height / 2)
    .style("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "600")
    .style("fill", "#1a202c")
    .text("Product Category");

  // Update insights
  const totalRevenue = d3.sum(grouped, d => d[1]);
  const topProduct = grouped[0];
  const topShare = ((topProduct[1] / totalRevenue) * 100).toFixed(1);
  
  document.getElementById('city-insights').innerHTML = `
    <p>• <strong>${topProduct[0]}</strong> dominates with ${topShare}% market share</p>
    <p>• Total ${city} revenue: <strong>${formatNumber(totalRevenue)}</strong></p>
    <p>• ${grouped.length} product categories active in this market</p>
    <p>• Focus marketing efforts on top-performing categories for 2023</p>
  `;
}

function createChannelChart(city, product) {
  // Clean layout with plenty of space
  const containerWidth = 1100;
  const containerHeight = 600;
  const radius = 140; // Fixed radius for consistency
  const centerX = 300; // Move pie chart left to make room for legend
  const centerY = containerHeight / 2;

  // Clear any existing tooltips and charts
  d3.selectAll(".tooltip").remove();
  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .style("background", "#fff");

  const g = svg.append("g")
    .attr("transform", `translate(${centerX},${centerY})`);

  // Filter data
  const filtered = globalData.filter(d => d.City === city && d.Product === product);

  if (filtered.length === 0) {
    // Clean error message
    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", containerHeight / 2 - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "24px")
      .attr("font-weight", "600")
      .attr("fill", colors.primary)
      .text(`No data available`);
    
    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", containerHeight / 2 + 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", colors.secondary)
      .text(`${product} in ${city}`);
    
    document.getElementById('channel-insights').innerHTML = `
      <p style="margin: 10px 0; font-size: 14px; color: #ed8936; line-height: 1.5;">⚠️ No purchase channel data found for this combination</p>
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

  // Filter valid data
  const validGrouped = grouped.filter(d => {
    const hasValidKey = d[0] && d[0] !== "Unknown" && d[0] !== "";
    const hasValidData = d[1].quantity > 0;
    return hasValidKey && hasValidData;
  }).sort((a, b) => b[1].quantity - a[1].quantity);

  if (validGrouped.length === 0) {
    // Clean error message
    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", containerHeight / 2 - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("font-weight", "600")
      .attr("fill", colors.primary)
      .text(`Purchase channel data not available`);
    
    svg.append("text")
      .attr("x", containerWidth / 2)
      .attr("y", containerHeight / 2 + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", colors.secondary)
      .text(`for ${product} in ${city}`);
    
    document.getElementById('channel-insights').innerHTML = `
      <p style="margin: 10px 0; font-size: 14px; color: #ed8936; line-height: 1.5;">⚠️ Purchase type data needs proper formatting</p>
      <p style="margin: 10px 0; font-size: 14px; color: #4a5568; line-height: 1.5;">Found ${filtered.length} orders but purchase types are not categorized</p>
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

  // Clean color mapping
  const colorMap = {
    'Online': colors.accent,
    'In-store': colors.success,
    'Delivery': colors.warning,
    'Takeout': colors.secondary,
    'Drive-thru': colors.tertiary,
    'Phone': colors.purple,
    'Pickup': colors.teal
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
        .outerRadius(radius + 10));
      
      const total = d3.sum(validGrouped, d => d[1].quantity);
      const percentage = ((d.data[1].quantity / total) * 100).toFixed(1);
      const avgOrder = d.data[1].quantity > 0 ? (d.data[1].revenue / d.data[1].quantity).toFixed(2) : "0.00";
      
      tooltip.transition().duration(200).style("opacity", .95);
      tooltip.html(`
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 15px;">${d.data[0]}</div>
        <div style="margin: 5px 0;">Orders: <strong>${d.data[1].quantity}</strong> (${percentage}%)</div>
        <div style="margin: 5px 0;">Revenue: <strong>${formatNumber(d.data[1].revenue)}</strong></div>
        <div style="margin: 5px 0;">Avg per Order: <strong>${avgOrder}</strong></div>
      `)
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 120) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).transition().duration(200).attr("d", arc);
      tooltip.transition().duration(300).style("opacity", 0);
    });

  // Clean percentage labels
  slices.append("text")
    .attr("transform", d => {
      const centroid = arc.centroid(d);
      return `translate(${centroid[0]}, ${centroid[1]})`;
    })
    .attr("dy", "0.35em")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "white")
    .text(d => {
      const total = d3.sum(validGrouped, d => Math.round(d[1].quantity));
      const cleanQuantity = Math.round(d.data[1].quantity);
      const percentage = Math.round((cleanQuantity / total) * 100);
      return percentage > 10 ? percentage + "%" : "";
    });

  // CLEAN legend positioned on the right
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(600, 100)`);

  // Legend title
  legend.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .style("fill", colors.primary)
    .text("Purchase Channels");

  legend.append("text")
    .attr("x", 0)
    .attr("y", 20)
    .style("font-size", "14px")
    .style("fill", colors.secondary)
    .text(`in ${city}`);

  // Legend items with FIXED formatting
  validGrouped.forEach((d, i) => {
    const legendRow = legend.append("g")
      .attr("transform", `translate(0, ${50 + i * 45})`);

    legendRow.append("circle")
      .attr("cx", 12)
      .attr("cy", 12)
      .attr("r", 10)
      .attr("fill", colorMap[d[0]] || colors.tertiary);

    legendRow.append("text")
      .attr("x", 30)
      .attr("y", 12)
      .attr("dy", "0.35em")
      .style("font-size", "15px")
      .style("font-weight", "600")
      .style("fill", colors.primary)
      .text(d[0]);

    const total = d3.sum(validGrouped, d => d[1].quantity);
    const percentage = ((d[1].quantity / total) * 100).toFixed(0);
    const cleanQuantity = Math.round(d[1].quantity);
    
    legendRow.append("text")
      .attr("x", 30)
      .attr("y", 28)
      .style("font-size", "13px")
      .style("fill", colors.secondary)
      .text(`${cleanQuantity} orders (${percentage}%)`);
  });

  // SIMPLE annotation for top channel - positioned clearly
  if (validGrouped.length > 0) {
    const topChannel = validGrouped[0];
    const topSlice = pie(validGrouped).find(d => d.data[0] === topChannel[0]);
    
    // Position annotation outside the pie on the right
    const annotationX = centerX + radius + 60;
    const annotationY = centerY - 40;
    
    const annotationGroup = svg.append("g")
      .attr("class", "simple-annotation");
    
    // Draw line to pie slice
    const sliceCentroid = arc.centroid(topSlice);
    annotationGroup.append("line")
      .attr("x1", centerX + sliceCentroid[0] * 1.1)
      .attr("y1", centerY + sliceCentroid[1] * 1.1)
      .attr("x2", annotationX - 10)
      .attr("y2", annotationY + 10)
      .attr("stroke", colors.accent)
      .attr("stroke-width", 2);
    
    annotationGroup.append("circle")
      .attr("cx", centerX + sliceCentroid[0] * 1.1)
      .attr("cy", centerY + sliceCentroid[1] * 1.1)
      .attr("r", 4)
      .attr("fill", colors.accent);
    
    annotationGroup.append("text")
      .attr("x", annotationX)
      .attr("y", annotationY)
      .style("font-size", "14px")
      .style("font-weight", "bold")
      .style("fill", colors.primary)
      .text("Dominant Channel");
    
    const totalQuantity = d3.sum(validGrouped, d => Math.round(d[1].quantity));
    const topQuantity = Math.round(topChannel[1].quantity);
    const dominantPercentage = Math.round((topQuantity / totalQuantity) * 100);
    
    annotationGroup.append("text")
      .attr("x", annotationX)
      .attr("y", annotationY + 20)
      .style("font-size", "13px")
      .style("fill", colors.secondary)
      .text(`${dominantPercentage}% customer preference`);
  }

  // Update insights with CLEAN numbers
  if (validGrouped.length > 0) {
    const totalQuantity = d3.sum(validGrouped, d => Math.round(d[1].quantity));
    const topChannel = validGrouped[0];
    const topQuantity = Math.round(topChannel[1].quantity);
    const topPercentage = Math.round((topQuantity / totalQuantity) * 100);
    
    let recommendation = "";
    if (topChannel[0].includes("Online")) {
      recommendation = "Invest in digital marketing and mobile optimization";
    } else if (topChannel[0].includes("store")) {
      recommendation = "Focus on in-store experience enhancement";
    } else {
      recommendation = `Optimize ${topChannel[0]} operations for better efficiency`;
    }
    
    document.getElementById('channel-insights').innerHTML = `
      <p>• <strong>${topChannel[0]}</strong> preferred by ${topPercentage}% of customers</p>
      <p>• Total orders: <strong>${totalQuantity}</strong> for this product</p>
      <p>• <strong>Strategy:</strong> ${recommendation}</p>
      <p>• Consider channel-specific promotions to boost alternatives</p>
    `;
  }
}

// FIXED Utility function for clean number formatting with one decimal
function formatNumber(num) {
  // Clean the number first
  const cleanNum = Number(num);
  
  if (cleanNum >= 1000000) {
    return (cleanNum / 1000000).toFixed(1) + 'M';
  } else if (cleanNum >= 1000) {
    return (cleanNum / 1000).toFixed(1) + 'K';
  }
  return cleanNum.toFixed(1);
}