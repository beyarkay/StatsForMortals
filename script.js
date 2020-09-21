import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import {OrbitControls} from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';

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

// 2D
let xScale, yScale, lineGen, corners, extents, svg;
// 3D
let canvas, renderer, controls, scene, camera, surface;

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
export function build3dGraph(canvas_id, graph_params, inputs, function_params) {
    // TODO dynamically respond to the inputs array
    canvas = document.querySelector('#' + canvas_id);
    renderer = new THREE.WebGLRenderer({canvas});

    // Setup the camera
    const fov = 70;
    const aspect = 2;
    const near = 0.1;
    const far = 50;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 7);

    // Setup the mouse controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();

    // Create the Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#ffffff');

    // Add in two lights
    let light = new THREE.PointLight("#ffffff", 1);
    light.position.set(0, 3, 0);
    scene.add(light);
    light = new THREE.PointLight("#ffffff", 0.2);
    light.position.set(0, -3, 0);
    scene.add(light);

    // Create a floor at y=-0.0001 for the plot
    const geometry_plane = new THREE.PlaneGeometry(
        (graph_params.extrema[0][1] - graph_params.extrema[0][0]),
        (graph_params.extrema[2][1] - graph_params.extrema[2][0])
    );
    geometry_plane.rotateX(Math.PI / 2);
    geometry_plane.translate(0, -0.001, 0);
    const material_plane = new THREE.MeshBasicMaterial({
        color: "#000000",
        opacity: 0.5,
        transparent: true,
        side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry_plane, material_plane);
    scene.add(plane);


    // TODO refactor this junk into a for-loop
    // Add a line for the x-axis. Ticks come later
    const geometry_x_axis = new THREE.BoxBufferGeometry(
        (graph_params.extrema[0][1] - graph_params.extrema[0][0]), 0.05, 0.05,
        1, 1, 1);
    geometry_x_axis.translate(0, 0, graph_params.extrema[2][1]);
    const material_basic = new THREE.MeshBasicMaterial({
        color: "#000000",
        side: THREE.DoubleSide,
    });
    let x_axis_line = new THREE.Mesh(geometry_x_axis, material_basic);
    scene.add(x_axis_line);

    // Add a line for the z-axis. Ticks come later
    const geometry_z_axis = new THREE.BoxBufferGeometry(
        0.05, 0.05, (graph_params.extrema[2][1] - graph_params.extrema[2][0]),
        1, 1, 1);
    geometry_z_axis.translate(graph_params.extrema[0][1], 0, 0);
    let z_axis_line = new THREE.Mesh(geometry_z_axis, material_basic);
    scene.add(z_axis_line);

    // Add a line for the y-axis. Ticks come later
    const geometry_y_axis = new THREE.BoxBufferGeometry(
        0.05, (graph_params.extrema[1][1] - graph_params.extrema[1][0]), 0.05,
        1, 1, 1);
    // geometry_y_axis.translate(graph_params.extrema[0][1], 0, 0);
    let y_axis_line = new THREE.Mesh(geometry_y_axis, material_basic);
    scene.add(y_axis_line);

    // TODO END- refactor this junk into a for loop

    // Setup the ability to render text
    let loader = new THREE.FontLoader();
    loader.load('cmu_serif_italic.json', font => {
        const font_size = 0.4;

        // TODO refactor these for loops into ANOTHER FOR LOOP!
        for (let x = Math.ceil(graph_params.extrema[0][0]); x <= Math.floor(graph_params.extrema[0][1]); x++) {
            // Add x-tick text
            const tick_text = x === 0 ? 'x' : x.toString();
            let geometry_text = new THREE.TextGeometry(tick_text, {
                font: font,
                size: font_size,
                height: 0.005,
                curveSegments: 12,
                bevelEnabled: false,
            });
            geometry_text.computeBoundingBox();
            let range = geometry_text.boundingBox.max.x - geometry_text.boundingBox.min.x;

            geometry_text.translate(x - (range * 1.1) * 0.5, -(font_size + 0.1), graph_params.extrema[2][1]);
            let textGeo = new THREE.Mesh(geometry_text, material_basic);
            scene.add(textGeo);

            // Add x-tick dots
            const geometry_x_tick = new THREE.BoxBufferGeometry(
                0.05, 0.2, 0.05,
                1, 1, 1);
            geometry_x_tick.translate(x, 0, graph_params.extrema[2][1]);
            let meshTick = new THREE.Mesh(geometry_x_tick, material_basic);
            scene.add(meshTick);
        }
        for (let z = Math.ceil(graph_params.extrema[2][0]); z <= Math.floor(graph_params.extrema[2][1]); z++) {
            // Add x-tick text
            const tick_text = z === 0 ? 'z' : z.toString();
            let geometry_text = new THREE.TextGeometry(tick_text, {
                font: font,
                size: font_size,
                height: 0.005,
                curveSegments: 12,
                bevelEnabled: false,
            });
            geometry_text.rotateY(Math.PI * 0.5);
            geometry_text.computeBoundingBox();
            let range = geometry_text.boundingBox.max.z - geometry_text.boundingBox.min.z;
            geometry_text.translate(graph_params.extrema[0][1], -(font_size + 0.1), z + (range * 1.1) * 0.5);
            let textGeo = new THREE.Mesh(geometry_text, material_basic);
            scene.add(textGeo);

            // Add z-tick dots
            const geometry_z_tick = new THREE.BoxBufferGeometry(
                0.05, 0.2, 0.05,
                1, 1, 1);
            geometry_z_tick.translate(graph_params.extrema[2][1], 0, z);
            let meshTick = new THREE.Mesh(geometry_z_tick, material_basic);
            scene.add(meshTick);
        }
        for (let y = Math.ceil(graph_params.extrema[1][0]); y <= Math.floor(graph_params.extrema[1][1]); y++) {
            // Add x-tick text
            const tick_text = y === 0 ? 'y' : y.toString();
            let geometry_text = new THREE.TextGeometry(tick_text, {
                font: font,
                size: font_size * 0.5,
                height: 0.005,
                curveSegments: 12,
                bevelEnabled: false,
            });
            geometry_text.computeBoundingBox();
            let text_width = geometry_text.boundingBox.max.x - geometry_text.boundingBox.min.x;
            let text_height = geometry_text.boundingBox.max.y - geometry_text.boundingBox.min.y;
            geometry_text.translate(text_width, y - 0.5 * (text_height * 0.8), 0);
            let textGeo = new THREE.Mesh(geometry_text, material_basic);
            scene.add(textGeo);

            // Add z-tick bars
            const geometry_y_tick = new THREE.BoxBufferGeometry(
                0.2, 0.05, 0.05,
                1, 1, 1);
            geometry_y_tick.translate(0, y, 0);
            let meshTick = new THREE.Mesh(geometry_y_tick, material_basic);
            scene.add(meshTick);
        }
        // TODO END-refactor these for loops into ANOTHER FOR LOOP!

    });

    // Create a parametric surface for the plot
    // TODO factor out std_norm_distro to be parametric itself
    let params = calculateParams(canvas_id, inputs);
    const geometry_plot = new THREE.ParametricGeometry((u, v, target) => {
        target.set(u, v, function_params[0].func(u, v, params))
    }, 25, 25);

    // TODO is this required here, or is it going to be done in animate() anyway?
    // Calculate colours based on surface's height:
    updateColors(geometry_plot);

    const material_plot = new THREE.MeshBasicMaterial({
        vertexColors: THREE.VertexColors,
        side: THREE.DoubleSide,
        flatShading: false,
    });
    surface = new THREE.Mesh(geometry_plot, material_plot);
    scene.add(surface);

    update3dGraph(canvas_id, graph_params, inputs, function_params);

}

