var SCREEN_WIDTH = window.innerWidth,
SCREEN_HEIGHT = window.innerHeight,
SCREEN_WIDTH_HALF = SCREEN_WIDTH  / 2,
SCREEN_HEIGHT_HALF = SCREEN_HEIGHT / 2;

var camera, scene, renderer, controls;
var stats;

var bird, boid;
var birds_xwing, boids_xwing;
var birds_tie, boids_tie;


var bullet, bullet_mesh;
var bullets_xwing, bullet_meshs_xwing;
var bullets_tie, bullet_meshs_tie;

var explosions;

var scene_width_half = 400;
var scene_height_half = 200;
var scene_depth_half = 500;
var diagonal = Math.sqrt(scene_width_half*scene_width_half*4 + 
                        scene_height_half*scene_height_half*4 + 
                        scene_depth_half*scene_depth_half*4);
// var init_vel = 5;
var init_vel = 2;
var collision_i;

// compatability check before starting
if (Detector.webgl) {
    init();
    animate();
} else {
    var warning = Detector.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}

// -------------------- Initializers and Updaters ------------------
// Initialize boids and their corresponding birds (meshs). Xwing is a true/false
// parameter for whether to use Xwing (true) or Tie (false) constructors for the 
// meshs
function init_boids_birds(boids, birds, xwing) {
    for ( var i = 0; i < 100; i ++ ) {
    // for ( var i = 0; i < 1; i ++ ) {
        boid = boids[ i ] = new Boid();
        boid.position.x = Math.random() * scene_width_half;
        boid.position.y = Math.random() * scene_height_half;
        boid.position.z = Math.random() * scene_depth_half;
        boid.velocity.x = Math.random() * init_vel - init_vel/2.;
        boid.velocity.y = Math.random() * init_vel - init_vel/2.;
        boid.velocity.z = Math.random() * init_vel - init_vel/2.;
        boid.setAvoidWalls( true );
        boid.setWorldSize( scene_width_half, scene_height_half, scene_depth_half );
        boid.setMaxSpeed(init_vel);
        if (xwing) {
            bird = birds[ i ] = new THREE.Mesh( new Xwing(), 
                                        new THREE.MeshBasicMaterial( 
                                            { color:Math.random() * 0xff0000, 
                                                side: THREE.DoubleSide } ) );
            boid.type = 'xwing';
            boid.pursue = true;
        } else {
            bird = birds[ i ] = new THREE.Mesh( new Tie(), 
                                        new THREE.MeshBasicMaterial( 
                                            { color:Math.random() * 0xff0000, 
                                                side: THREE.DoubleSide } ) );
            boid.type = 'tie';
            boid.pursue = false;
        }
        bird.phase = Math.floor( Math.random() * 62.83 );
        scene.add( bird );
    }
}

// Update the locations of the boids and corresponding birds (meshs) by calling
// the run function for each of the boids
function update_boids_birds(boids, birds, enemy_boids, enemy_bullets) {
    for ( var i = 0, il = birds.length; i < il; i++ ) {
        boid = boids[ i ];
        boid.run( boids, enemy_boids, enemy_bullets);
        bird = birds[ i ];
        bird.position.copy( boids[ i ].position );
        color = bird.material.color;
        color.r = color.g = color.b = Math.max((camera.position.clone().sub(bird.position)).length() / diagonal, 0.2);

        if (boid.pursue) {
            color.r = 1;
            color.g = 0;
            color.b = 0;
        }
        else {
            color.r = 0;
            color.g = 1;
            color.b = 0;
        }

        //color.r = color.g = color.b = ( 500 - bird.position.z ) / 1000;
        bird.rotation.y = Math.atan2( - boid.velocity.z, boid.velocity.x );
        bird.rotation.z = Math.asin( boid.velocity.y / boid.velocity.length() );
        bird.phase = ( bird.phase + ( Math.max( 0, bird.rotation.z ) + 0.1 )  ) % 62.83;
        // bird.geometry.vertices[ 5 ].y = bird.geometry.vertices[ 4 ].y = Math.sin( bird.phase ) * 5;
    }
}

// Update the locations of the bullets and corresponding bullet_meshs by calling
// the run function for each of the bullets. The run function returns an index
// if there is a collision with a boid, and the boid/mesh is deleted from the world.
// passed in boids and birds should be the opposite of bullets
// i.e. bullets_xwing, bullet_meshs_xwing, boids_tie, birds_tie
function update_bullets(bullets, bullet_meshs, boids, birds) {
    for (var i = 0, il = bullets.length; i < il; i++) {
        bullet = bullets[i];
        bullet_mesh = bullet_meshs[i];
        collision_i = bullet.run(boids);
        if (collision_i !== undefined) {
            var collide_pos = bullet.position;
            // TODO: do something here for an explosion when there is a collision
            scene.remove(birds[collision_i]);
            boids.splice(collision_i, 1);
            birds.splice(collision_i, 1);
            console.log('count: ' + boids.length);

            var explosion = create_explosion(collide_pos);
            explosions.push(explosion);
        }
        if (bullet.remove_this) {
            scene.remove(bullet_mesh);
            bullets.splice(i, 1);
            bullet_meshs.splice(i, 1)
            i--;
            il--;
        }
        else {
            bullet_mesh.position.copy(bullet.position);
        }
    }
}

