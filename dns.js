var width  = 960,
    height = 500,
    nodes = [{
      id: 0,
      text: "Local subnet",
      color: "#ce31c2",
      type: "local"
    },
    {
      id: 1,
      text: "Local DNS cache",
      color: "#3366ff",
      type: "local"
    },
    {
      id: 2,
      text: ". nameserver",
      color: "#ffd633",
      type: "root"
    }],
    lastNodeId = 2,
    links = [ { source: 0, target: 1, left: false, right: true}];

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

var path = svg.append('svg:g').selectAll('path'),
	circle = svg.append('svg:g').selectAll('g');

var selected_node = null,
	mousedown_link = null,
	mousedown_node = null,
	mouseup_node = null;

function resetMouseVars() {
	mousedown_node = null;
	mouseup_node = null;
	mousedown_link = null;
}

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

	path.exit().remove();

	circle = circle.data(nodes, function(d) { return d.id; });

	var g = circle.enter().append('svg:g');

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
    // Mouse interactions for individual nodes defined here.
    // Start drawing an arrow when clicked.
		.on('mousedown', function(d) {
      beginDrawingLink(d);
    })
		.on('mouseup', function(d) {
			finishDrawingLink(d);
		});

	g.append('svg:text')
		.attr('x', -20)
		.attr('y', -25)
		.attr('class', 'id')
    // Applies text to element.
		.text(function(d) { return d.text; });

  // Remove old nodes.
	circle.exit().remove();

	force.start();
}

function makeNewDns(name) {
  svg.classed('active', true);

  if (mousedown_node || mousedown_link) {
    return;
  }
  // TODO: replace with hash.
  for (var i in nodes) {
    if (nodes[i].text === name) {
      return;
    }
  }
  // New node here.
  var node = {
      id: ++lastNodeId
    };
  node.x = Math.floor(Math.random() * width);
  node.y = Math.floor(Math.random() * height);
  node.text = name;
  node.type = "authoritative";
  node.color = "green"
  nodes.push(node);

  restart();
}


function mousemove() {
	if (!mousedown_node) {
		return;
	}

	drag_line.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y
		+ 'L' + d3.mouse(this)[0] + ',' + d3.mouse(this)[1]);
	restart();
}

function mouseup() {
	if (mousedown_node) {
		drag_line
      .classed('hidden', true)
		  .style('marker-end', '');
	}

	svg.classed('active', false);

	resetMouseVars();
}

function finishDrawingLink(d) {
  if (!mousedown_node) {
    return;
  }

  drag_line.classed('hidden', true)
    .style('marker-end', '');

  mouseup_node = d;
  if (mouseup_node === mousedown_node) {
    resetMouseVars();
    return;
  }

  // Add arrows since you dragged to a new node.
  var source, target, direction;

  source = mousedown_node;
  target = mouseup_node;
  direction = 'right';

  var link;

  link = links.filter(function(l) {
    return (l.source === source && l.target === target);
  })[0];

  if (link) {
    link[direction] = true;
  } else {
    link = {
      source: source,
      target: target,
      left: false,
      right: false
    };
    link[direction] = true;
    links.push(link);
  }

  selected_node = null;
  restart();
}

function beginDrawingLink(d) {
  // Select current node.
  mousedown_node = d;
  // Deselect if was already selected.
  if (mousedown_node === selected_node) {
    selected_node = null;
  } else {
    selected_node = mousedown_node;
  }
  drag_line.style('marker-end', 'url(#end-arrow)')
  .classed('hidden', false)
  .attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y
    + 'L' + mousedown_node.x + ',' + mousedown_node.y);

  restart();
}

function resolveDns() {
  var url = document.getElementById('query').value
  url = url.trim().replace("www.", "");
  makeNameServers(url);
  //animateQuery(url);
}

function makeNameServers(url) {
  servers = url.split(".");
  var nameServer = "";
  for (i = servers.length - 1; i > -1; i--) {
    nameServer = servers[i] + "." + nameServer;
      makeNewDns(nameServer);
  }
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

  var link = {
      source: source,
      target: target,
      left: false,
      right: true
    };
  links.push(link);
  restart();
}

function connectNodesTest() {
  var ids = document.getElementById('newLink').value.split(", ");
  connectNodes(ids[0], ids[1]);
}

svg
	.on('mousemove', mousemove)
	.on('mouseup', mouseup);

restart();