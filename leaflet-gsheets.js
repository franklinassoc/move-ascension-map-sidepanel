
/*
* Script to display two tables from Google Sheets as point and polygon layers using Leaflet
* The Sheets are then imported using Tabletop.js 
* Based on work by Chris Arderne at https://github.com/carderne/leaflet-gsheets
*/

// init() is called as soon as the page loads
function init() {

	// These URLs come from Google Sheets "shareable link" form.
	// The first is the polygon layer and the second the points.
	// linesURL points to "MoveAscension_Polys" where lines are in "geometry" field as JSON
	var linesURL = "https://docs.google.com/spreadsheets/d/1gTlXe3_OoXgnJ4SZGXXz_V-PouTM7W7wevfkk7KN-18/edit?usp=sharing";
	// pointsURL points to "MoveAscension_Points" where longitude and latitude fields are provided.
	var pointsURL = "https://docs.google.com/spreadsheets/d/12UGa4cpLmLFqqGEBy9kmeRRohU77uBGSHS2M-NrW8xE/edit?usp=sharing";

    Tabletop.init( { key: pointsURL,
                     callback: addPoints,
                     simpleSheet: true } );  // simpleSheet assumes there is only one table and automatically sends its data
    Tabletop.init( { key: linesURL,
                     callback: addPolygons,
                     simpleSheet: true } );
}
window.addEventListener("DOMContentLoaded", init);

// Create a new Leaflet map centered on Ascension Parish, Louisiana
var map = L.map("map").setView([30.26, -90.91], 11);

// This is the Carto Positron basemap
var basemap = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png", {
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
	subdomains: "abcd",
	maxZoom: 20
});
basemap.addTo(map);

// Define the sidebar data display panel
var sidebar = L.control.sidebar({
	container: 'sidebar',
	closeButton: true,
	position: 'right'
}).addTo(map);

panelID = 'my-info-panel'
var panelContent = {
    id: panelID,                     // UID, used to access the panel
    tab: '<i class="fa fa-bars active"></i>',  // content can be passed as HTML string,
    title: '<h2 id="sidebar-title"> No item selected</h2>',              // large text "title" of the panel content
    pane: '<img src="Move_Ascension_Logo-150px.jpg" alt="logo"><br><p id="sidebar-content"></p><br><p id="sidebar-content2"></p><br><p id="sidebar-content3"></p><br><p id="sidebar-content4"></p><br><p id="sidebar-comments"></p><br><img src="{{myimage}}"><br><div id="sidepanel_more_url"></div>',    // Content of the panel. DOM elements can be passed, too.
    position: 'top'                  // optional vertical alignment, defaults to 'top'
};
sidebar.addPanel(panelContent);

map.on('click', function (feature, layer) {
	sidebar.close(panelID);
	// $('#sidebar-title').text("No item selected");
	// $('#sidebar-content').text("");
});

// These are declared outisde the functions so that the functions can check if they already exist
var polygonLayer;
var pointGroupLayer;

// The form of data must be a JSON representation of a table as returned by Tabletop.js
// addPolygons first checks if the map layer has already been assigned, and if so, deletes it and makes a fresh one
// The assumption is that the locally stored JSONs will load before Tabletop.js can pull the external data from Google Sheets
function addPolygons(data) {
	if (polygonLayer != null) {
		// If the layer exists, remove it and continue to make a new one with data
		polygonLayer.remove()
	}

	// Need to convert the Tabletop.js JSON into a GeoJSON
	// Start with an empty GeoJSON of type FeatureCollection
	// All the rows will be inserted into a single GeoJSON
	var geojsonPolys = {
	    "type": "FeatureCollection",
	    "features": []
  	};

  	for (var row in data) {
  		// The Sheets data has a column named "include" that specifies if that row should be mapped
    	if (data[row].include == "y") {
      		var coords = JSON.parse(data[row].geometry);

	    	geojsonPolys.features.push({
	        	"type": "Feature",
	        	"geometry": {
	          		"type": data[row].geotype,
	          		"coordinates": coords
	        	},
	        	"properties": {
	          		"title": data[row].Title,
	          		"type": data[row].Type,
					"file_num": data[row].file_num,
					"comments": data[row].Comments,
					"myimage": data[row].myimage,
					"sidepanel_text": data[row].sidepanel_text,
					"sidepanel_text_2": data[row].sidepanel_text_2,
					"sidepanel_text_3": data[row].sidepanel_text_3,
					"sidepanel_text_4": data[row].sidepanel_text_4,
					"sidepanel_more_url": data[row].sidepanel_more_url
	        	}
	    	});
    	}
  	}

  	// The polygons are styled slightly differently on mouse hovers
  	var polygonStyle = {"color": "#2ca25f", "fillColor": "#99d8c9", "weight": 4};
	var polygonHoverStyle = {"color": "green", "fillColor": "#2ca25f", "weight": 8};
	
  	polygonLayer = L.geoJSON(geojsonPolys, {
    	onEachFeature: function (feature, layer) {
      		layer.on({
      			mouseout: function(e) {
                    e.target.setStyle(polygonStyle);
                },
                mouseover: function(e) {
                    e.target.setStyle(polygonHoverStyle);
                },
                click: function(e) {
                	// This zooms the map to the clicked polygon
                	// Not always desirable
                    // map.fitBounds(e.target.getBounds());

                    // if this isn't added, then map.click is also fired!
                    // https://stackoverflow.com/questions/35466139/map-on-click-fires-when-geojson-is-clicked-on-leaflet-1-0
                    L.DomEvent.stopPropagation(e); 

                	$('#sidebar-title').text(e.target.feature.properties.type);
					$('#sidebar-content').text(e.target.feature.properties.sidepanel_text);
					$('#myimage').text(e.target.feature.properties.myimage);
					$('#sidebar-content2').text(e.target.feature.properties.sidepanel_text_2);
					$('#sidebar-content3').text(e.target.feature.properties.sidepanel_text_3);
					$('#sidebar-content4').text(e.target.feature.properties.sidepanel_text_4);
					$('#sidebar-comments').text(e.target.feature.properties.comments);
					$('#sidepanel_more_url').text(e.target.feature.properties.sidepanel_more_url);
					// document.getElementById('sidebar-title').innerHTML = e.target.feature.properties.type;
					// document.getElementById('sidebar-content').innerHTML = e.target.feature.properties.sidepanel_text;					
					sidebar.open(panelID);
                }
      		});
    	},
    	style: polygonStyle
  	}).addTo(map);  	
}

