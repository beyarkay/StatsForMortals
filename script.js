const margin = {
    top: 10,
    right: 10,
    bottom: 30,
    left: 10,
};
const padding = {
    left: 40,
    right: 40
};
const width = window.innerWidth - padding.left - padding.right;
const height = width * 0.5;
let xScale;
let yScale;
let lineGen;

let scale = 0.5;
let sensitivity = [0.005, 0.005];
let rotation = [-Math.PI * 3 / 8, -Math.PI * 3 / 8, 0];
if (screen.width < screen.height) {
    // If the device is in a portrait orientation, the sensitivity to rotation should be greater.
    sensitivity = [0.01, 0.01];
}
let corners;
let extents;
let mouseStart;
let mouseDelta;
let points;
let svg;

function rotX(theta) {
    return math.transpose([
        [1, 0, 0],
        [0, math.cos(theta), -math.sin(theta)],
        [0, math.sin(theta), math.cos(theta)]
    ]);
}

function rotY(theta) {
    return math.transpose([
        [math.cos(theta), 0, -math.sin(theta)],
        [0, 1, 0],
        [math.sin(theta), 0, math.cos(theta)]
    ]);
}

function rotZ(theta) {
    return math.transpose([
        [math.cos(theta), -math.sin(theta), 0],
        [math.sin(theta), math.cos(theta), 0],
        [0, 0, 1],
    ]);
}

function projection(scale) {
    return math.transpose([
        [scale, 0, 0],
        [0, scale, 0],
        [0, 0, scale],
    ]);
}

// 2D things
export function buildGraph(div_id, graph_params, inputs, function_params) {
    // Create an svg element
    let svg = d3.select('#' + div_id)
        .append('svg')
        .attr("viewBox", [0, 0, width, height]);

    // Create a div to hold the inputs
    let input_div = d3.select('#' + div_id)
        .append('div');

    // Populate the input div with inputs
    for (let i = 0; i < inputs.length; i++) {
        let uid = div_id + '_' + inputs[i].key;
        if (inputs[i].type === 'range') {
            // Add a range slider
            input_div.append('input')
                .attr('type', inputs[i].type)
                .attr('min', inputs[i].min)
                .attr('max', inputs[i].max)
                .attr('step', inputs[i].step)
                .attr('div_id', uid)
                .attr('value', inputs[i].value)
                .on('input', () => {
                    // let element = document.querySelector('#' + uid);
                    // let params = calculateParams(div_id, inputs);
                    updateGraph(div_id, graph_params, inputs, function_params);
                });

            // Add a label for the range slider
            input_div.append('label')
                .attr('div_id', 'label_' + uid)
                .style('color', typeof inputs[i].color !== 'undefined' ? inputs[i].color : 'black')
                .text(inputs[i].label + inputs[i].value)
                .attr('for', uid);

        } else if (inputs[i].type === 'checkbox') {
            // Add a checkbox
            input_div.append('input')
                .attr('type', inputs[i].type)
                .attr('div_id', uid)
                .property('checked', inputs[i].checked)
                .on('updateSurface', () => {
                    // let element = document.querySelector('#' + uid);
                    // let params = calculateParams(div_id, inputs);
                    updateGraph(div_id, graph_params, inputs, function_params);
                });

            input_div.append('label')
                .attr('div_id', 'label_' + uid)
                .style('color', typeof inputs[i].color !== 'undefined' ? inputs[i].color : 'black')
                .attr('for', uid)
                .text(inputs[i].label);
        }
        input_div.append('br')
    }

    /* Plot the graphs without actually filling in the data */

    // Create an x-num_points for xy to pixel coordinates
    xScale = d3.scaleLinear()
        .domain(graph_params.xDomain)
        .range([margin.left, width - margin.right]);

    // Create a y-num_points for xy to pixel coordinates
    yScale = d3.scaleLinear()
        .domain(graph_params.yDomain)
        .range([height - margin.bottom, margin.top]);

    // Create generator for xy to SVG path language
    lineGen = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));

    // Draw the x axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + yScale(0) + ")")
        .call(d3.axisBottom(xScale));

    // Draw the y axis
    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + xScale(0) + ",0)")
        .call(d3.axisLeft(yScale));

    // Create a path for each function, but don't populate it with data just yet
    for (let i = 0; i < function_params.length; i++) {
        let uid = div_id + '_' + function_params[i].key;
        svg.append("path")
            .attr("class", "line")
            .attr('div_id', uid)
            .attr('fill', typeof function_params[i].fill !== 'undefined' ? function_params[i].fill : 'none')
            .attr('stroke', function_params[i].color)
            .attr('stroke-width', '2');

        // Add in a label for the function
        svg.append('text')
            .attr('div_id', 'label_' + uid)
            .attr('fill', function_params[i].color)
            .text(function_params[i].label);

        if (typeof function_params[i].plot_var !== 'undefined' && function_params[i].plot_var) {
            svg.append("g")
                .attr('div_id', 'var_' + uid);
            // Add lines and circles to make up a sort of box plot

            d3.select('#var_' + uid)
                .append("line")
                .attr('div_id', 'line_left_' + uid);
            d3.select('#var_' + uid)
                .append("line")
                .attr('div_id', 'line_right_' + uid);
            d3.select('#var_' + uid)
                .append("line")
                .attr('div_id', 'line_flat_' + uid);
            d3.select('#var_' + uid)
                .append("circle")
                .attr('div_id', 'circle_' + uid);
        }
    }


    // Now that the skeleton is in place, update it with the data
    updateGraph(div_id, graph_params, inputs, function_params)

}

