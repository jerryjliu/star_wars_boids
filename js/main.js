var SCREEN_WIDTH = window.innerWidth,
SCREEN_HEIGHT = window.innerHeight,
SCREEN_WIDTH_HALF = SCREEN_WIDTH  / 2,
SCREEN_HEIGHT_HALF = SCREEN_HEIGHT / 2;

var camera, scene, renderer, controls;
var stats;

var bird, boid;
var birds_xwing, boids_xwing;
var birds_tie, boids_tie;

var init_count = 50;

var bullet, bullet_mesh;
var bullets_xwing, bullet_meshs_xwing;
var bullets_tie, bullet_meshs_tie;

const bullet_xwing_color = 0xff4500;
const bullet_tie_color = 0x00ff45;
const explosion_color = 0xffa500;

var explosions;

var scene_width_half = 800 * 2;
var scene_height_half = 400 * 2;
var scene_depth_half = 500 * 2;
var diagonal = Math.sqrt(scene_width_half*scene_width_half*4 + 
                        scene_height_half*scene_height_half*4 + 
                        scene_depth_half*scene_depth_half*4);

var init_vel = 3;
var collision_i;

var isShiftDown;

var selectGeo;
var selectMaterial;
var selectSphereMesh;
var selectBoid;
var firstPersonControls;
var inFirstPerson = false;
var raycaster, mouse;

var worldCamera;
var firstPersonCamera;
var current_camera;

var in_dead_state = false;
var dead_time;

// Star Destroyer
var sd;
var sd_boid;
var turret;
var turret2;
var turret_loc_pos;
var turret_loc_pos2;
var bullets_sd, bullet_meshs_sd;

// game has concluded
var conclude = false;

var last_spawn_time;
var spawn_more_limit = 10000;
var spawn_count = 2;
var max_ties = init_count * 1.2;

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
        boid = boids[ i ] = new Boid();
        //boid.position.x = Math.random() * scene_width_half * 2 - scene_width_half;
        boid.position.y = Math.random() * scene_height_half * 2 - scene_height_half;
        boid.position.z = Math.random() * scene_depth_half*2 - scene_depth_half;
        //boid.velocity.x = Math.random() * init_vel - init_vel/2.;
        boid.velocity.y = Math.random() * init_vel - init_vel/2.;
        boid.velocity.z = Math.random() * init_vel - init_vel/2.;
        if (xwing) {
            boid.position.x = Math.random() * scene_width_half/4 + 3/5*scene_width_half;
            boid.velocity.x = -Math.random() *init_vel;
        } else {
            boid.position.x = -(Math.random() * scene_width_half/4 + 3/5*scene_width_half);
            boid.velocity.x = Math.random() * init_vel;
        }
            
        boid.setAvoidWalls( true );
        boid.setWorldSize( scene_width_half, scene_height_half, scene_depth_half );
        boid.setMaxSpeed(init_vel);
        boid.setAvoidStarDestroyer( true );
        if (xwing) {
            // var material = new THREE.MeshBasicMaterial( 
            //                                 { color:Math.random() * 0xff0000, 
            //                                     side: THREE.DoubleSide } );
            var material = new THREE.MeshPhongMaterial( {color: 0xffffff, side: THREE.DoubleSide });
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

            var material = new THREE.MeshPhongMaterial( {color: 0xffffff, side: THREE.DoubleSide });
            material.map  = THREE.ImageUtils.loadTexture('../images/tie2.png');

            bird = birds[ i ] = new THREE.Mesh( new Tie(), material);
            boid.type = 'tie';
        }
        bird.scale.set(2,2,2);
        bird.phase = Math.floor( Math.random() * 62.83 );
        scene.add( bird );
    }
}

