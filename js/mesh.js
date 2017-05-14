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

    f3(0, 3, 1); // body bottom
    f3(8, 7, 6); // left bot wing
    f3(9, 6, 7); // right top wing

    this.computeFaceNormals();

    function v( x, y, z ) {

        scope.vertices.push( new THREE.Vector3( x, y, z ) );

    }

    function f3( a, b, c ) {

        scope.faces.push( new THREE.Face3( a, b, c ) );

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

}

Tie.prototype = Object.create( THREE.Geometry.prototype );
Tie.prototype.constructor = Tie;