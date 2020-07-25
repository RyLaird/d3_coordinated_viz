//first line of main.js. wrap everything in a self-executing anonymous function to move to a local scope
(function(){

  //pseudo-global variables
  //variables for data join
  var attrArray = ["total_wine", "white", "red", "PDO", "PGI", "vino"];
  var expressed = attrArray[0]; //initial attributes

  //begin script when window loads
  window.onload = setMap();

//set up choropleth map
  function setMap(){

    //map frame dimensions
    var width = window.innerWidth * 0.4,
        height = 460;

    //create new svg container for the map
    var map = d3.select("#d3")
      .append("svg")
      .attr("class", "map")
      .attr("width", width)
      .attr("height", height);

    //create Albers equal area conic projection centered on italy
    var projection = d3.geoAlbers()
        .center([0, 41.78])
        .rotate([-12.34, 0, 0])
        .parallels([43,62])
        .scale(2450.51)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use promise.all() asynchronous data loading
    //set empty promises and push files then promise.all()
    var promises = [];
    promises.push(d3.csv("data/italywine.csv"));
    promises.push(d3.json("data/italy.topojson"));
    promises.push(d3.json("data/regions.topojson"));
    Promise.all(promises).then(callback);

    //function to set up index values for files in callback , translate to json and add to map
    function callback(data) {

      wineData = data[0];
      italy = data[1];
      regions = data[2];


      //translate topoJSONs
      var italyOutline = topojson.feature(italy, italy.objects.italy_admin0),
          italyRegions = topojson.feature(regions, regions.objects.italy_admin1).features;

      var country = map.append("path")
          .datum(italyOutline)
          .attr("class", "country")
          .attr("d", path);

      italyRegions = joinData(italyRegions, wineData);

      //create the color scale
      var colorScale = makeColorScaleNatural(wineData);

      //add enumeration units to the map
      setEnumerationUnits(italyRegions, map, path, colorScale);

      //add coordinated visualization to the map
      setChart(wineData, colorScale);

    };
  }; //last line of setMap

  //function to join csv wine columns with json regions in italy
  function joinData(italyRegions, wineData) {
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<wineData.length; i++) {
        var csvRegion = wineData[i]; //curret regions
        var csvKey = csvRegion.Name_1; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<italyRegions.length; a++) {

            var geojsonProps = italyRegions[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.NAME_1; //the geojson primary csvKey

            //where primary keys match, transfer csv data to geojson properties objects
            if (geojsonKey == csvKey) {

              //assing all attributes and values
              attrArray.forEach(function(attr){
                  var val = parseFloat(csvRegion[attr]); //get csv attribute value
                  geojsonProps[attr] = val; //assign attribute and value to geojson properties
              });
            };
        };
    };
    console.log(italyRegions);

    return italyRegions;
  }; //last line of joinData

  //function to assign color scale to italy regions
  function makeColorScaleNatural(data){
      var colorClasses = [
        "#f2f0f7",
        "#cbc9e2",
        "#9e9ac8",
        "#756bb1",
        "#54278f"
      ];

      //create color scale generator
      var colorScale = d3.scaleQuantile()  //possibly use .scaleThreshold .scaleQuantile
          .range(colorClasses);

      //build an array of all values of the expressed attribute
      var domainArray = [];
      for (var i=0; i<data.length; i++){
          var val = parseFloat(data[i][expressed]);
          domainArray.push(val);
      };

      //the following is needed only for Natural Breaks
      //cluster data using ckmeans clustering algorithm to create natural breaks
      //var clusters = ss.ckmeans(domainArray, 5);
      //reset domain array to cluster minimums
      //domainArray = clusters.map(function(d) {
      //    return d3.min(d);
      //});
      //remove first value from domain array to create class breakpoints
      //domainArray.shift();

      //assign array of expressed values as scale domain
      colorScale.domain(domainArray);

      return colorScale;
  }; //last line of makeColorScaleNatural function

  //function to test for data value and return color
  function choropleth(props, colorScale){
      //make sure attribute value is a number
      var val = parseFloat(props[expressed]);
      //if attribute value exists, assign a color; otherwise assign gray
      if (typeof val == 'number' && !isNaN(val)){
          return colorScale(val);
      } else {
          return "#CCC";
      };
  }; //last line of choropleth function

  function setEnumerationUnits(italyRegions, map, path, colorScale) {
    var wineRegions = map.selectAll(".regions")
        .data(italyRegions)
        .enter()
        .append("path")
        .attr("class", function(d){
          return "regions " + d.properties.NAME_1;
        })
        .attr("d", path)
        .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            });
  }; //last line of setEnumerationUnits function

  //function to create coordinated bar chart
  function setChart(wineData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth *.3,
        chartHeight = 400;
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("#chart")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart backgound fill
    var chartBackgound = chart.append("rect")
        .attr("class", "chartBackgound")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);


    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
        .range([390, 0])
        .domain([0, 11500]);

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(wineData)
        .enter()
        .append("rect")
        .sort(function(a,b){
              return b[expressed]-a[expressed]
        })
        .attr("class", function(d) {
            return "bar " + d.Name_1;
        })
        .attr("width", chartInnerWidth / wineData.length -1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / wineData.length) + leftPadding;
        })
        .attr("height", function(d, i) {
            return 390 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i) {
          return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d) {
            return choropleth(d, colorScale);
        });

    //showing number values in chart on bars, not ideal for thousands
    //var numbers = chart.selectAll(".numbers")
        //.data(wineData)
        //.enter()
        //.append("text")
        //.sort(function(a, b) {
          //  return a[expressed]-b[expressed]
      //  })
      //  .attr("class", function(d) {
        //    return "numbers " + d.Name_1;
        //})
        //.attr("text-anchor", "middle")
        //.attr("x", function(d, i) {
          //  var fraction = chartWidth / wineData.length;
          //  return i * fraction + (fraction -1) / 2;
      //  })
      //  .attr("y", function(d) {
            //return chartHeight - yScale(parseFloat(d[expressed])) + 15;
      //  })
      //  .text(function(d) {
          //  return d[expressed];
        //});

      var chartTitle = chart.append("text")
          .attr("x", 50)
          .attr("y", 40)
          .attr("class", "chartTitle")
          .text("Volume in thousands of hectoliters " + expressed[3] + " in each region")

      //create vertical axis generator
      var yAxis = d3.axisLeft()
          .scale(yScale);

      //place axis
      var axis = chart.append("g")
          .attr("class", "axis")
          .attr("transform", translate)
          .call(yAxis);

      //create fram for chart border
      var chartFrame = chart.append("rect")
          .attr("class", "chartFrame")
          .attr("width", chartInnerWidth)
          .attr("height", chartInnerHeight)
          .attr("transform", translate);

  }; //last line of setChart function

})(); //last line of main.js