function init_star_destroyer() {
    // var objLoader = new THREE.OBJLoader();
    // objLoader.load('models/star_destroyer.obj', function (obj) {
    //     obj.traverse(function (child) {
    //         if (child instanceof THREE.Mesh) {
    //             var material = new THREE.MeshBasicMaterial( { color: 0x808080, side: THREE.DoubleSide } );
    //             child.material = material;
    //         }
    //     });
    //     scene.add(obj);
    // });
    var material = new THREE.MeshPhongMaterial( { color: 0xffffff, 
                                                    side: THREE.DoubleSide } );
    material.map  = THREE.ImageUtils.loadTexture('../images/tie.jpg');
    sd = new THREE.Mesh( new StarDestroyer(), material)
    // sd.position.set(10, 20, 50);
    // sd.rotation.x = Math.PI/2;
    // sd.rotation.y = Math.atan2( - 10, 10 );
    // sd.rotation.z = Math.asin( 10 / Math.sqrt(300) );
    // sd.geometry.updateGeo();
    scene.add( sd );
    sd_boid = new StarDestroyerBoid();
    sd_boid.setWorldSize( scene_width_half, scene_height_half, scene_depth_half );
    sd_boid.position.set(-(Math.random() * scene_width_half/4 + 3/5*scene_width_half), 0, 0);
    sd_boid.velocity.set(Math.random() + 2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2);
    sd_boid.updateGeoWithMesh(sd);
    // console.log(sd);

    var turretgeo = new THREE.SphereGeometry(10, 32, 32);
    turret = new THREE.Mesh(turretgeo, new THREE.MeshPhongMaterial( {color: 0x696969, side: THREE.DoubleSide }));
    turret.material.map = THREE.ImageUtils.loadTexture('../images/turret2.png');
    turret2 = new THREE.Mesh(turretgeo, new THREE.MeshPhongMaterial( {color: 0x696969, side: THREE.DoubleSide }));
    turret2.material.map = THREE.ImageUtils.loadTexture('../images/turret2.png');
    turret_loc_pos = new THREE.Vector4(0, 25, 0, 1);
    turret_loc_pos2 = new THREE.Vector4(0, -25, 0, 1);
    scene.add(turret);
    scene.add(turret2);
}

// only called for star destroyer
function update_boid_mesh(boid, mesh) {
    boid.run();
    mesh.rotation.y = Math.atan2( - boid.velocity.z, boid.velocity.x );
    mesh.rotation.z = Math.asin( boid.velocity.y / boid.velocity.length() );
    mesh.position.copy(boid.position);
    color = mesh.material.color;
    color.r = color.g = color.b = Math.max((current_camera.position.clone().sub(mesh.position)).length() / diagonal, 0.35);
}

function update_turret(sd_boid, sd, turret, turret_loc_pos) {
    if (sd_boid === undefined)
        return;
    // update turret 
    sd.updateMatrixWorld();
    // turret.position = turret_loc_pos.clone().applyMatrix4(sd.matrixWorld);
    var tmp4 = turret_loc_pos.clone().applyMatrix4(sd.matrixWorld);
    turret.position.x = tmp4.x;
    turret.position.y = tmp4.y;
    turret.position.z = tmp4.z;

    turret.rotation = sd.rotation;

    // fire in average direction of xwings
    // var avgPosition = new THREE.Vector3();
    // for(var i = 0; i < boids_xwing.length; i++) {
    //     avgPosition.add(boids_xwing[i].position);
    // }
    var randIndex = Math.floor(Math.random() * boids_xwing.length);
    if (boids_xwing.length > 0) {
        var randPosition = boids_xwing[randIndex].position.clone();
        randPosition.divideScalar(boids_xwing.length);
        var fireVelocity = randPosition.clone().sub(turret.position).normalize();
        // make sure it doesn't intersect with the ship itself
        var raycaster = new THREE.Raycaster(turret.position, fireVelocity);
        var intersections = raycaster.intersectObject(sd, false);
        if (intersections != null && intersections.length > 0) {
        } else {
            // console.log("HELLOOOOOOO");
            // console.log(sd_boid);
            init_bullet_obj_sd(sd_boid, turret, fireVelocity, bullets_sd, bullet_meshs_sd, bullet_tie_color);
        }
    }
}