function update3dGraph(canvas_id, graph_params, inputs, function_params) {

    if (resize_if_needed(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    requestAnimationFrame(() => {
        update3dGraph(canvas_id, graph_params, inputs, function_params)
    });
    controls.update();

    renderer.render(scene, camera);

    let params = calculateParams(canvas_id, inputs);
    // Update the surface based on slider changes
    const num_vertices = surface.geometry.vertices.length;
    for (let i = 0; i < num_vertices; i++) {
        // Normalise u, v to the extrema
        let u = (surface.geometry.vertices[i].x - graph_params.extrema[0][0]) / (graph_params.extrema[0][1] - graph_params.extrema[0][0]);
        let v = (surface.geometry.vertices[i].z - graph_params.extrema[2][0]) / (graph_params.extrema[2][1] - graph_params.extrema[2][0]);
        surface.geometry.vertices[i].y = function_params[0].func(u, v, params);
    }
    updateColors(surface.geometry);

    surface.geometry.computeFaceNormals();
    surface.geometry.computeVertexNormals();
    surface.geometry.normalsNeedUpdate = true;
    surface.geometry.verticesNeedUpdate = true;
    surface.geometry.elementsNeedUpdate = true;
}


function updateColors(geometry) {
    geometry.computeBoundingBox();
    let yMin = geometry.boundingBox.min.y;
    let yMax = geometry.boundingBox.max.y;
    let yRange = yMax - yMin;
    let color, point, face, numberOfSides, vertexIndex;
    let colorScale = d3.scaleSequential(d3.interpolatePuBu).domain([yMin, yMax]);

    // first, assign colors to vertices based off of their height
    for (let i = 0; i < geometry.vertices.length; i++) {
        point = geometry.vertices[i];
        // color = new THREE.Color(0xffffff);
        color = new THREE.Color(colorScale(point.y));
        // color.setHSL(0.7 * (yMax - point.y) / yRange, 1, 0.5);
        geometry.colors[i] = color; // use this array for convenience
    }
    // copy the colors as necessary to the face's vertexColors array.
    // faces are indexed using characters
    const faceIndices = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < geometry.faces.length; i++) {
        face = geometry.faces[i];
        numberOfSides = (face instanceof THREE.Face3) ? 3 : 4;
        for (let j = 0; j < numberOfSides; j++) {
            vertexIndex = face[faceIndices[j]];
            face.vertexColors[j] = geometry.colors[vertexIndex];
        }
    }
}

function resize_if_needed(renderer) {
    const canvas = renderer.domElement;
    // const pixelRatio = window.devicePixelRatio;
    // const pixelAdjustedWidth = canvas.clientWidth * pixelRatio | 0;
    // const pixelAdjustedHeight = canvas.clientHeight * pixelRatio | 0;
    // console.log(pixelRatio, pixelAdjustedWidth, canvas.width, pixelAdjustedHeight, canvas.height);
    //
    // if (canvas.width !== pixelAdjustedWidth || canvas.height !== pixelAdjustedHeight) {
    //     renderer.setSize(pixelAdjustedWidth, pixelAdjustedHeight, false);
    //     return true
    // }
    if (renderer.getPixelRatio() !== window.devicePixelRatio) {
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        return true
    }
    return false;
}