function calculateParams(div_id, inputs) {
    let params = {};
    // Find the value associated with each input
    for (let i = 0; i < inputs.length; i++) {
        let uid = div_id + '_' + inputs[i].key;
        let input_element = document.querySelector('#' + uid);
        params[uid] = inputs[i].type === 'range' ? input_element.value : input_element.checked;
    }
    return params;

}

function updateGraph(div_id, graph_params, inputs, function_params) {
    // Should update the function values as well as any labels
    let params = calculateParams(div_id, inputs);

    // Update the labels that need updating
    for (let i = 0; i < inputs.length; i++) {
        if (inputs[i].type === 'range') {
            let uid = div_id + '_' + inputs[i].key;
            if (uid in params) {
                document.getElementById('label_' + uid)
                    .innerHTML = inputs[i].label + params[uid]
            }
        }
    }

    // Create an x-num_points for xy to pixel coordinates
    xScale = d3.scaleLinear()
        .domain(graph_params.xDomain)
        .range([margin.left, width - margin.right]);

    // Create a y-num_points for xy to pixel coordinates
    yScale = d3.scaleLinear()
        .domain(graph_params.yDomain)
        .range([height - margin.bottom, margin.top]);

    // Create generator for xy to SVG path language
    lineGen = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));


    // Calculate the functions' values at each point in yDomain
    for (let i = 0; i < function_params.length; i++) {
        let data = [];

        let x_min = graph_params.xDomain[0] - 100 * graph_params.step;
        let x_max = graph_params.xDomain[1] + 100 * graph_params.step;
        // Add the data points of the curve
        for (let x_val = x_min; x_val <= x_max; x_val += graph_params.step) {
            data.push({
                x: x_val,
                y: function_params[i].func(x_val, params)
            });
        }
        // Add extra data points to ensure the graph doesn't lift off of the axis
        data.push(
            // {
            //     x: graph_params.xDomain[1] + 40 * graph_params.step,
            //     y: function_params[i].func(graph_params.xDomain[1] + graph_params.step, params),
            // },
            {
                x: graph_params.xDomain[1] + 40 * graph_params.step,
                y: 0,
            },
        );
        data.unshift(
            {
                x: graph_params.xDomain[0] - 40 * graph_params.step,
                y: 0,
            },
            // {
            //     x: graph_params.xDomain[0] - 40 * graph_params.step,
            //     y: function_params[i].func(graph_params.xDomain[0] - graph_params.step, params),
            // },
        );


        // JS or D3 doesn't play nicely when the values get to big - clamp them:
        let range = graph_params.yDomain[1] - graph_params.yDomain[0];
        let clamp_max = graph_params.yDomain[1] + range;
        let clamp_min = graph_params.yDomain[0] - range;

        data = data.map((d) => {
            return {
                x: d.x,
                y: d.y < clamp_max ? (d.y > clamp_min ? d.y : clamp_min) : clamp_max
            };
        });


        // Add the newly calculated points to the paths
        let uid = div_id + '_' + function_params[i].key;
        d3.select('#' + uid)
            .style('opacity', function_params[i].calcOpacity(params))
            .attr('d', lineGen(data));

        // Update the position of the function's label

        let x_val = xScale(-5);
        let y_val = Math.min(
            yScale(graph_params.yDomain[0]),
            Math.max(
                yScale(graph_params.yDomain[1]),
                yScale(function_params[i].func(x_val, params))
            ));
        d3.select('#label_' + uid)
            .attr('x', x_val)
            .attr('y', y_val + 20 * (i + 1) * Math.sign(y_val))
            .style('opacity', function_params[i].calcOpacity(params));

        let boxplot_padding = -8;
        let radius = 4;
        let var_pad = 20;
        if (typeof function_params[i].plot_var !== 'undefined' && function_params[i].plot_var) {
            let expectation = 0;
            let variance = 0;

            // Do a discrete summation to calculate the variance, expectation
            let x_min = graph_params.xDomain[0] - 10000 * graph_params.step;
            let x_max = graph_params.xDomain[1] + 10000 * graph_params.step;
            for (let x = x_min; x <= x_max; x += graph_params.step) {
                let y = function_params[i].func(x, params);
                expectation += x * y * graph_params.step;
                variance += x * x * y * graph_params.step;
            }
            variance -= Math.pow(expectation, 2);
            let deviation = Math.sqrt(variance);


            d3.select('#line_left_' + uid)
                .attr('x1', xScale(expectation - deviation))
                .attr('y1', yScale(graph_params.yDomain[0]) - boxplot_padding * i + var_pad)
                .attr('x2', xScale(expectation + deviation))
                .attr('y2', yScale(graph_params.yDomain[0]) - boxplot_padding * i + var_pad)
                .attr('stroke-width', '2')
                .style("stroke", function_params[i].color)
                .style('opacity', function_params[i].calcOpacity(params));

            d3.select('#line_right_' + uid)
                .attr('x1', xScale(expectation - deviation))
                .attr('y1', yScale(graph_params.yDomain[0]) - boxplot_padding * i - radius + var_pad)
                .attr('x2', xScale(expectation - deviation))
                .attr('y2', yScale(graph_params.yDomain[0]) - boxplot_padding * i + radius + var_pad)
                .attr('stroke-width', '2')
                .style("stroke", function_params[i].color)
                .style('opacity', function_params[i].calcOpacity(params));

            d3.select('#line_flat_' + uid)
                .attr('x1', xScale(expectation + deviation))
                .attr('y1', yScale(graph_params.yDomain[0]) - boxplot_padding * i - radius + var_pad)
                .attr('x2', xScale(expectation + deviation))
                .attr('y2', yScale(graph_params.yDomain[0]) - boxplot_padding * i + radius + var_pad)
                .attr('stroke-width', '2')
                .style("stroke", function_params[i].color)
                .style('opacity', function_params[i].calcOpacity(params));

            d3.select('#circle_' + uid)
                .attr('depth', radius * 0.8)
                .attr('cx', xScale(expectation))
                .attr('cy', yScale(graph_params.yDomain[0]) - boxplot_padding * i + var_pad)
                .style("stroke", 'white')
                .style("fill", function_params[i].color)
                .style('opacity', function_params[i].calcOpacity(params));
        }

    }
}

