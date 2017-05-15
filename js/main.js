var SCREEN_WIDTH = window.innerWidth,
SCREEN_HEIGHT = window.innerHeight,
SCREEN_WIDTH_HALF = SCREEN_WIDTH  / 2,
SCREEN_HEIGHT_HALF = SCREEN_HEIGHT / 2;

var camera, scene, renderer, controls;
var stats;

var bird, boid;
var birds_xwing, boids_xwing;
var birds_tie, boids_tie;

var init_count = 20;

var bullet, bullet_mesh;
var bullets_xwing, bullet_meshs_xwing;
var bullets_tie, bullet_meshs_tie;

const bullet_xwing_color = 0xff4500;
const bullet_tie_color = 0x00ff45;
const explosion_color = 0xffa500;

var explosions;

var scene_width_half = 400;
var scene_height_half = 200;
var scene_depth_half = 500;
var diagonal = Math.sqrt(scene_width_half*scene_width_half*4 + 
                        scene_height_half*scene_height_half*4 + 
                        scene_depth_half*scene_depth_half*4);
// var init_vel = 5;
var init_vel = 3;
//var init_vel = 0.2;
var collision_i;

var isShiftDown;

var selectGeo;
var selectMaterial;
var selectSphereMesh;
var selectBoid;

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
    for ( var i = 0; i < init_count; i ++ ) {
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
            // var material = new THREE.MeshBasicMaterial( 
            //                                 { color:Math.random() * 0xff0000, 
            //                                     side: THREE.DoubleSide } );
            var material = new THREE.MeshPhongMaterial( {color: 0xd3d3d3, side: THREE.DOubleSide });
            material.map  = THREE.ImageUtils.loadTexture('../images/xwing.png');
            bird = birds[ i ] = new THREE.Mesh( new Xwing(), material);
            boid.type = 'xwing';
        } else {
            // var material = new THREE.MeshBasicMaterial( 
            //                                 { color:Math.random() * 0xff0000, 
            //                                     side: THREE.DoubleSide } ) ;
            // var material = new THREE.MeshPhongMaterial({ transparent: false, map: THREE.ImageUtils.loadTexture('../images/tie.jpg') });
            // material.side = THREE.DoubleSide;
            // material.color = 0xff0000;

            var material = new THREE.MeshPhongMaterial( {color: 0x808080, side: THREE.DoubleSide });
            material.map  = THREE.ImageUtils.loadTexture('../images/tie2.png');

            bird = birds[ i ] = new THREE.Mesh( new Tie(), material);
            boid.type = 'tie';
            console.log(bird.geometry.faceVertexUvs);
        }
        bird.scale.set(2,2,2);
        bird.phase = Math.floor( Math.random() * 62.83 );
        bird.boid_ref = boid;
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

        // if (boid.pursue) {
        //     color.r = 1;
        //     color.g = 0;
        //     color.b = 0;
        // }
        // else {
        //     color.r = 0;
        //     color.g = 1;
        //     color.b = 0;
        // }

        //color.r = color.g = color.b = ( 500 - bird.position.z ) / 1000;
        bird.rotation.y = Math.atan2( - boid.velocity.z, boid.velocity.x );
        bird.rotation.z = Math.asin( boid.velocity.y / boid.velocity.length() );
        bird.phase = ( bird.phase + ( Math.max( 0, bird.rotation.z ) + 0.1 )  ) % 62.83;
        // bird.geometry.vertices[ 5 ].y = bird.geometry.vertices[ 4 ].y = Math.sin( bird.phase ) * 5;

        if (boid.pursue && !boid.fired) {
            if (boid.type == 'xwing') {
                init_bullet_obj(boid, bullets_xwing, bullet_meshs_xwing, bullet_xwing_color);
            } else {
                init_bullet_obj(boid, bullets_tie, bullet_meshs_tie, bullet_tie_color);
            }
        }
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
            var collide_pos = bullet.position.clone();
            var collide_vel = bullet.velocity.clone();
            // TODO: do something here for an explosion when there is a collision
            boids[collision_i].hp -= 1;
            // boid is killed, update necessary data structures
            if (boids[collision_i].hp == 0) {
                if (boids[collision_i].type == 'xwing') {
                    document.getElementById('xwingcount').innerHTML = "" + (boids.length - 1);
                } else if (boids[collision_i].type == 'tie') {
                    document.getElementById('tiecount').innerHTML = "" + (boids.length - 1);
                }
                scene.remove(birds[collision_i]);
                if (boids[collision_i] == selectBoid) {
                    selectBoid = undefined;
                    scene.remove( selectSphereMesh );
                }
                boids.splice(collision_i, 1);
                birds.splice(collision_i, 1);
                console.log('count: ' + boids.length);
                var explosion = create_explosion(collide_pos, collide_vel);
                explosions.push(explosion);
            }
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
function create_explosion(init_pos, init_vel) {
    var numparticles = 75;
    var explosion = new Explosion(init_pos, numparticles, init_vel);
    var geometry = new THREE.BoxGeometry( 4, 4, 4 );
    var material = new THREE.MeshBasicMaterial( { color: explosion_color } );
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
            mesh.scale.x *= 0.97;
            mesh.scale.y *= 0.97;
            mesh.scale.z *= 0.97;
        }
    }
}

