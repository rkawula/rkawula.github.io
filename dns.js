var width  = 960,
    height = 500,
    nodes,
    lastNodeId,
    links,
    force;

var svg = d3.select('body')
  .append('svg')
  .attr('oncontextmenu', 'return false;')
  .attr("style", "outline: thin solid black;")
  .attr('width', width)
  .attr('height', height);


d3.json('dns.json', function(success) {
  nodes = success;
  lastNodeId = 14;
  links = [
  {
    source: nodes[0], target: nodes[1], left: false, right: true
  },
  {
    source: nodes[1], target: nodes[2], left: false, right: true
  }];
  force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([width, height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', tick);
  restart();
});



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

  // TODO: unneeded line?
	// circle.selectAll('circle');

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
		.style('fill', function(d) { return d.
      color; })
		.style('stroke', 'black')
    // Mouse interactions for individual nodes defined here.
		.on('mousedown', function(d) {
      // Select current node.
			mousedown_node = d;
      // Deselect if was already selected.
			if (mousedown_node === selected_node) {
				selected_node = null;
        console.log('Deselecting ' + d.text);
			} else {
				selected_node = mousedown_node;
        console.log('Selecting ' + d.text);
			}
			drag_line.style('marker-end', 'url(#end-arrow)')
			.classed('hidden', false)
			.attr('d', 'M' + mousedown_node.x + ',' + mousedown_node.y
				+ 'L' + mousedown_node.x + ',' + mousedown_node.y);

			restart();
		})
		.on('mouseup', function(d) {
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
        console.log("Filtering links.");
				return (l.source === source && l.target === target);
			})[0];

      // For testing: was "if (link)"
			if (false) {
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

function mousedown() {
	svg.classed('active', true);

	if (mousedown_node || mousedown_link) {
		return;
	}

  // New node here.
	var point = d3.mouse(this),
		node = {
			id: ++lastNodeId
		};
	node.x = point[0];
	node.y = point[1];
  node.text = 'New authoritative nameserver';
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

function spliceLinksForNode(node) {
	var toSplice = links.filter(function(l) {
		return (l.source === node || l.target === node);
	});

	toSplice.map(function(l) {
		links.splice(links.indexOf(l), 1);
	});
}

svg.on('mousedown', mousedown)
	.on('mousemove', mousemove)
	.on('mouseup', mouseup);