// addPoints is a bit simpler, as no GeoJSON is needed for the points
// It does the same check to overwrite the existing points layer once the Google Sheets data comes along
function addPoints(data) {
	if (pointGroupLayer != null) {
		pointGroupLayer.remove();
	}
	pointGroupLayer = L.layerGroup().addTo(map);

	for(var row = 0; row < data.length; row++) {
    	var marker = L.marker([data[row].lat, data[row].long]).addTo(pointGroupLayer);
		// UNCOMMENT THIS LINE TO USE POPUPS
      	// marker.bindPopup("<h2>"+data[row].Type+"</h2><br>"+data[row].Title+"<br>"+data[row].sidepanel_text);

	    // COMMENT THE NEXT 14 LINES TO DISABLE SIDEBAR FOR THE MARKERS
		marker.feature = {
		properties: {
        title: data[row].Title,
		type: data[row].Type,
		comments: data[row].Comments,
        sidepanel_text: data[row].sidepanel_text,
		myimage: data[row].myimage,
        sidepanel_text_2: data[row].sidepanel_text_2,
        sidepanel_text_3: data[row].sidepanel_text_3,
		sidepanel_text_4: data[row].sidepanel_text_4,
		sidepanel_more_url: data[row].sidepanel_more_url
		}
		};
		marker.on({
		click: function(e) {
        L.DomEvent.stopPropagation(e);
        $('#sidebar-title').text(e.target.feature.properties.type);
        $('#sidebar-content').text(e.target.feature.properties.sidepanel_text);
        $('#myimage').text(e.target.feature.properties.myimage);		
        $('#sidebar-content2').text(e.target.feature.properties.sidepanel_text_2);
        $('#sidebar-content3').text(e.target.feature.properties.sidepanel_text_3);
		$('#sidebar-content4').text(e.target.feature.properties.sidepanel_text_4);
		$('#sidebar-comments').text(e.target.feature.properties.comments);
		$('#sidepanel_more_url').text(e.target.feature.properties.sidepanel_more_url);		
        // document.getElementById('sidebar-title').innerHTML = e.target.feature.properties.type;
        // document.getElementById('sidebar-content').innerHTML = e.target.feature.properties.sidepanel_text;		
        sidebar.open(panelID);
		}
		});	
		
      	// AwesomeMarkers is used to create fancier icons
		// documentation FA 5.x https://github.com/FortAwesome/Font-Awesome/blob/master/css/fontawesome.css
		// 4.6.3 icons https://lab.artlung.com/font-awesome-sample/
      	var icon = L.AwesomeMarkers.icon({
			icon: (data[row].Marker_Icon),
			iconColor: "white",
			markerColor: (data[row].Color),
			prefix: "fa",
			extraClasses: "fa-flip-horizontal" // omit prefix from the css class item?
		});
    	marker.setIcon(icon);
  	}
}

// Set style for parish boundary and municipalities layer
  	var pboundsStyle = {"color": "#273746", "fillColor": "#99d8c9", "weight": 1, "fillOpacity": 0};

// Add parish and municipal boundaries geoJSON
  $.getJSON("./data-sources/ascension-parish-and-municipalities.geojson",function(pbounds){
 // add GeoJSON layer to the map once the file is loaded
    L.geoJson(pbounds, {
	style: pboundsStyle,
	}).addTo(map);
  });