function init_bullet_obj(owner, bullet_arr, bullet_mesh_arr, color) {
    bullet = owner.fireBullet();
    if (bullet !== undefined) {
        bullet_arr.push(bullet);
        var geometry = new THREE.BoxGeometry( 1, 1, 1 );
        var material = new THREE.MeshBasicMaterial( { color: color } );
        bullet_mesh = new THREE.Mesh( geometry, material );
        bullet_mesh.position.copy(bullet.position);
        scene.add( bullet_mesh );
        bullet_mesh_arr.push(bullet_mesh);
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

var raycaster, mouse;
// ------------ Main Initializer and Renderer Loop -----------------
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, 
        window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 450;

    // initialize lights
    // var dirLight = new THREE.DirectionalLight(0xffffff, 1);
    // dirLight.position.set(100, 100, 50);
    // scene.add(dirLight);

    var alight = new THREE.AmbientLight( 0x404040 ); // soft white light
    alight.intensity = 10.0;
    scene.add( alight );

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
    initText();

    window.addEventListener('resize', onWindowResize, false );
    window.addEventListener('click', onLeftClick, true); 
    window.addEventListener('contextmenu', onRightClick, false);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);

    // For selecting units
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    selectGeo = new THREE.SphereGeometry(15);
    selectMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
    selectSphereMesh = new THREE.Mesh( selectGeo, selectMaterial);
}

function initText() {
    var div1 = document.createElement('div');
    div1.style.position = 'absolute';
    //text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
    div1.style.width = 100;
    div1.style.height = 100;
    div1.style.backgroundColor = "transparent";
    div1.style.color = "white";
    div1.innerHTML = "X-Wing: ";
    div1.style.top = 200 + 'px';
    div1.style.left = 200 + 'px';
    div1.id = "xwingdiv";

    var count1 = document.createElement('p');
    count1.innerHTML = "" + init_count;
    count1.id = "xwingcount";
    div1.appendChild(count1);

    var div2 = document.createElement('div');
    div2.style.position = 'absolute';
    //text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
    div2.style.width = 100;
    div2.style.height = 100;
    div2.style.backgroundColor = "transparent";
    div2.style.color = "white";
    div2.innerHTML = "Tie Fighter: ";
    div2.style.top = 200 + 'px';
    div2.style.left = 400 + 'px';
    div2.id = "tiediv";

    var count2 = document.createElement('p');
    count2.innerHTML = "" + init_count;
    count2.id = "tiecount";
    div2.appendChild(count2);

    document.body.appendChild(div1);
    document.body.appendChild(div2)
}


function render() {
    update_boids_birds(boids_xwing, birds_xwing, boids_tie, bullets_tie);
    update_boids_birds(boids_tie, birds_tie, boids_xwing, bullets_xwing);

    update_bullets(bullets_xwing, bullet_meshs_xwing, boids_tie, birds_tie);
    update_bullets(bullets_tie, bullet_meshs_tie, boids_xwing, birds_xwing);

    update_explosions(explosions);

    if (selectBoid !== undefined) {
        selectSphereMesh.position.copy(selectBoid.position);
        console.log('still selected');
    }

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

function onKeyDown( event ) {
    switch( event.keyCode ) {
        case 16: 
            isShiftDown = true; 
            controls.enabled = false;
            break;
    }
}
function onKeyUp( event ) {
    switch ( event.keyCode ) {
        case 16: 
            isShiftDown = false; 
            controls.enabled = true;
            break;
    }
}

function onLeftClick(e) {
    if (isShiftDown) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // update the picking ray with the camera and mouse position
        raycaster.setFromCamera( mouse, camera );

        // calculate objects intersecting the picking ray
        //console.log(scene.children);
        var intersects = raycaster.intersectObjects( birds_xwing );
        console.log(intersects.length);
        var min_dist = Infinity;
        var min_boid = undefined;
        for ( var i = 0; i < intersects.length; i++ ) {
            if (intersects[i].distance < min_dist){
                min_dist = intersects[i].distance;
                min_boid = intersects[i].object.boid_ref;
            }
        }
        if (min_boid !== undefined) {
            selectBoid = min_boid;
            console.log('selected');
            selectSphereMesh.position.copy(selectBoid.position);
            scene.add(selectSphereMesh);
        }
        // var intersects = raycaster.intersectObjects( birds_tie );
        // console.log(intersects.length);
        // for ( var i = 0; i < intersects.length; i++ ) {
        //     console.log(intersects[i]);
        //     intersects[ i ].object.material.color.set( 0xffffff );

        // }
    }
    else {
        for (var i = 0, il = boids_xwing.length; i < il; i++) {
            // bullet = boids_xwing[i].fireBullet();
            // if (bullet !== undefined) {
            //     bullets_xwing.push(bullet);
            //     var geometry = new THREE.BoxGeometry( 1, 1, 1 );
            //     var material = new THREE.MeshBasicMaterial( { color: 0xff4500 } );
            //     bullet_mesh = new THREE.Mesh( geometry, material );
            //     bullet_mesh.position.copy(bullet.position);
            //     scene.add( bullet_mesh );
            //     bullet_meshs_xwing.push(bullet_mesh)
            // }
            init_bullet_obj(boids_xwing[i], bullets_xwing, bullet_meshs_xwing, bullet_xwing_color);
        }
    }
}

function onRightClick() {
    for (var i = 0, il = boids_tie.length; i < il; i++) {
        // bullet = boids_tie[i].fireBullet();
        // if (bullet !== undefined) {
        //     bullets_tie.push(bullet);
        //     var geometry = new THREE.BoxGeometry( 1, 1, 1 );
        //     var material = new THREE.MeshBasicMaterial( { color: 0x00ff45 } );
        //     bullet_mesh = new THREE.Mesh( geometry, material );
        //     bullet_mesh.position.copy(bullet.position);
        //     scene.add( bullet_mesh );
        //     bullet_meshs_tie.push(bullet_mesh)
        // }
        init_bullet_obj(boids_tie[i], bullets_tie, bullet_meshs_tie, bullet_tie_color);
    }
}
