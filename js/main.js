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

// Color schemes for different chart types
const colors = {
  primary: '#3498db',
  secondary: '#2ecc71', 
  tertiary: '#f39c12',
  accent: '#e74c3c',
  cities: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c', '#34495e'],
  products: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'],
  purchaseTypes: ['#6c5ce7', '#00b894', '#fdcb6e']
};

function initializeVisualization(data) {
  globalData = data;
  showOverview();
}

function updateBreadcrumb() {
  const breadcrumb = document.getElementById('breadcrumb');
  let breadcrumbText = '<span class="active">City Revenue Overview</span>';
  
  if (selectedCity) {
    breadcrumbText += '<span class="separator">→</span><span class="active">' + selectedCity + ' Product Performance</span>';
  }
  
  if (selectedProduct) {
    breadcrumbText += '<span class="separator">→</span><span class="active">' + selectedProduct + ' Purchase Channels</span>';
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
      <h2 class="scene-title">🏙️ Revenue Performance by City</h2>
      <p class="scene-description">
        Compare total revenue across different cities to identify top-performing and underperforming locations. 
        The size of each bubble represents the total revenue, making it easy to spot outliers and opportunities.
      </p>
      <div class="instruction">
        💡 <strong>Insight Focus:</strong> Which cities are underperforming or overperforming? Click any bubble to explore that city's product mix.
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
      <h2 class="scene-title">🍕 Product Performance in ${city}</h2>
      <p class="scene-description">
        Analyze the revenue breakdown by product category in ${city}. This donut chart reveals which products 
        dominate the market and identifies underperforming categories that may need attention.
      </p>
      <div class="instruction">
        📊 <strong>Business Question:</strong> Which products dominate in ${city}? Are any categories underperforming? Click a segment to explore purchase channels.
      </div>
      <div class="chart-container">
        <div id="chart"></div>
      </div>
    </div>
  `;
  
  updateBreadcrumb();
  createProductDonutChart(city);
}

function showProductDetails(city, product) {
  navigationStack.push({scene: 'city', city: city});
  currentScene = 'product';
  selectedProduct = product;
  
  const content = document.getElementById('sceneContent');
  content.innerHTML = `
    <div class="scene-content">
      <h2 class="scene-title">🛒 ${product} Purchase Channels in ${city}</h2>
      <p class="scene-description">
        Understand customer preferences for ${product} in ${city} across different purchase channels. 
        This insight helps optimize staffing, capacity planning, and marketing strategies for each channel.
      </p>
      <div class="instruction">
        🧠 <strong>Strategic Insight:</strong> Do customers prefer online ordering, in-store dining, or drive-thru? Which channel needs promotion or capacity adjustment?
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
  const width = 1200 - margin.left - margin.right;
  const height = 500 - margin.bottom - margin.top;

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
        Revenue: ${d[1].toFixed(2)}<br/>
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
        label: `${topCity[1].toFixed(2)} revenue`,
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

function createProductDonutChart(city) {
  const width = 1200;
  const height = 500;
  const radius = Math.min(width, height) / 2 - 40;

  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2},${height / 2})`);

  const cityData = globalData.filter(d => d.City === city);
  const grouped = d3.rollups(cityData, 
    v => d3.sum(v, d => d.Revenue), 
    d => d.Product
  );

  const pie = d3.pie()
    .value(d => d[1])
    .sort(null);

  const arc = d3.arc()
    .innerRadius(radius * 0.4)
    .outerRadius(radius * 0.8);

  const colorScale = d3.scaleOrdinal()
    .domain(grouped.map(d => d[0]))
    .range(colors.products);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Create pie slices
  const slices = g.selectAll(".slice")
    .data(pie(grouped))
    .enter().append("g")
    .attr("class", "slice");

  slices.append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data[0]))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(200).attr("d", d3.arc()
        .innerRadius(radius * 0.4)
        .outerRadius(radius * 0.85));
      
      tooltip.transition().duration(200).style("opacity", .9);
      const percentage = ((d.data[1] / d3.sum(grouped, d => d[1])) * 100).toFixed(1);
      tooltip.html(`
        <strong>${d.data[0]}</strong><br/>
        Revenue: ${d.data[1].toFixed(2)}<br/>
        Share: ${percentage}%<br/>
        <em>Click to explore purchase channels</em>
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).transition().duration(200).attr("d", arc);
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function(event, d) {
      showProductDetails(city, d.data[0]);
    });

  // Add simple labels only for larger slices
  slices.append("text")
    .attr("transform", d => {
      const pos = arc.centroid(d);
      return `translate(${pos})`;
    })
    .attr("dy", ".35em")
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", "white")
    .text(d => {
      const percentage = ((d.data[1] / d3.sum(grouped, d => d[1])) * 100);
      return percentage > 15 ? d.data[0] : "";
    });

  // Add center text
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text(city);

  g.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 20)
    .attr("font-size", "14px")
    .attr("fill", "#666")
    .text("Product Revenue");

  // Add annotation for top product
  const topProduct = grouped.reduce((a, b) => a[1] > b[1] ? a : b);
  const topProductData = pie(grouped).find(d => d.data[0] === topProduct[0]);
  
  const annotations = [{
    note: {
      label: `${topProduct[1].toFixed(2)} revenue`,
      title: `Leading product in ${city}`
    },
    x: arc.centroid(topProductData)[0],
    y: arc.centroid(topProductData)[1],
    dy: -60,
    dx: 60
  }];

  const makeAnnotations = d3.annotation()
    .type(d3.annotationCalloutCircle)
    .annotations(annotations);

  g.append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);
}