// create explosion
function create_explosion(init_pos) {
    var numparticles = 75;
    var explosion = new Explosion(init_pos, numparticles);
    var geometry = new THREE.BoxGeometry( 2, 2, 2 );
    var material = new THREE.MeshBasicMaterial( { color: 0xffa500 } );
    particle_mesh = new THREE.Mesh( geometry, material );
    explosion.setMesh(particle_mesh);
    for(var i = 0; i < explosion.meshes.length; i++) {
        scene.add(explosion.meshes[i]);

    }
    return explosion;
}


// Update the location particles by calling the run function for each explosion boid.
// Each explosion boid consists of multiple explosion particles, each of which must be updated.
function update_explosions(explosions) {
    for (var i = 0, il = explosions.length; i < il; i++) {
        var explosion = explosions[i];
        explosion.run();
        if (explosion.remove_this) {
            for(var j = 0; j < explosion.meshes.length; j++) {
                scene.remove(explosion.meshes[j]);
            }
            explosions.splice(i, 1);
            i--; il--;
            continue;
        }
        for(var j = 0; j < explosion.meshes.length; j++) {
            var mesh = explosion.meshes[j];
            var pos = explosion.positions[j];
            mesh.position.copy(pos);
            mesh.scale.x *= 0.95;
            mesh.scale.y *= 0.95;
            mesh.scale.z *= 0.95;
        }
    }
}

// Called in the constructor to add grid boundaries to the current scene.
function add_boundaries(scene) {
    // Bottom and top grid
    var line, d1, d2, step=50, geometry, material, line;
    d1 = scene_depth_half;
    d2 = scene_width_half;
    geometry = new THREE.Geometry();
    for ( var i = - d1; i <= d1; i += step ) {
        geometry.vertices.push( new THREE.Vector3( - d2, 0, i ) );
        geometry.vertices.push( new THREE.Vector3(   d2, 0, i ) );
        
    }
    for ( var i = - d2; i <= d2; i += step ) {
        geometry.vertices.push( new THREE.Vector3( i, 0, - d1 ) );
        geometry.vertices.push( new THREE.Vector3( i, 0,   d1 ) );
    }
    material = new THREE.LineBasicMaterial( { color: 0xaaaaaa, opacity: 0.2, transparent: true } );
    line = new THREE.LineSegments( geometry, material );
    line.position.copy(new THREE.Vector3(0, -scene_height_half, 0));
    scene.add( line );
    line = line.clone();
    line.position.copy(new THREE.Vector3(0, scene_height_half, 0));
    scene.add( line );

    // Back and Front grid
    d1 = scene_height_half;
    d2 = scene_width_half;
    geometry = new THREE.Geometry();
    for ( var i = - d1; i <= d1; i += step ) {
        geometry.vertices.push( new THREE.Vector3( - d2, 0, i ) );
        geometry.vertices.push( new THREE.Vector3(   d2, 0, i ) );
        
    }
    for ( var i = - d2; i <= d2; i += step ) {
        geometry.vertices.push( new THREE.Vector3( i, 0, - d1 ) );
        geometry.vertices.push( new THREE.Vector3( i, 0,   d1 ) );
    }
    material = new THREE.LineBasicMaterial( { color: 0xaaaaaa, opacity: 0.2, transparent: true } );
    line = new THREE.LineSegments( geometry, material );
    
    line.rotateX(Math.PI / 2);
    line.position.copy(new THREE.Vector3(0, 0, -scene_depth_half));
    scene.add( line );
    line = line.clone();
    line.position.copy(new THREE.Vector3(0, 0, scene_depth_half));
    scene.add( line );

    // Back and Front grid
    d1 = scene_depth_half;
    d2 = scene_height_half;
    geometry = new THREE.Geometry();
    for ( var i = - d1; i <= d1; i += step ) {
        geometry.vertices.push( new THREE.Vector3( - d2, 0, i ) );
        geometry.vertices.push( new THREE.Vector3(   d2, 0, i ) );
        
    }
    for ( var i = - d2; i <= d2; i += step ) {
        geometry.vertices.push( new THREE.Vector3( i, 0, - d1 ) );
        geometry.vertices.push( new THREE.Vector3( i, 0,   d1 ) );
    }
    material = new THREE.LineBasicMaterial( { color: 0xaaaaaa, opacity: 0.2, transparent: true } );
    line = new THREE.LineSegments( geometry, material );
    
    line.rotateZ(Math.PI / 2);
    line.position.copy(new THREE.Vector3(-scene_width_half, 0, 0));
    scene.add( line );
    line = line.clone();
    line.position.copy(new THREE.Vector3(scene_width_half, 0, 0));
    scene.add( line );


    // initialize the geometry of the scene
    // var geometry = new THREE.PlaneBufferGeometry( scene_width_half*2, scene_height_half*2);
    // var material = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide, wireframe:true} );
    // var plane = new THREE.Mesh( geometry, material );
    // var line, d1, d2, step=50;
    // plane.position.copy(new THREE.Vector3(0, 0, -scene_depth_half));
    // scene.add( plane );


    // geometry = new THREE.PlaneBufferGeometry( scene_width_half*2, scene_depth_half*2);
    // material = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.DoubleSide, wireframe:true} );
    // plane = new THREE.Mesh( geometry, material );
    // plane.position.copy(new THREE.Vector3(0, -scene_height_half, 0));
    // plane.rotateX( - Math.PI / 2);
    // scene.add( plane );

    // geometry = new THREE.PlaneBufferGeometry( scene_width_half*2, scene_depth_half*2);
    // material = new THREE.MeshBasicMaterial( {color: 0xff0000, side: THREE.DoubleSide, wireframe:true} );
    // plane = new THREE.Mesh( geometry, material );
    // plane.position.copy(new THREE.Vector3(0, scene_height_half, 0));
    // plane.rotateX(Math.PI / 2);
    // scene.add( plane );

    // geometry = new THREE.PlaneBufferGeometry( scene_depth_half*2, scene_height_half*2);
    // material = new THREE.MeshBasicMaterial( {color: 0x00ee00, side: THREE.DoubleSide, wireframe:true} );
    // plane = new THREE.Mesh( geometry, material );
    // plane.position.copy(new THREE.Vector3(-scene_width_half, 0, 0));
    // plane.rotateY( - Math.PI / 2);
    // scene.add( plane );

    // geometry = new THREE.PlaneBufferGeometry( scene_depth_half*2, scene_height_half*2);
    // material = new THREE.MeshBasicMaterial( {color: 0x00ee00, side: THREE.DoubleSide, wireframe:true} );
    // plane = new THREE.Mesh( geometry, material );
    // plane.position.copy(new THREE.Vector3(scene_width_half, 0, 0));
    // plane.rotateY(Math.PI / 2);
    // scene.add( plane );

}