// 3D Things
export function build3dGraph(div_id, graph_params, inputs, function_params) {
    svg = d3.select('#' + div_id)
        .append('svg')
        .attr("viewBox", [0, 0, width, height]);
    svg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .style('fill', '#e8e8e8');

    // Create an x-num_points for xy to pixel coordinates
    xScale = d3.scaleLinear()
        .domain([graph_params.xDomain[0], graph_params.xDomain[1]])
        .range([margin.left, width - margin.right]);

    // Create a y-num_points for xy to pixel coordinates
    yScale = d3.scaleLinear()
        .domain([graph_params.yDomain[0], graph_params.yDomain[1]])
        .range([height - margin.bottom, margin.top]);

    lineGen = d3.line()
        .x(d => xScale(d.x))
        .y(d => yScale(d.y));

    // ----------========== Set up the SVG groups ==========----------

    svg.append('g').attr('class', 'lines');
    svg.append('g').attr('class', 'points');
    svg.append('g').attr('class', 'scale');
    // ----------========== Make the SVG draggable ==========----------

    svg.call(d3.drag()
        .on("start", d => {
            mouseStart = [d3.event.x, d3.event.y];
        })
        .on("drag", d => {
                mouseDelta = [d3.event.x - mouseStart[0], d3.event.y - mouseStart[1]];
                update3dGraph(svg, [
                    rotation[0] + mouseDelta[0] * sensitivity[0],
                    rotation[1] + mouseDelta[1] * sensitivity[1],
                    rotation[2]],
                    graph_params, inputs, function_params);
            }
        ).on("end", d => {
            rotation[0] += mouseDelta[0] * sensitivity[0];
            rotation[1] += mouseDelta[1] * sensitivity[1];
        })
    );
    update3dGraph(svg, rotation, graph_params, inputs, function_params)
}

