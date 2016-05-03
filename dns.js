var width  = 960,
    height = 500,
    nodes = [{
      id: 0,
      text: "Subnet",
      color: "#ce31c2",
      type: "local"
    },
    {
      id: 1,
      text: "DNS resolver",
      color: "#3366ff",
      type: "local",
      cache: [{
        name: ".",
        id: 2
      }]
    },
    {
      id: 2,
      text: ".",
      color: "#ffd633",
      type: "root"
    }],
    lastNodeId = 2,
    links = [],
    resolver = nodes[1],
    rootDNS = nodes[2];

var svg = d3.select('body')
  .append('svg')
  .attr('oncontextmenu', 'return false;')
  .attr("style", "outline: thin solid black;")
  .attr('width', width)
  .attr('height', height);


var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick);

// arrow markers, both end and beginning.
svg.append('svg:defs').append('svg:marker')
  	.attr('id', 'end-arrow')
  	.attr('viewBox', '0 -5 10 10')
  	.attr('refX', 6)
  	.attr('markerWidth', 3)
  	.attr('markerHeight', 3)
  	.attr('orient', 'auto')
  .append('svg:path')
  	.attr('d', 'M0,-5L10,0L0,5')
  	.attr('fill', '#000');

svg.append('svg:defs').append('svg:marker')
    .attr('id', 'start-arrow')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 4)
    .attr('markerWidth', 3)
    .attr('markerHeight', 3)
    .attr('orient', 'auto')
  .append('svg:path')
    .attr('d', 'M10,-5L0,0L10,5')
    .attr('fill', '#000');

var drag_line = svg.append('svg:path')
	.attr('class', 'link dragline hidden')
	.attr('d', 'M0,0L0,0');


var drag = force.drag()
  .on("dragstart", dragstart);

function dragstart(d) {
  d3.event.sourceEvent.stopPropagation();
  d3.select(this).classed("fixed", d.fixed = true);
}

var path = svg.append('svg:g').selectAll('path'),
	circle = svg.append('svg:g').selectAll('g')
            .call(drag);

function tick() {
	path.attr('d', function(d) {
		var deltaX = d.target.x - d.source.x,
			deltaY = d.target.y - d.source.y,
			dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
			normX = deltaX / dist,
			normY = deltaY / dist,
			sourcePadding = d.left ? 17 : 12,
			targetPadding = d.right ? 17 : 12,
			sourceX = d.source.x + (sourcePadding * normX),
			sourceY = d.source.y + (sourcePadding * normY),
			targetX = d.target.x - (targetPadding * normX),
			targetY = d.target.y - (targetPadding * normY);
		return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
	});

	circle.attr('transform', function(d) {
		return 'translate(' + d.x + ',' + d.y + ')';
	});
}

function restart() {
	path = path.data(links);

	path
		.style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
		.style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });
		
	path.enter().append('svg:path')
		.attr('class', 'link')
		.style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
		.style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });

  // remove old links.
	path.exit().remove();

	circle = circle.data(nodes, function(d) { return d.id; });

	var g = circle.enter().append('svg:g')
          // Drag must be handled by entire g element,
          // not the circles below.
          .call(drag);

	g.append('svg:circle')
		.attr('class', 'node')
    // Nameserver size determined by text.
		.attr('r', function(d) {
      if (d.type === 'root' || d.type === 'local') {
        return 18;
      }
      return 12;
    })
		.style('fill', function(d) { return d.color; })
		.style('stroke', 'black')
    .on("dblclick", function(d) {
      d3.select(this).classed("fixed", d.fixed = false);
    });

	g.append('svg:text')
		.attr('x', -20)
		.attr('y', -25)
		.attr('class', 'id')
    // Applies text to element.
		.text(function(d) { return d.text + " (" + d.type + ")"; });

  // Remove old nodes.
	circle.exit().remove();

	force.start();
}

function makeNewDns(name, timeout) {
  svg.classed('active', true);
  // New node here.
  var node = {
      id: ++lastNodeId
  };
  node.x = Math.floor(Math.random() * width);
  node.y = Math.floor(Math.random() * height);
  node.text = name;
  // Matches if there is only 1 period,
  // exactly, with text before it,
  // and the period is at the end.
  if (node.text.match(/^[^\.]+\.$/)) {
    node.type = "top level domain";
  } else {
    // There is more than one period,
    // so this is not a top-level domain.
    node.type = "authoritative";
  }
  node.color = "green";
  setTimeout(function() {
    nodes.push(node);
    addToCache(node);
    connectNodes(resolver.id, node.id);
  }, 900 * (timeout + 1));
}

function resolveDns() {
  // Fade out the previous query path.
  fadeOut();
  links = [];
  var url = document.getElementById('query').value
  url = url.trim().replace("www.", "");
  url = "ns" + (Math.floor(Math.random() * 4) + 1).toString() + "." + url;
  makeNameServers(url);
}

function makeNameServers(url) {
  servers = url.split(".");
  // Root server is the top-most server for any query.
  var nameServers = ["."];
  var formattedServerName = "";

  for (i = servers.length - 1; i > -1; i--) {
    formattedServerName = servers[i] + "." + formattedServerName;
    nameServers.push(formattedServerName);
  }
  // Begin animation here.
  setTimeout(function() {
    connectNodes(0, resolver.id);
  }, 400);
  drawQuery(nameServers);
}

function drawQuery(servers) {
  // Loop backward to begin query at highest level.
  for (i = servers.length - 1; i > -1; i--) {
    // Check cache before creating new node.
    var serverId = cached(servers[i]);
    if (serverId === -1) {
      if (i === servers.length - 2) {
        makeTargetServer(servers[i]);
      } else {
        makeNewDns(servers[i], i);
      }
    } else {
      // Node was already created and cached.
      setTimeout(function() {
        connectNodes(resolver.id, serverId);
      }, 1000);
    }
  }
}

function fadeOut() {
  path.style("opacity", 1)
    .transition().duration(400).style("opacity", 0);
  links.length = 0;
  restart();
}

function makeTargetServer(name) {
  svg.classed('active', true);

  // New node here.
  var node = {
      id: ++lastNodeId
  };
  node.x = Math.floor(Math.random() * width);
  node.y = Math.floor(Math.random() * height);
  node.text = name;

  node.type = "destination";

  node.color = "black"
  nodes.push(node);
  addToCache(node);
}

function connectNodes(sourceId, targetId) {
  // Find the node that has this id.
  // Note: using == rather than === to 
  // allow 1 == "1"
  var source = nodes.filter(function(n) {
    return n.id == sourceId;
  })[0];

  var target = nodes.filter(function(n) {
    return n.id == targetId;
  })[0];
  links.push({
      source: source,
      target: target,
      left: false,
      right: true
  });
  restart();
}

// Returns the id of the cached node,
// or -1 for not yet cached.
function cached(name) {
  var cachedNode = resolver["cache"].filter(function(c) {
    return name == c.name;
  })[0];
  if (cachedNode) {
    return cachedNode.id;
  }
  return -1;
}

function addToCache(node) {
  resolver["cache"].push({ name: node.text, id: node.id });
}

restart();