// ------------ Main Initializer and Renderer Loop -----------------
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, 
        window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 450;

    // initialize boids and birds 
    birds_xwing = [];
    boids_xwing = [];
    birds_tie = [];
    boids_tie = [];

    bullets_xwing = [];
    bullet_meshs_xwing = [];
    bullets_tie = [];
    bullet_meshs_tie = [];

    explosions = [];

    init_boids_birds(boids_xwing, birds_xwing, true);
    init_boids_birds(boids_tie, birds_tie, false);

    add_boundaries(scene);

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0x111111 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    document.body.appendChild( renderer.domElement );

    controls = new THREE.OrbitControls( camera, renderer.domElement );

    stats = new Stats();
    document.getElementById( 'container' ).appendChild(stats.dom);

    window.addEventListener('resize', onWindowResize, false );
    window.addEventListener('click', onLeftClick, true); 
    window.addEventListener('contextmenu', onRightClick, false);
}


function render() {
    update_boids_birds(boids_xwing, birds_xwing, boids_tie, bullets_tie);
    update_boids_birds(boids_tie, birds_tie, boids_xwing, bullets_xwing);

    update_bullets(bullets_xwing, bullet_meshs_xwing, boids_tie, birds_tie);
    update_bullets(bullets_tie, bullet_meshs_tie, boids_xwing, birds_xwing);

    update_explosions(explosions);

    renderer.render( scene, camera );
}

function animate() {
    requestAnimationFrame( animate );

    stats.begin();
    render();    
    stats.end();
}


// --------------------- Event Handlers ---------------------------
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function onLeftClick() {
    for (var i = 0, il = boids_xwing.length; i < il; i++) {
        bullet = boids_xwing[i].fireBullet();
        if (bullet !== undefined) {
            bullets_xwing.push(bullet);
            var geometry = new THREE.BoxGeometry( 1, 1, 1 );
            var material = new THREE.MeshBasicMaterial( { color: 0xff4500 } );
            bullet_mesh = new THREE.Mesh( geometry, material );
            bullet_mesh.position.copy(bullet.position);
            scene.add( bullet_mesh );
            bullet_meshs_xwing.push(bullet_mesh)
        }
    }
}

function onRightClick() {
    for (var i = 0, il = boids_tie.length; i < il; i++) {
        bullet = boids_tie[i].fireBullet();
        if (bullet !== undefined) {
            bullets_tie.push(bullet);
            var geometry = new THREE.BoxGeometry( 1, 1, 1 );
            var material = new THREE.MeshBasicMaterial( { color: 0x00ff45 } );
            bullet_mesh = new THREE.Mesh( geometry, material );
            bullet_mesh.position.copy(bullet.position);
            scene.add( bullet_mesh );
            bullet_meshs_tie.push(bullet_mesh)
        }
    }
}