function update3dGraph(svg, rotation, graph_params, inputs, function_params) {

    // ----------========== Build up the point cloud ==========----------
    points = [];
    for (let x = graph_params.xDomain[0]; x <= graph_params.xDomain[1]; x += graph_params.step) {
        for (let y = graph_params.yDomain[0]; y <= graph_params.yDomain[1]; y += graph_params.step) {
            points.push([x, y, function_params.func(x, y)]);
        }
    }

    extents = [
        {
            min: Math.floor(d3.min(points, (d) => d[0])),
            max: Math.ceil(d3.max(points, (d) => d[0]))
        },
        {
            min: Math.floor(d3.min(points, (d) => d[1])),
            max: Math.ceil(d3.max(points, (d) => d[1]))
        },
        {
            min: Math.floor(d3.min(points, (d) => d[2])),
            max: Math.ceil(d3.max(points, (d) => d[2]))
        },
    ];
    corners = [
        [extents[0].min, extents[1].min, extents[2].min],
        [extents[0].min, extents[1].min, extents[2].max],
        [extents[0].min, extents[1].max, extents[2].min],
        [extents[0].min, extents[1].max, extents[2].max],
        [extents[0].max, extents[1].min, extents[2].min],
        [extents[0].max, extents[1].min, extents[2].max],
        [extents[0].max, extents[1].max, extents[2].min],
        [extents[0].max, extents[1].max, extents[2].max],
    ];

    // project all the points that make up the plot
    let points_projected = math.multiply(
        points,
        rotZ(rotation[0]),
        rotX(rotation[1]),
        projection(graph_params.scale)
    );
    let points_buffer = [];
    for (let i = 0; i < points_projected.length; i++) {
        points_buffer.push({
            x: points_projected[i][0],
            y: points_projected[i][1],
            z: points_projected[i][2],
            xyz: points[i]
        })
    }

    //  Sort the z-buffer
    points_buffer.sort((a, b) => a.z < b.z ? -1 : 1);

    let colorScale = d3.scaleSequential()
        .domain(d3.extent(points_buffer, (d) => d.xyz[2]))
        .interpolator(d3.interpolateViridis);

    // Join
    let circles = svg.select('.points').selectAll('circle').data(points_buffer);
    // Enter
    let z_min = d3.min(points_buffer, (d) => d.z);
    circles.enter()
        .append('circle')
        .style('stroke', 'white')
        .style('strokeWeight', 1)
        .merge(circles)
        .attr('cx', (d) => xScale(d.x))
        .attr('cy', (d) => yScale(d.y))
        .attr('r', (d) => 2 + scale * (d.z + 2))
        .style("fill", (d) => colorScale(d.xyz[2]));
    // Exit
    circles.exit().remove();

    createAxes(svg, corners, rotation, graph_params)


}

