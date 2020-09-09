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
                .attr('id', uid)
                .attr('value', inputs[i].value)
                .on('input', () => {
                    // let element = document.querySelector('#' + uid);
                    // let params = calculateParams(div_id, inputs);
                    updateGraph(div_id, graph_params, inputs, function_params);
                });

            // Add a label for the range slider
            input_div.append('label')
                .attr('id', 'label_' + uid)
                .style('color', typeof inputs[i].color !== 'undefined' ? inputs[i].color : 'black')
                .text(inputs[i].label + inputs[i].value)
                .attr('for', uid);

        } else if (inputs[i].type === 'checkbox') {
            // Add a checkbox
            input_div.append('input')
                .attr('type', inputs[i].type)
                .attr('id', uid)
                .property('checked', inputs[i].checked)
                .on('updateSurface', () => {
                    // let element = document.querySelector('#' + uid);
                    // let params = calculateParams(div_id, inputs);
                    updateGraph(div_id, graph_params, inputs, function_params);
                });

            input_div.append('label')
                .attr('id', 'label_' + uid)
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
            .attr('id', uid)
            .attr('fill', typeof function_params[i].fill !== 'undefined' ? function_params[i].fill : 'none')
            .attr('stroke', function_params[i].color)
            .attr('stroke-width', '2');

        // Add in a label for the function
        svg.append('text')
            .attr('id', 'label_' + uid)
            .attr('fill', function_params[i].color)
            .text(function_params[i].label);

        if (typeof function_params[i].plot_var !== 'undefined' && function_params[i].plot_var) {
            svg.append("g")
                .attr('id', 'var_' + uid);
            // Add lines and circles to make up a sort of box plot

            d3.select('#var_' + uid)
                .append("line")
                .attr('id', 'line_left_' + uid);
            d3.select('#var_' + uid)
                .append("line")
                .attr('id', 'line_right_' + uid);
            d3.select('#var_' + uid)
                .append("line")
                .attr('id', 'line_flat_' + uid);
            d3.select('#var_' + uid)
                .append("circle")
                .attr('id', 'circle_' + uid);
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

export function buildSurface(div_id, graph_params, inputs, function_params) {
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
                .attr('id', uid)
                .attr('value', inputs[i].value)
                .on('input', () => {
                    let element = document.querySelector('#' + uid);
                    let params = calculateParams(div_id, inputs);
                    updateGraph(div_id, graph_params, inputs, function_params);
                });

            // Add a label for the range slider
            input_div.append('label')
                .attr('id', 'label_' + uid)
                .style('color', typeof inputs[i].color !== 'undefined' ? inputs[i].color : 'black')
                .text(inputs[i].label + inputs[i].value)
                .attr('for', uid);

        } else if (inputs[i].type === 'checkbox') {
            // Add a checkbox
            input_div.append('input')
                .attr('type', inputs[i].type)
                .attr('id', uid)
                .property('checked', inputs[i].checked)
                .on('updateSurface', () => {
                    let element = document.querySelector('#' + uid);
                    let params = calculateParams(div_id, inputs);
                    updateGraph(div_id, graph_params, inputs, function_params);
                });

            input_div.append('label')
                .attr('id', 'label_' + uid)
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
            .attr('id', uid)
            .attr('fill', typeof function_params[i].fill !== 'undefined' ? function_params[i].fill : 'none')
            .attr('stroke', function_params[i].color)
            .attr('stroke-width', '2');

        // Add in a label for the function
        svg.append('text')
            .attr('id', 'label_' + uid)
            .attr('fill', function_params[i].color)
            .text(function_params[i].label);

        if (typeof function_params[i].plot_var !== 'undefined' && function_params[i].plot_var) {
            svg.append("g")
                .attr('id', 'var_' + uid);
            // Add lines and circles to make up a sort of box plot

            d3.select('#var_' + uid)
                .append("line")
                .attr('id', 'line_left_' + uid);
            d3.select('#var_' + uid)
                .append("line")
                .attr('id', 'line_right_' + uid);
            d3.select('#var_' + uid)
                .append("line")
                .attr('id', 'line_flat_' + uid);
            d3.select('#var_' + uid)
                .append("circle")
                .attr('id', 'circle_' + uid);
        }
    }


    // Now that the skeleton is in place, update it with the data
    updateSurface(div_id, graph_params, inputs, function_params)

}

function updateSurface(div_id, graph_params, inputs, function_params) {
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

// function rubbish() {
//     const margin = {
//         top: 10,
//         right: 10,
//         bottom: 30,
//         left: 10,
//     };
//     const padding = {
//         left: 40,
//         right: 40
//     };
//     const width = window.innerWidth - padding.left - padding.right;
//     const height = width * 0.5;
//     let xScale;
//     let yScale;
//     let lineGen;
//
//     var step = 1.0;
//     var origin = [width / 2, height / 2];
//     var num_points = 16;
//     var points = [];
//     var alpha = 0;
//     var beta = 0;
//     var startAngle = Math.PI / 4;
//     var svg = d3.select('svg').append('g');
//
//     var surface;
//     surface = d3._3d()
//         .scale(12)
//         .x(function (d) {
//             return d.x;
//         })
//         .y(function (d) {
//             return d.y;
//         })
//         .z(function (d) {
//             return d.z;
//         })
//         .origin(origin)
//         .rotateY(startAngle)
//         .rotateX(-startAngle)
//         .shape('SURFACE', num_points * 2);
//
//     var color = d3.scaleLinear();
//
//     function processData(data, transition_time) {
//
//         var planes = svg.selectAll('path').data(data, function (d) {
//             return d.plane;
//         });
//
//         planes
//             .enter()
//             .append('path')
//             .attr('class', '_3d')
//             .attr('fill', colorize)
//             .attr('opacity', 0)
//             .attr('stroke-opacity', 0.1)
//             .merge(planes)
//             // .attr('stroke', 'black')
//             .transition().duration(transition_time)
//             .attr('opacity', 1)
//             .attr('fill', colorize)
//             .attr('d', surface.draw);
//
//         planes.exit().remove();
//
//         d3.selectAll('._3d').sort(surface.sort);
//
//     }
//
//     function colorize(d) {
//         var y_avg = (d[0].y + d[1].y + d[2].y + d[3].y) / 4;
//         // ccw dictates if the scaleToSurface is on the underneath
//         return d.ccw ? d3.interpolateSpectral(color(y_avg)) : d3.color(d3.interpolateSpectral(color(y_avg))).darker(2.5);
//     }
//
//     function dragStart() {
//         mouseStart = d3.event.x;
//         my = d3.event.y;
//     }
//
//     function dragged() {
//         mouseX = mouseX || 0;
//         mouseY = mouseY || 0;
//         beta = (d3.event.x - mouseStart + mouseX) * Math.PI / 230;
//         alpha = (d3.event.y - my + mouseY) * Math.PI / 230 * (-1);
//         processData(surface.rotateY(beta + startAngle).rotateX(alpha - startAngle)(points), 0);
//     }
//
//     function dragEnd() {
//         mouseX = d3.event.x - mouseStart + mouseX;
//         mouseY = d3.event.y - my + mouseY;
//     }
//
//     function buildSurface(func) {
//         points = [];
//
//         for (var z = -num_points; z < num_points; z += step) {
//             for (var x = -num_points; x < num_points; x++) {
//                 points.push({x: x, y: func(x, z), z: z});
//             }
//         }
//
//         var yMin = d3.min(points, function (d) {
//             return d.y;
//         });
//         var yMax = d3.max(points, function (d) {
//             return d.y;
//         });
//
//         color.domain([yMin, yMax]);
//         processData(surface(points), 10);
//     }
//
//     function updateSurface() {
//         var func = function (x, z) {
//             let rho = 0.5;
//             let mu = [0, 0];
//             let sigma = [1, 1];
//
//             rho = Math.min(0.9999, Math.max(-0.9999, rho));
//             const Q =
//                 Math.pow((x - mu[0]) / sigma[0], 2)
//                 - 2 * rho * ((x - mu[0]) / sigma[0]) * ((z - mu[1]) / sigma[1])
//                 + Math.pow((z - mu[1]) / sigma[1], 2);
//
//             const quotient = 2 * Math.PI * Math.sqrt(1 - rho * rho) * Math.sqrt(sigma[0]) * Math.sqrt(sigma[1])
//
//             return 1 / quotient * Math.exp(-Q / (2 * (1 - rho * rho)));
//
//             // return Math.cos(Math.sqrt(x * x + z * z) / 5 * Math.PI) * rn1;
//         };
//         buildSurface(func);
//     }
//
//     d3.selectAll('button').on('click', updateSurface);
//
//     updateSurface();
// }