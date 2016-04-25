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
  	.attr('d', 'M10, -5L0,0L10,5')
  	.attr('fill', '#000')
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
	selected_link = null,
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
		return 'M' + sourceX + ',', + sourceY + 'L' + targetX + ',' + targetY;
	});

	circle.attr('transform', function(d) {
		return 'translate(' + d.x + ',' + d.y + ')';
	});
}

function restart() {
	path = path.data(links);

	path.classed('selected', function(d) { return d === selected_link; })
		.style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
		.style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; });
		
	path.enter().append('svg:path')
		.attr('class', 'link')
		.classed('selected', function(d) { return d === selected_link; })
		.style('marker-start', function(d) { return d.left ? 'url(#start-arrow)' : ''; })
		.style('marker-end', function(d) { return d.right ? 'url(#end-arrow)' : ''; })
		.on('mousedown', function(d) {
			if (d3.event.ctrlKey) return;

			mousedown_link = d;
			if (mousedown_link === selected_link) {
				selected_link = null;
			} else {
				selected_link = mousedown_link;
			}
			selected_node = null;
			restart();
		});

	path.exit().remove();

	circle = circle.data(nodes, function(d) { return d.id; });

  // TODO: unneeded line?
	circle.selectAll('circle');

	var g = circle.enter().append('svg:g');

	g.append('svg:circle')
		.attr('class', 'node')
		.attr('r', 12)
		.style('fill', function(d) { return d.color; })
		.style('stroke', 'gold')
		.on('mouseover', function(d) {
			if (!mousedown_node || d === mousedown_node) {
				return;
			}
			d3.select(this).attr('transform', 'scale(1.1)');
		})
		.on('mouseout', function(d) {
			if (!mousedown_node || d === mousedown_node) {
				return;
			}
			d3.select(this).attr('transform', '');
		})
		.on('mousedown', function(d) {
			if (d3.event.ctrlKey) {
				return;
			}
			mousedown_node = d;
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

			d3.select(this).attr('transform', '');

			var source, target, direction;

			if (mousedown_node.id < mouseup_node.id) {
				source = mousedown_node;
				target = mouseup_node;
				direction = 'right';
			} else {
				source = mouseup_node;
				target = mousedown_node;
				direction = 'left';
			}

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

			selected_link = link;
			selected_node = null;
			restart();
		});

	g.append('svg:text')
		.attr('x', -20)
		.attr('y', -25)
		.attr('class', 'id')
    // Applies text to element.
		.text(function(d) { return d.text; });

	circle.exit().remove();

	force.start();
}

function mousedown() {
	svg.classed('active', true);

	if (d3.event.ctrlKey || mousedown_node || mousedown_link) {
		return;
	}

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
		drag_line.classed('hidden', true)
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
};

svg.on('mousedown', mousedown)
	.on('mousemove', mousemove)
	.on('mouseup', mouseup);
restart();