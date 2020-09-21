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

let corners;
let extents;
let svg;


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

// 3D Things
export function build3dGraph(div_id, graph_params, inputs, function_params) {


}
