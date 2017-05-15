var Xwing = function () {

    var scope = this;

    THREE.Geometry.call( this );

    v(   5,   0,   0 ); // v0 head
    v( - 5, - 2,   1 ); // v1 back bottom right
    v( - 5,   0,   0 ); // v2 back top
    v( - 5, - 2, - 1 ); // v3 back bottom left

    v(   -2,   3, - 6 ); // v4 left wing tip
    v(   -2,   3,   6 ); // v5 right wing tip
    v(   0,   -1,   0 ); // v6 body center front
    v( - 4,   -1,   0 ); // v7 body center back

    v(   -2,   -5, - 6 ); // v8 left wing bottom tip
    v(   -2,   -5,   6 ); // v9 right wing bottom tip

    f3( 0, 2, 1 ); // right body
    f3( 0, 3, 2 ); // left body

    f3( 4, 7, 6 ); // left top wing
    f3( 5, 6, 7 ); // right top wing

    f3(0, 1, 3); // body bottom
    f3(8, 7, 6); // left bot wing
    f3(9, 6, 7); // right top wing

    this.computeFaceNormals();
    this.computeVertexNormals();

    function v( x, y, z ) {

        scope.vertices.push( new THREE.Vector3( x, y, z ) );

    }

    function f3( a, b, c ) {

        scope.faces.push( new THREE.Face3( a, b, c ) );

    }
    for (i = 0; i < this.faces.length ; i++) {
       this.faceVertexUvs[0].push([
         new THREE.Vector2( Math.random(), Math.random() ),
         new THREE.Vector2( Math.random(), Math.random() ),
         new THREE.Vector2( Math.random(), Math.random() ),
       ]);
    }

}

Xwing.prototype = Object.create( THREE.Geometry.prototype );
Xwing.prototype.constructor = Xwing;

var Tie = function () {

    var scope = this;

    THREE.Geometry.call( this );

    v(2, 0, 0);
    v(-1, 1.5, 0);
    v(-1, -1, -3);
    v(-1, -1, 3);

    v(4, 4, -3);
    v(-4, 4, -3);
    v(4, -4, -3);
    v(-4, -4, -3);

    v(4, 4, 3);
    v(-4, 4, 3);
    v(4, -4, 3);
    v(-4, -4, 3);

    f3(0, 1, 2);
    f3(0, 1, 3);
    f3(0, 2, 3);
    f3(1, 2, 3);

    f3(4, 5, 6);
    f3(5, 6, 7);

    f3(8, 9, 10);
    f3(9, 10, 11);

    this.computeFaceNormals();

    function v( x, y, z ) {

        scope.vertices.push( new THREE.Vector3( x, y, z ) );

    }

    function f3( a, b, c ) {

        scope.faces.push( new THREE.Face3( a, b, c ) );

    }

    for (i = 0; i < this.faces.length ; i++) {
       this.faceVertexUvs[0].push([
         new THREE.Vector2( Math.random(), Math.random() ),
         new THREE.Vector2( Math.random(), Math.random() ),
         new THREE.Vector2( Math.random(), Math.random() ),
       ]);
    }

}

Tie.prototype = Object.create( THREE.Geometry.prototype );
Tie.prototype.constructor = Tie;

var StarDestroyer = function () {

    var scope = this;
    THREE.Geometry.call( this );

    var half_depth = 20;
    var half_height = 5;
    var half_width = 10;
    var scale = 10;

    half_depth *= scale;
    half_height *= scale;
    half_width *= scale;

    v(half_depth, 0, 0); // 0 - tip of destroyer
    v(-half_depth, half_height, 0); // 1 - back top of destroyer
    v(-half_depth, 0, half_width); // 2 - back right of destroyer
    v(-half_depth, 0, -half_width); // 3 - back left of destroyer
    v(-half_depth - 0.25*half_depth, 0, 0); // 4 - back center of destroyer
    v(-half_depth, -half_height, 0); // 5 - back bottom of destroyer

    f3(0, 1, 2); // top right
    f3(1, 0, 3); // top left
    f3(0, 2, 5); // bottom right
    f3(0, 5, 3); // bottom left

    f3(2, 1, 4); // back top right
    f3(4, 5, 2); // back bot right
    f3(1, 3, 4); // back top left
    f3(4, 3, 5); // back bot left


    function v( x, y, z ) {

        scope.vertices.push( new THREE.Vector3( x, y, z ) );

    }

    function f3( a, b, c ) {

        scope.faces.push( new THREE.Face3( a, b, c ) );

    }

    for (i = 0; i < this.faces.length ; i++) {
       this.faceVertexUvs[0].push([
         new THREE.Vector2( Math.random(), Math.random() ),
         new THREE.Vector2( Math.random(), Math.random() ),
         new THREE.Vector2( Math.random(), Math.random() ),
       ]);
    }

    this.updateGeo = function() {
        scope.computeFaceNormals();
        scope.computeBoundingBox();
    };

    this.updateGeo();

}

StarDestroyer.prototype = Object.create( THREE.Geometry.prototype );
StarDestroyer.prototype.constructor = StarDestroyer;