function createAxes(svg, corners, rotation, graph_params) {
    // Project the corners of the box that bounds all the points
    let corners_projected = math.multiply(
        corners,
        rotZ(rotation[0]),
        rotX(rotation[1]),
        projection(graph_params.scale)
    );
    let corners_buffer = [];
    for (let i = 0; i < corners_projected.length; i++) {
        corners_buffer.push({
            x: corners_projected[i][0],
            y: corners_projected[i][1],
            z: corners_projected[i][2],
            xyz: corners[i]
        })
    }
    let scale_lines = [
        [
            corners_buffer[0],
            corners_buffer[4]
        ], [
            corners_buffer[0],
            corners_buffer[2]
        ], [
            corners_buffer[0],
            corners_buffer[1]
        ],
    ];
    for (let i = 0; i < corners_buffer.length; i++) {
        if (i < 4) { // Figure out the x-scale lines
            let line = [
                corners_buffer[i],
                corners_buffer[i + 4]
            ];
            // scale_lines.push(line);

            if (line[0].xyz[2] <= scale_lines[0][0].xyz[2]
                && (line[0].y + line[1].y) < (scale_lines[0][0].y + scale_lines[0][1].y)) {
                scale_lines[0] = line.slice(); // copy line into z_line
            }
        }
        if ((i % 4) < 2) { // Figure out the y-scale lines
            let line = [
                corners_buffer[i],
                corners_buffer[i + 2]
            ];
            // scale_lines.push(line);
            let line_y_avg = (line[0].y + line[1].y) / 2;
            let scale_line_y_avg = (scale_lines[0][0].y + scale_lines[0][1].y) / 2;
            if (line[0].xyz[2] <= scale_lines[0][0].xyz[2] && line_y_avg < scale_line_y_avg) {
                scale_lines[1] = line.slice(); // copy line into z_line
            }
        }
        if (i % 2 === 0) { // Figure out the z-scale lines
            let line = [
                corners_buffer[i],
                corners_buffer[i + 1]
            ];
            // scale_lines.push(line);
            if (Math.abs(line[0].x) >= Math.abs(scale_lines[2][0].x) && line[0].z > scale_lines[2][0].z) {
                scale_lines[2] = line.slice(); // copy line into z_line
            }
        }
    }

    // =======Draw the text ticks of the scale=======

    let ticks = [];

    for (let i = 0; i < 3; i++) {
        let range = [
            (scale_lines[i][0].x - scale_lines[i][1].x),
            (scale_lines[i][0].y - scale_lines[i][1].y),
            (scale_lines[i][0].z - scale_lines[i][1].z)
        ];
        for (let value = extents[i].min; value <= extents[i].max; value++) {
            let fraction = (value - extents[i].min) / (extents[i].max - extents[i].min);
            ticks.push({
                x: scale_lines[i][1].x + (1 - fraction) * range[0], // lerp from min to max
                y: scale_lines[i][1].y + (1 - fraction) * range[1], // lerp from min to max
                z: scale_lines[i][1].z + (1 - fraction) * range[2], // lerp from min to max
                xyz: [scale_lines[i][0][0], scale_lines[i][0][1], value]
            })
        }
    }
    let scaleScale = d3.scaleSequential()
        .domain([0, 2])
        .interpolator(d3.interpolateViridis);


    // =======Draw the lines of the scale=======
    // Join
    let lines = svg.select('.scale').selectAll('line').data(scale_lines);
    // Enter
    lines.enter()
        .append('line')
        .style('strokeWeight', 1)
        .style('stroke', 'black')
        .merge(lines)
        .attr('x1', (d) => xScale(d[0].x))
        .attr('y1', (d) => yScale(d[0].y))
        .attr('x2', (d) => xScale(d[1].x))
        .attr('y2', (d) => yScale(d[1].y));
    // Exit
    lines.exit().remove();

    // =======Draw the text ticks of the scale=======
    // Join
    let text_ticks = svg.select('.scale').selectAll('text').data(ticks);
    // Enter
    text_ticks.enter()
        .append('text')
        .attr("font-size", 20 * scale)
        .merge(text_ticks)
        .text((d) => d.xyz[2])
        .attr('x', (d) => xScale(d.x))
        .attr('y', (d) => yScale(d.y));
    // Exit
    text_ticks.exit().remove();
}
