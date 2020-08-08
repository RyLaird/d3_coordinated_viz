//first line of main.js. wrap everything in a self-executing anonymous function to move to a local scope
(function(){

  //pseudo-global variables
  //variables for data join
  var attrArray = ["Total Wine Produced", "White Wine", "Red Wine", "PDO wine", "PGI wine", "Vino wine"];
  var expressed = attrArray[0]; //initial attributes

  //setting up variables for piecharts
  var pieHeight = 300,
      pieWidth = 300,
      //whichever is smaller, radius is half
      pieRadius = Math.min(pieWidth, pieHeight) / 2;

  var pieRedWhite = [{"type": "White", "percent": 57},{"type": "Red", "percent": 43}];
  var pieQuality = [{"type": "PDO", "percent": 42},{"type": "PGI", "percent": 24},{"type": "Vino", "percent": 35}];

  //chart frame dimensions
  var chartWidth = window.innerWidth *.3,
      chartHeight = 390,
      leftPadding = 35,
      rightPadding = 2,
      topBottomPadding = 5,
      chartInnerWidth = chartWidth - leftPadding - rightPadding,
      chartInnerHeight = chartHeight - topBottomPadding * 2,
      translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

  //create a scale to size bars proportionally to frame
  var yScale = d3.scaleLinear()
      .range([380, 0])
      .domain([0, 12000]);


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

          console.log(italyRegions);

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

      //dropdown
      createDropdown(wineData);

    };

    setWinePie(pieRedWhite);
    setQualityPie(pieQuality);

  }; //last line of setMap

  //function to create a dropdown menu for attribute selection
  function createDropdown(wineData){
    //add select element
    var dropdown = d3.select("#regionDrop")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function() {
            changeAttribute(this.value, wineData)
        });

    //add initial proportion
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d) { return d })
        .text(function(d){ return d });

  }; //last line of createDropdown function

  //dropdown change listener handler
  function changeAttribute(attribute, wineData){
      //change the expressed attribute
      expressed = attribute;

      //change yScale with data change
      wineMax = d3.max(wineData, function(d)
      {return parseFloat(d[expressed]);
      });

      //update yAxis
      yScale = d3.scaleLinear()
          .range([380, 0])
          .domain([0, wineMax*1.1]);

      //update y Axis
      d3.select(".axis").remove();
      var yAxis = d3.axisLeft()
        .scale(yScale);

      //place axis
      var axis = d3.select(".chart")
          .append("g")
          .attr("class", "axis")
          .attr("transform", translate)
          .call(yAxis);

      //recreate the color scale
      var colorScale = makeColorScaleNatural(wineData);

      //recolor enumeration units
      var regions = d3.selectAll(".regions")
          .transition()
          .duration(1000)
          .style("fill", function(d){
                return choropleth(d.properties, colorScale)
          });

      //re-sort, resize, and recolor bars
      var bars = d3.selectAll(".bar")
      //re-sort bars
      .sort(function(a, b) {
          return b[expressed] -a[expressed];
      })
      .transition() //add animation
      .delay(function(d, i){
          return i * 20
      })
      .duration(500);


      //.attr("x", function(d,i){
        //  return i * (chartInnerWidth / wineData.length) + leftPadding;
      //})
      //resize bars
      //.attr("height", function(d,i){
        //  return 463 -yScale(parseFloat(d[expressed]));
      //})
      //.attr("y", function(d, i){
        //  return yScale(parseFloat(d[expressed])) + topBottomPadding;
      //})
      //recolor bars
      //.style("fill", function(d){
        //  return choropleth(d, colorScale);
      //});

      updateChart(bars, wineData.length, colorScale);

  }; //last line of changeAttribute function

  //function to position, size, and color bars in chart
  function updateChart(bars, n, colorScale){
      //position bars
      bars.attr("x", function(d,i){
          return i * (chartInnerWidth / n) + leftPadding;
      })
      //size/resize bars
      .attr("height", function(d, i){
          return 380 - yScale(parseFloat(d[expressed]));
      })
      .attr("y", function(d,i){
          return yScale(parseFloat(d[expressed])) + topBottomPadding;
      })
      //color/recolor bars
      .style("fill", function(d){
          return choropleth(d,colorScale);
      })
      //at the bottom of updateChart()...add text to chart title
      var chartTitle = d3.select(".chartTitle")
      .text("Volume in thousands of hectoliters");

  };


  //function to join csv wine columns with json regions in italy
  function joinData(italyRegions, wineData) {
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i<wineData.length; i++) {
        var csvRegion = wineData[i]; //current regions
        var csvKey = csvRegion.adm1_code; //the CSV primary key

        //loop through geojson regions to find correct region
        for (var a=0; a<italyRegions.length; a++) {

            var geojsonProps = italyRegions[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.adm1_code; //the geojson primary csvKey

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
        "#C4BDB1",
        "#94856D",
        "#ACC77D",
        "#889E63",
        "#4F5C3A"
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
          return "regions " + d.properties.adm1_code;
        })
        .attr("d", path)
        .style("fill", function(d){
                return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);

        var desc = wineRegions.append("desc")
            .text('{"stroke": "#000" , "stroke-width": "1.5px"}');
  }; //last line of setEnumerationUnits function

  //function to create coordinated bar chart
  function setChart(wineData, colorScale){

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

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(wineData)
        .enter()
        .append("rect")
        .sort(function(a,b){
              return b[expressed]-a[expressed]
        })
        .attr("class", function(d) {
            return "bar " + d.adm1_code;
        })
        .attr("width", chartInnerWidth / wineData.length -1)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);


        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

        //no longer needed once updateChart function runs
//        .attr("x", function(d, i){
    //        return i * (chartInnerWidth / wineData.length) + leftPadding;
    //    })
    //    .attr("height", function(d, i) {
    //        return 390 - yScale(parseFloat(d[expressed]));
    //    })
    //    .attr("y", function(d, i) {
    //      return yScale(parseFloat(d[expressed])) + topBottomPadding;
    //    })
    //    .style("fill", function(d) {
    //        return choropleth(d, colorScale);
    //    });

    //showing number values in chart on bars, not ideal for thousands
    //var numbers = chart.selectAll(".numbers")
        //.data(wineData)
        //.enter()
        //.append("text")
        //.sort(function(a, b) {
          //  return a[expressed]-b[expressed]
      //  })
      //  .attr("class", function(d) {
        //    return "numbers " + d.adm1_code;
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
          .attr("x", 90)
          .attr("y", 40)
          .attr("class", "chartTitle")
          .text("Volume in thousands of hectoliters " + expressed[3] + " in each region");

      //create vertical axis generator
      var yAxis = d3.axisLeft()
          .scale(yScale);

      /*var xAxis = d3.axisBottom()
          .scale(xScale); */

      //place axis
      var axis = chart.append("g")
          .attr("class", "axis")
          .attr("transform", translate)
          .call(yAxis);

    /*  var axis = chart.append("g")
          .attr("class", "xaxis")
          .attr("transform", "translate(0," + (chartHeight - topBottomPadding) + ")")
          .call(xAxis); */

      //create fram for chart border
      var chartFrame = chart.append("rect")
          .attr("class", "chartFrame")
          .attr("width", chartInnerWidth)
          .attr("height", chartInnerHeight)
          .attr("transform", translate);

      //set bar positions, heights, and colors
      updateChart(bars, wineData.length, colorScale);

  }; //last line of setChart function

  function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.adm1_code)
          .style("stroke", "#62030F")
          .style("stroke-width", "3");

        setLabel(props);
  } //last line of highlight function

  //function to reset the element style on mouseout
  function dehighlight(props){
      var selected = d3.selectAll("." + props.adm1_code)
          .style("stroke", function(){
              return getStyle(this, "stroke")
          })
          .style("stroke-width", function(){
              return getStyle(this, "stroke-width")
          });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
              .select("desc")
              .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        d3.select(".infolabel")
            .remove();
  }; //last line of dehighlight function

  //function to create dynamic label
  function setLabel(props){
      //label content
      var labelAttribute = "<h1>" + props[expressed] +
          "</h1>" + expressed + "</b>";

      //create info label div
      var infolabel = d3.select("body")
          .append("div")
          .attr("class", "infolabel")
          .attr("id", props.adm1_code + "_label")
          .html(labelAttribute)

      var regionName = infolabel.append("div")
          .attr("class", "labelname")
          .html((props.NAME_1 + " Region").bold());
  };

  //function to move info label with mouse
  function moveLabel(){

      var labelWidth = d3.select(".infolabel")
          .node()
          .getBoundingClientRect()
          .width;
      //use coordinates of mousemove event to set label coordinates
      var x1 = d3.event.clientX + 10,
          y1 = d3.event.clientY + 800,
          x2 = d3.event.clientX - labelWidth - 10,
          y2 = d3.event.clientY + 500;

      //horizontal label coordinate, testing for overflow
      var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
      //vertical label coordinate, testing for overflow
      var y = d3.event.clientY < 75 ? y2 : y1;


      d3.select(".infolabel")
          .style("left", x + "px")
          .style("top", y + "px");

  }; //last line of moveLabel function

  function setWinePie(data) {

        //set variables for pie chart colors
        var wineColor = d3.scaleOrdinal()
            .range(["#C0A561","#62030F"]);

        var pie = d3.pie()
            .value(function(d)  { return d.percent; })(data);

        var arc = d3.arc()
            .outerRadius(pieRadius-10)
            .innerRadius(0);

        var labelArc = d3.arc()
            .outerRadius(pieRadius - 100)
            .innerRadius(pieRadius - 65);

        var svg = d3.select("#regionChart")
                .append("svg")
                .attr("width", pieWidth)
                .attr("height", pieHeight)
                      .append("g")
                      //moving center point to half width and height
                      .attr("transform", "translate(" + pieWidth/2 + "," + pieHeight/2 + ")");

        var pieTitle = d3.select("#regionChart")
              .append("class", "pieTitle")
              .text("Percent Red / White")
              .style('text-anchor', 'middle')
              .style("fill", "black");

        var g = svg.selectAll("arc")
              .data(pie)
              .enter().append("g")
              .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d) { return wineColor(d.data.type);})
            .attr("stroke", "white")
            .style("stroke-width", "5px")
            .style("opacity", 0.9);



        g.append("text")
              .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
              .text(function(d) { return d.data.type;})
              .style("fill", "#fff");

          }; //last line of setWinePie

          function setQualityPie(data) {

                //set variables for pie chart colors
                var wineColor = d3.scaleOrdinal()
                    .range(["#4F5C3A","#ACC77D", "#C4BDB1"]);

                var pie = d3.pie()
                    .value(function(d)  { return d.percent; })(data);

                var arc = d3.arc()
                    .outerRadius(pieRadius-10)
                    .innerRadius(0);

                var labelArc = d3.arc()
                    .outerRadius(pieRadius - 100)
                    .innerRadius(pieRadius - 65);


                var svg = d3.select("#regionChart")
                        .append("svg")
                        .attr("width", pieWidth)
                        .attr("height", pieHeight)
                              .append("g")
                              //moving center point to half width and height
                              .attr("transform", "translate(" + pieWidth/2 + "," + pieHeight/2 + ")");

                var pieTitle = d3.select("#regionChart")
                      .append("class", "pieTitle")
                      .text("Quality by Percentage")
                      .style('text-anchor', 'middle')
                      .style("fill", "black");

                var g = svg.selectAll("arc")
                      .data(pie)
                      .enter().append("g")
                      .attr("class", "arc");

                g.append("path")
                    .attr("d", arc)
                    .style("fill", function(d) { return wineColor(d.data.type);})
                    .attr("stroke", "white")
                    .style("stroke-width", "5px")
                    .style("opacity", 0.9);



                g.append("text")
                      .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
                      .text(function(d) { return d.data.type;})
                      .style("fill", "#fff");

                  };

})(); //last line of main.js
