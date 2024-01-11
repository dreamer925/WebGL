'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lightModel;

let lightPosition = [1,1,1];

document.getElementById("draw").addEventListener("click", applyParameters);

function applyParameters() {
    CreateSurfaceData()
    init()
}

// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, normal) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normal), gl.STREAM_DRAW);

        this.count = vertices.length/3;
    }

    this.Draw = function() {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.drawArrays(gl.TRIANGLES, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iLightPosition = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored shape, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0,0,0.6,0.6);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection );

    const normal = m4.identity();
    m4.inverse(modelView, normal);
    m4.transpose(normal, normal);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normal);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [0,0,1,1] );

    surface.Draw();

    //gl.uniform3fv(shProgram.iLightPosition, lightPosition);
    //lightModel.Draw();
}

function CalculateVertex(i, j) {
    let a = document.getElementById("a").value;
    let b = document.getElementById("b").value;
    let c = document.getElementById("c").value;
    let d = document.getElementById("d").value;
    let m = document.getElementById("s").value;

    a = a * m, b = b * m, c = c * m, d = d * m;

    let f = a * b / Math.sqrt((a * a * Math.sin(i) * Math.sin(i) + b * b * Math.cos(i) * Math.cos(i)));
    let x = 0.5 * (f * (1 + Math.cos(j)) + (d * d - c * c) * ((1 - Math.cos(j)) / f)) * Math.cos(i);
    let y = 0.5 * (f * (1 + Math.cos(j)) + (d * d - c * c) * ((1 - Math.cos(j)) / f)) * Math.sin(i);
    let z = 0.5 * (f - ((d * d - c * c) / f)) * Math.sin(j);

    return([x,y,z]);
}

function calculateNormals(i, j, getVertexFunction) {
    let psi = 0.0001;
    let vertex = getVertexFunction(i, j);
    let vertexU = getVertexFunction(i, j + psi);
    let vertexV = getVertexFunction(i + psi, j);

    let dU = [
        (vertex[0] - vertexU[0]) / psi,
        (vertex[1] - vertexU[1]) / psi,
        (vertex[2] - vertexU[2]) / psi
    ];

    let dV = [
        (vertex[0] - vertexV[0]) / psi,
        (vertex[1] - vertexV[1]) / psi,
        (vertex[2] - vertexV[2]) / psi
    ];

    let normal = m4.normalize(m4.cross(dU, dV));

    return normal;
}

function CreateSurfaceData() {

    let vertexList = [];
    let normalList = [];

    for (let i = 0; i <= 2 * Math.PI; i += 0.1) {
        for (let j = 0; j <= 2 * Math.PI; j += 0.1) {
            let vertex1 = CalculateVertex(i, j);
            let vertex2 = CalculateVertex(i, j + 0.1);
            let vertex3 = CalculateVertex(i + 0.1, j);
            let vertex4 = CalculateVertex(i + 0.1, j + 0.1);

            let Normal1 = calculateNormals(i, j, CalculateVertex);
            let Normal2 = calculateNormals(i, j + 0.1, CalculateVertex);
            let Normal3 = calculateNormals(i + 0.1, j, CalculateVertex);
            let Normal4 = calculateNormals(i + 0.1, j + 0.1, CalculateVertex);

            vertexList.push(...vertex1, ...vertex2, ...vertex3, ...vertex3, ...vertex2, ...vertex4);
            normalList.push(...Normal1, ...Normal2, ...Normal3, ...Normal3, ...Normal2, ...Normal4);
        }
    }

    for  (let j = 0; j <= 2 * Math.PI; j += 0.1){
        for (let i = 0; i <= 2 * Math.PI; i += 0.1) {
            let vertex1 = CalculateVertex(i, j);
            let vertex2 = CalculateVertex(i, j + 0.1);
            let vertex3 = CalculateVertex(i + 0.1, j);
            let vertex4 = CalculateVertex(i + 0.1, j + 0.1);

            let Normal1 = calculateNormals(i, j, CalculateVertex);
            let Normal2 = calculateNormals(i, j + 0.1, CalculateVertex);
            let Normal3 = calculateNormals(i + 0.1, j, CalculateVertex);
            let Normal4 = calculateNormals(i + 0.1, j + 0.1, CalculateVertex);

            vertexList.push(...vertex1, ...vertex2, ...vertex3, ...vertex3, ...vertex2, ...vertex4);
            normalList.push(...Normal1, ...Normal2, ...Normal3, ...Normal3, ...Normal2, ...Normal4);
        }
    }

    return [vertexList, normalList];
}

function CalculateVertexSphere(j, i, r) {
    let x = r * Math.sin(i) * Math.cos(j);
    let y = r * Math.sin(i) * Math.sin(j);
    let z = r * Math.cos(i);

    return [x, y, z];
}
function CreateSurfaceLight() {
    let radius = 0.1;

    let vertexList = [];

    for (let i = 0; i <= Math.PI; i += 0.1) {
        for (let j = 0; j <= 2 * Math.PI; j += 0.1) {
            let vertex1 = CalculateVertexSphere(j, i, radius);
            let vertex2 = CalculateVertexSphere(j, i + 0.1, radius);
            let vertex3 = CalculateVertexSphere(j + 0.1, i, radius);
            let vertex4 = CalculateVertexSphere(j + 0.1, i + 0.1, radius);

            vertexList.push(...vertex1, ...vertex2, ...vertex3, ...vertex3, ...vertex2, ...vertex4);
        }
    }

    for (let i = 0; i < vertexList.length; i += 3) {
        vertexList[i] += lightPosition[0];
        vertexList[i + 1] += lightPosition[1];
        vertexList[i + 2] += lightPosition[2];
    }

    return [vertexList, vertexList];
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, 'vertex');
    shProgram.iAttribNormal              = gl.getAttribLocation(prog, 'normal');
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog,'ModelViewProjectionMatrix');
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog,'NormalMatrix');
    shProgram.iColor                     = gl.getUniformLocation(prog, 'color');
    shProgram.iLightPosition             = gl.getUniformLocation(prog, "lightPosition")

    surface = new Model('Surface');
    surface.BufferData(...CreateSurfaceData());

    lightModel = new Model();
    lightModel.BufferData(...CreateSurfaceLight());
    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL(true);  // initialize the WebGL graphics context
        spaceball = new TrackballRotator(canvas, draw, 0);
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    draw();
}