// Update the locations of the boids and corresponding birds (meshs) by calling
// the run function for each of the boids
function update_boids_birds(boids, birds, enemy_boids, enemy_bullets) {
    for ( var i = 0, il = birds.length; i < il; i++ ) {
        boid = boids[ i ];
        if (boid == selectBoid && inFirstPerson) {
            boid.forcedMove(firstPersonControls.getDirection(), sd_boid);
        }
        else
            boid.run( boids, enemy_boids, enemy_bullets, sd_boid);

        if (boid.collided) {
            var collide_vel = boid.velocity.clone().multiplyScalar(-1);
            var collide_pos = boid.position.clone().sub(collide_vel);
            removeBoidBird(i, boids, birds);
            console.log('count: ' + boids.length);
            var explosion = create_explosion(collide_pos, collide_vel);
            explosions.push(explosion);
            i--;
            il--;
            continue;
        }

        bird = birds[ i ];
        bird.position.copy( boids[ i ].position );
        color = bird.material.color;
        color.r = color.g = color.b = Math.max((current_camera.position.clone().sub(bird.position)).length() / diagonal, 0.2);

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
        // bird.phase = ( bird.phase + ( Math.max( 0, bird.rotation.z ) + 0.1 )  ) % 62.83;
        // bird.geometry.vertices[ 5 ].y = bird.geometry.vertices[ 4 ].y = Math.sin( bird.phase ) * 5;

        if (boid.pursue && !boid.fired && boid != selectBoid) {
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
        collision_i = bullet.run(boids, sd_boid);
        if (collision_i !== undefined) {
            if (collision_i == sd_boid) {
                sd_boid.hp -= 1;
                document.getElementById('StarDestroyerHP').innerHTML = "" + (sd_boid.hp);
                if (sd_boid.hp <= 0) {
                    // TODO: fill in StarDestroyer explosion
                    scene.remove(sd);
                    sd_boid = undefined;
                    sd = undefined;
                    scene.remove(turret);
                    scene.remove(turret2);
                    console.log('successful removal');
                }
            }
            else {
                boids[collision_i].hp -= 1;
                bullet.getOwner().enemiesKilled += 1;
                console.log(bullet.getOwner().enemiesKilled);
                // boid is killed, update necessary data structures
                if (boids[collision_i].hp == 0) {
                    var collide_pos = bullet.position.clone();
                    var collide_vel = bullet.velocity.clone();
                    if (boids[collision_i].type == 'xwing') {
                        document.getElementById('xwingcount').innerHTML = "" + (boids.length - 1);
                    } else if (boids[collision_i].type == 'tie') {
                        document.getElementById('tiecount').innerHTML = "" + (boids.length - 1);
                    }
                    removeBoidBird(collision_i, boids, birds);
                    console.log('count: ' + boids.length);
                    var explosion = create_explosion(collide_pos, collide_vel);
                    explosions.push(explosion);
                }              
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

function init_bullet_obj(owner, bullet_arr, bullet_mesh_arr, color, force_fire=false) {
    if (force_fire) {
        bullet = owner.forceFireBullet();
    }
    else {
        bullet = owner.fireBullet();
    }
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

function init_bullet_obj_sd(sd_boid, turret, fireVelocity, bullet_arr, bullet_mesh_arr, color) {
    if (sd_boid === undefined) {
        return;
    }
    bullet = sd_boid.forceFireBullet(turret, fireVelocity);
    if (bullet !== undefined) {
        bullet_arr.push(bullet);
        var geometry = new THREE.BoxGeometry( 4, 4, 4 );
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
}

function removeBoidBird(i, boids, birds) {
    scene.remove(birds[i]);
    if (boids[i] == selectBoid) {
        if (inFirstPerson) {
            enter_dead_state();
            //exitFirstPerson();
        } else {
            selectBoid = undefined;
            scene.remove( selectSphereMesh );
        }
    }
    boids.splice(i, 1);
    birds.splice(i, 1);
}

function enter_dead_state() {
    if (dead_time === undefined) {
        dead_time = Date.now();
    }
    in_dead_state = true;
    var waitTime = Date.now() - dead_time;
    var waitLimit = 500;
    if (waitTime > waitLimit) {
        dead_time = undefined;
        in_dead_state = false;
        exitFirstPerson();
    }
}


function spawn_more_ties(count) {
    if (sd_boid === undefined) {
        return;
    }
    var local_spawn_coords = new THREE.Vector4(-200, -60, 0, 1);
    local_spawn_coords.applyMatrix4(sd.matrixWorld);
    var world_spawn_coords = new THREE.Vector3(local_spawn_coords.x, 
                                        local_spawn_coords.y, 
                                        local_spawn_coords.z);
    var direction = sd_boid.velocity.clone().normalize().multiplyScalar(-8);
    for (var i = 0; i < count; i++) {
        var boid = new Boid();

        boid.position.x = (Math.random() + 0.2) * direction.x + world_spawn_coords.x;
        boid.position.y = (Math.random() + 0.2) * direction.y + world_spawn_coords.y;
        boid.position.z = (Math.random() + 0.2) * direction.z + world_spawn_coords.z;
        boid.velocity.x = (Math.random() + 0.2) * direction.x;
        boid.velocity.y = (Math.random() + 0.2) * direction.y;
        boid.velocity.z = (Math.random() + 0.2) * direction.z;
            
        boid.setAvoidWalls( true );
        boid.setWorldSize( scene_width_half, scene_height_half, scene_depth_half );
        boid.setMaxSpeed(init_vel);
        boid.setAvoidStarDestroyer( true );

        var material = new THREE.MeshPhongMaterial( {color: 0x808080, side: THREE.DoubleSide });
        material.map  = THREE.ImageUtils.loadTexture('../images/tie2.png');
        var bird = new THREE.Mesh( new Tie(), material);
        boid.type = 'tie';
        bird.scale.set(2,2,2);
        bird.phase = Math.floor( Math.random() * 62.83 );
        scene.add( bird );
        birds_tie.push(bird);
        boids_tie.push(boid);
        document.getElementById('tiecount').innerHTML = "" + (boids_tie.length - 1);
    }
}

// ------------ Main Initializer and Renderer Loop -----------------
function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, 
        window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 450;
    
    firstPersonCamera = camera.clone();
    // copyCamera(camera, firstPersonCamera);
    firstPersonCamera.position.z = 50;

    worldCamera = camera.clone();
    // copyCamera(camera, worldCamera);
    worldCamera.position.copy(new THREE.Vector3(0, 0, 450));

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

    bullets_sd = [];
    bullet_meshs_sd = [];

    explosions = [];

    init_boids_birds(boids_xwing, birds_xwing, true);
    init_boids_birds(boids_tie, birds_tie, false);
    init_star_destroyer();

    add_boundaries(scene);

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0x111111 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    document.body.appendChild( renderer.domElement );

    controls = new THREE.OrbitControls( worldCamera, renderer.domElement );

    stats = new Stats();
    document.getElementById( 'container' ).appendChild(stats.dom);
    initSplashScreen();
    initText();

    window.addEventListener('resize', onWindowResize, false );
    window.addEventListener('click', onLeftClick, true); 
    window.addEventListener('contextmenu', onRightClick, false);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);

    document.getElementById("beginButton").addEventListener("click", function() {
        console.log('hi0');
        initializeGame();
    });

    // For selecting units
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    selectGeo = new THREE.SphereGeometry(10);
    selectMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
    selectSphereMesh = new THREE.Mesh( selectGeo, selectMaterial);
    firstPersonControls = new THREE.PointerLockControls( firstPersonCamera );
    firstPersonControls.enabled = false;
    scene.add( firstPersonControls.getObject() );
    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

    last_spawn_time = Date.now();
}

function initSplashScreen() {
    var div1 = document.createElement('div');
    div1.style.position = 'absolute';
    // div1.style.width = document.body.clientWidth/2 + 'px';
    // div1.style.height = document.body.clientHeight/2 + 'px';
    div1.style.top = (window.innerHeight/20) + 'px';
    div1.style.left = (window.innerWidth/20) + 'px';
    // div1.innerHTML = "Star Wars: An Old Beginning <br/>";
    div1.id = "titlediv";
    div1.style.backgroundColor = "transparent";
    div1.style.color = "white";
    div1.opacity = 0.5;

    var titletext = document.createElement('p');
    titletext.id = 'titletext';
    titletext.innerHTML = 'Star Wars: Attack of the Boids';
    div1.appendChild(titletext);
    
    var btn = document.createElement('button');
    btn.innerHTML = 'Begin';
    btn.id = "beginButton";
    div1.appendChild(btn);

    document.body.appendChild(div1);
}

function initializeGame() {
    for(var i = 0; i < boids_xwing.length; i++) {
        boids_xwing[i].active = true;
    }
    for(var i = 0; i < boids_tie.length; i++) {
        boids_tie[i].active = true;
    }
    if (sd_boid !== undefined)
        sd_boid.active = true; 

    console.log("hello");
    document.getElementById("xwingdiv").style.visibility = "visible";
    document.getElementById("tiediv").style.visibility = "visible";
    document.getElementById("titlediv").style.visibility = "hidden";
}

function concludeGame(winner) {
    conclude = true;
    document.getElementById("xwingdiv").style.visibility = "hidden";
    document.getElementById("tiediv").style.visibility = "hidden";
    document.getElementById("titlediv").style.visibility = "visible";
    var winText = "";
    if (winner == 'xwing') {
        winText = "The Rebels have won and defeated the Empire!";
    } else if (winner == 'tie') {
        winText = "The Empire has won and eliminated all opposition";
    }
    document.getElementById("titletext").innerHTML = winText;
    document.getElementById("beginButton").innerHTML = "Restart";

    document.getElementById("beginButton").addEventListener("click", function() {
        // boids_xwing = [];
        // boids_tie = [];
        // bullets_xwing = [];
        // bullets_tie = [];
        // explosions = [];
        // for(var i = 0; i < birds_xwing.length; i++) {
        //     scene.remove(birds_xwing[i]);
        // }
        // for(var i = 0; i < birds_tie.length; i++) {
        //     scene.remove(birds_tie[i]);
        // }
        // for(var i = 0; i < bullet_meshs_xwing.length; i++) {
        //     scene.remove(bullet_meshs_xwing[i]);
        // }
        // for(var i = 0; i < bullet_meshs_tie.length; i++) {
        //     scene.remove(bullet_meshs_tie[i]);
        // }
        // scene.remove(sd);
        // sd = null;
        // sd_boid = null;
        // document.getElementById("tiecount").innerHTML = init_count + "";
        // document.getElementById("xwingcount").innerHTML = init_count + "";
        // init_boids_birds(boids_xwing, birds_xwing, true);
        // init_boids_birds(boids_tie, birds_tie, false);
        // init_star_destroyer();
        // for(var i = 0; i < boids_xwing.length; i++) {
        //     boids_xwing[i].active = true;
        // }
        // for(var i = 0; i < boids_tie.length; i++) {
        //     boids_tie[i].active = true;
        // }
        // conclude = false;

        location.reload();
    });

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
    div1.style.visibility = "hidden";

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
    div2.style.visibility = "hidden";

    var count2 = document.createElement('p');
    count2.innerHTML = "" + init_count;
    count2.id = "tiecount";
    div2.appendChild(count2);

    var div3 = document.createElement('div');
    div3.style.position = 'absolute';
    //text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
    div3.style.width = 100;
    div3.style.height = 100;
    div3.style.backgroundColor = "transparent";
    div3.style.color = "white";
    div3.innerHTML = "Enemies Killed: ";
    div3.style.top = 200 + 'px';
    div3.style.left = 600 + 'px';
    div3.id = "killedDiv";
    div3.style.visibility = "hidden";

    var count3 = document.createElement('p');
    count3.innerHTML = "" + init_count;
    count3.id = "killedcount";
    div3.appendChild(count3);

    var div4 = document.createElement('div');
    div4.style.position = 'absolute';
    //text2.style.zIndex = 1;    // if you still don't see the label, try uncommenting this
    div4.style.width = 100;
    div4.style.height = 100;
    div4.style.backgroundColor = "transparent";
    div4.style.color = "white";
    div4.innerHTML = "Star Destroyer HP: ";
    div4.style.top = 400 + 'px';
    div4.style.left = 200 + 'px';
    div4.id = "starDestroyerHPDiv";
    div4.style.visibility = "hidden";
    var count4 = document.createElement('p');
    count4.innerHTML = "" + sd_boid.hp;
    count4.id = "StarDestroyerHP";
    div4.appendChild(count4);

    document.body.appendChild(div1);
    document.body.appendChild(div2);
    document.body.appendChild(div3);
    document.body.appendChild(div4);
}


function render() {
    var now = Date.now();
    if (sd_boid !== undefined && 
        now - last_spawn_time > spawn_more_limit && 
        boids_tie.length < max_ties && sd_boid.active) {
        last_spawn_time = now;
        spawn_more_ties(spawn_count);
    }

    if (inFirstPerson) {
        current_camera = firstPersonCamera;
    } else {
        current_camera = worldCamera;
    }

    if (in_dead_state) {
        enter_dead_state();
    }

    if (!conclude) {
        // First update star destroyer, so geometry is consistent
        if (sd_boid !== undefined) {
            update_boid_mesh(sd_boid, sd);
            update_turret(sd_boid, sd, turret, turret_loc_pos);
            update_turret(sd_boid, sd, turret2, turret_loc_pos2);
            sd_boid.updateGeoWithMesh(sd);
        }
        
        if (boids_xwing.length == 0) {
            concludeGame('tie');
        } else if (boids_tie.length == 0) {
            concludeGame('xwing');
        }

        update_boids_birds(boids_xwing, birds_xwing, boids_tie, bullets_tie);
        update_boids_birds(boids_tie, birds_tie, boids_xwing, bullets_xwing);

        update_bullets(bullets_xwing, bullet_meshs_xwing, boids_tie, birds_tie);
        update_bullets(bullets_tie, bullet_meshs_tie, boids_xwing, birds_xwing);
        update_bullets(bullets_sd, bullet_meshs_sd, boids_xwing, birds_xwing);

        update_explosions(explosions);
        if (selectBoid != undefined) {
            document.getElementById("killedDiv").style.visibility = "visible";
            document.getElementById("killedcount").innerHTML = selectBoid.enemiesKilled;
        } else {
            document.getElementById("killedDiv").style.visibility = "hidden";
        }
        if (sd_boid === undefined || sd_boid.active){
            document.getElementById("starDestroyerHPDiv").style.visibility = "visible";
        }

        if (selectBoid !== undefined) {
            if (inFirstPerson && !in_dead_state) {
                firstPersonControls.getObject().position.copy(selectBoid.position);
            }
            else {
                selectSphereMesh.position.copy(selectBoid.position);
            }
        }
        renderer.render( scene, current_camera );
    }
    
}

function animate() {
    requestAnimationFrame( animate );

    stats.begin();
    render();    
    stats.end();
}

function exitFirstPerson() {
    selectBoid = undefined;
    inFirstPerson = false;
    firstPersonControls.enabled = false;
    controls.enabled = true;   
}

// --------------------- Event Handlers ---------------------------
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    firstPersonCamera.aspect = window.innerWidth / window.innerHeight;
    firstPersonCamera.updateProjectionMatrix();
    worldCamera.aspect = window.innerWidth / window.innerHeight;
    worldCamera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

    SCREEN_WIDTH = window.innerWidth,
    SCREEN_HEIGHT = window.innerHeight,
    SCREEN_WIDTH_HALF = SCREEN_WIDTH  / 2,
    SCREEN_HEIGHT_HALF = SCREEN_HEIGHT / 2;
}

function copyCamera(src, dst) {
    console.log('src', src);
    console.log('dst', dst);
    dst.matrix.copy(src.matrix.clone());
    dst.matrixWorld.copy(src.matrixWorld.clone());
    dst.matrixWorldInverse.copy(src.matrixWorldInverse.clone());
    dst.position.copy(src.position.clone());
    dst.projectionMatrix.copy(src.projectionMatrix.clone());
    dst.quaternion.copy(src.quaternion.clone());
    dst.rotation.copy(src.rotation.clone());
    dst.scale.copy(src.scale.clone());
    dst.up.copy(src.up.clone());
    // dst.parent.copy(src.parent);
    // dst.userData = src.userData.clone();
    dst.modelViewMatrix.copy(src.modelViewMatrix.clone());
    dst.normalMatrix.copy(src.normalMatrix.clone());
    dst.updateProjectionMatrix();
    console.log('after copy src', src);
    console.log('after copy dst', dst);
}

function onKeyDown( event ) {
    switch( event.keyCode ) {
        case 16: // shift -- attempt to select a ship
            isShiftDown = true; 
            controls.enabled = false;
            selectBoid = boids_xwing[0];
            break;
        case 82: // r -- select a random boid
            if (!inFirstPerson) {
                selectBoid = boids_xwing[Math.floor(Math.random() * boids_xwing.length)];
                scene.add(selectSphereMesh);
            }
            break;
        case 87: // w -- enter first person mode with the selected boid
            if (selectBoid !== undefined) {
                console.log('entering first person');
                controls.enabled = false
                firstPersonControls.enabled = true;
                firstPersonControls.getObject().position.copy(selectBoid.position);
                inFirstPerson = true;
                scene.remove(selectSphereMesh);
            }
            else {
                console.log('cannot enter first person without a boid selected');
            }
            break;
        case 81: // q -- exit first person mode if you're in it
            if (inFirstPerson) {
                exitFirstPerson();
            }
            break;
        case 88: // x -- fire all xwings
            for (var i = 0, il = boids_xwing.length; i < il; i++) {
                init_bullet_obj(boids_xwing[i], 
                                bullets_xwing, 
                                bullet_meshs_xwing, 
                                bullet_xwing_color);
            }
            break;
        case 84: // t -- fire all ties
            for (var i = 0, il = boids_tie.length; i < il; i++) {
                init_bullet_obj(boids_tie[i], 
                                bullets_tie, 
                                bullet_meshs_tie, 
                                bullet_tie_color);
            }
            break;
        case 32: // " " -- fire first person ship
            if (inFirstPerson)
                init_bullet_obj(selectBoid, 
                                bullets_xwing, 
                                bullet_meshs_xwing, 
                                bullet_xwing_color, true);
            break;
    }
}

function onKeyUp(e) {
    // 16 is key code for shift key
    if (e.keyCode == 16) {
        // renable rotation
        controls.enabled = true;
    }
}

function onLeftClick(e) {
    if (e.shiftKey && !inFirstPerson) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // update the picking ray with the camera and mouse position
        raycaster.setFromCamera( mouse, current_camera );

        // calculate objects intersecting the picking ray
        var intersects = raycaster.intersectObjects( birds_xwing );
        console.log(intersects.length);
        for ( var i = 0; i < intersects.length; i++ ) {
            if (intersects[i].distance < min_dist){
                min_dist = intersects[i].distance;
                min_boid = intersects[i].object.boid_ref;
            }
        }
        if (min_boid !== undefined) {
            selectBoid = min_boid;
            selectSphereMesh.position.copy(selectBoid.position);
            scene.add(selectSphereMesh);
        }
    }
}

function onRightClick() {
}