function createPurchaseTypeChart(city, product) {
  const width = 1200;
  const height = 500;

  d3.select("#chart").selectAll("*").remove();

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Create main chart group
  const chartGroup = svg.append("g")
    .attr("transform", `translate(${width / 3},${height / 2})`);

  // Create stats panel group
  const statsGroup = svg.append("g")
    .attr("transform", `translate(${width * 2/3 + 50}, 50)`);

  const filtered = globalData.filter(d => d.City === city && d.Product === product);
  
  // More robust data processing - handle any purchase type values
  const grouped = d3.rollups(filtered, 
    v => ({
      quantity: d3.sum(v, d => d.Quantity),
      revenue: d3.sum(v, d => d.Revenue),
      orders: v.length
    }), 
    d => d.PurchaseType || "Unknown"  // Handle undefined/null values
  );

  // Filter out any entries with undefined/null keys and ensure we have data
  const validGrouped = grouped.filter(d => d[0] && d[0] !== "Unknown" && d[1].quantity > 0);
  
  if (validGrouped.length === 0) {
    // Show error message if no valid data
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .attr("fill", "#666")
      .text(`No purchase type data available for ${product} in ${city}`);
    return;
  }

  const radius = Math.min(width/3, height) / 2 - 60;

  const pie = d3.pie()
    .value(d => d[1].quantity)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const colorScale = d3.scaleOrdinal()
    .domain(validGrouped.map(d => d[0]))
    .range(colors.purchaseTypes);

  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Create pie slices
  const slices = chartGroup.selectAll(".slice")
    .data(pie(validGrouped))
    .enter().append("g")
    .attr("class", "slice");

  slices.append("path")
    .attr("d", arc)
    .attr("fill", d => colorScale(d.data[0]))
    .attr("stroke", "white")
    .attr("stroke-width", 3)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      d3.select(this).transition().duration(200).attr("d", d3.arc()
        .innerRadius(0)
        .outerRadius(radius + 10));
      
      tooltip.transition().duration(200).style("opacity", .9);
      const percentage = ((d.data[1].quantity / d3.sum(validGrouped, d => d[1].quantity)) * 100).toFixed(1);
      tooltip.html(`
        <strong>${d.data[0]}</strong><br/>
        Quantity: ${d.data[1].quantity} orders<br/>
        Revenue: ${d.data[1].revenue.toFixed(2)}<br/>
        Share: ${percentage}%
      `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(d) {
      d3.select(this).transition().duration(200).attr("d", arc);
      tooltip.transition().duration(500).style("opacity", 0);
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
      const percentage = ((d.data[1].quantity / d3.sum(validGrouped, d => d[1].quantity)) * 100).toFixed(0);
      return percentage > 8 ? percentage + "%" : "";
    });

  // Add center text
  chartGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text(`${product}`);

  chartGroup.append("text")
    .attr("text-anchor", "middle")
    .attr("y", 20)
    .attr("font-size", "12px")
    .attr("fill", "#666")
    .text(`Purchase Channels in ${city}`);

  // Create stats panel
  statsGroup.append("rect")
    .attr("width", 350)
    .attr("height", 400)
    .attr("fill", "#f8f9fa")
    .attr("stroke", "#e9ecef")
    .attr("stroke-width", 1)
    .attr("rx", 10);

  statsGroup.append("text")
    .attr("x", 175)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .text("Channel Performance");

  // Add stats for each purchase type
  validGrouped.forEach((d, i) => {
    const yPos = 80 + i * 100;
    const percentage = ((d[1].quantity / d3.sum(validGrouped, d => d[1].quantity)) * 100).toFixed(1);
    
    // Channel name and color
    statsGroup.append("circle")
      .attr("cx", 30)
      .attr("cy", yPos)
      .attr("r", 8)
      .attr("fill", colorScale(d[0]));
    
    statsGroup.append("text")
      .attr("x", 50)
      .attr("y", yPos + 5)
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text(d[0]);

    // Stats
    statsGroup.append("text")
      .attr("x", 30)
      .attr("y", yPos + 25)
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text(`Orders: ${d[1].quantity} (${percentage}%)`);

    statsGroup.append("text")
      .attr("x", 30)
      .attr("y", yPos + 40)
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text(`Revenue: ${d[1].revenue.toFixed(2)}`);

    const avgPerOrder = d[1].quantity > 0 ? (d[1].revenue / d[1].quantity).toFixed(2) : "0.00";
    statsGroup.append("text")
      .attr("x", 30)
      .attr("y", yPos + 55)
      .attr("font-size", "12px")
      .attr("fill", "#666")
      .text(`Avg/Order: ${avgPerOrder}`);
  });

  // Add recommendation box
  if (validGrouped.length > 0) {
    const topChannel = validGrouped.reduce((a, b) => a[1].quantity > b[1].quantity ? a : b);
    const recommendation = getChannelRecommendation(topChannel[0], validGrouped);
    
    statsGroup.append("rect")
      .attr("x", 20)
      .attr("y", 320)
      .attr("width", 310)
      .attr("height", 60)
      .attr("fill", "#e8f5e8")
      .attr("stroke", "#27ae60")
      .attr("stroke-width", 2)
      .attr("rx", 5);

    statsGroup.append("text")
      .attr("x", 30)
      .attr("y", 340)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#2d5a2d")
      .text("💡 Business Insight:");

    statsGroup.append("text")
      .attr("x", 30)
      .attr("y", 360)
      .attr("font-size", "11px")
      .attr("fill", "#2d5a2d")
      .text(recommendation);
  }
}

function getChannelRecommendation(topChannel, data) {
  const total = d3.sum(data, d => d[1].quantity);
  const topPercentage = (data.find(d => d[0] === topChannel)[1].quantity / total * 100).toFixed(0);
  
  // Handle different possible channel names flexibly
  const channelLower = topChannel.toLowerCase();
  
  if (channelLower.includes('dine') || channelLower.includes('store') || channelLower.includes('person')) {
    return `${topPercentage}% prefer in-store. Enhance dining experience & ambiance.`;
  } else if (channelLower.includes('delivery') || channelLower.includes('deliver')) {
    return `${topPercentage}% choose delivery. Optimize delivery speed & packaging.`;
  } else if (channelLower.includes('takeout') || channelLower.includes('pickup') || channelLower.includes('take')) {
    return `${topPercentage}% use takeout. Streamline pickup process & mobile orders.`;
  } else if (channelLower.includes('online') || channelLower.includes('web')) {
    return `${topPercentage}% order online. Improve website UX & digital marketing.`;
  } else if (channelLower.includes('drive') || channelLower.includes('thru')) {
    return `${topPercentage}% use drive-thru. Optimize speed & menu visibility.`;
  }
  
  return `${topChannel} dominates with ${topPercentage}%. Focus resources here.`;
}