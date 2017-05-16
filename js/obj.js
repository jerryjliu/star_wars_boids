var Boid = function() {
    var vector = new THREE.Vector3(),
    _acceleration, _width = 500, _height = 500, _depth = 200, _goal, _neighborhoodRadius = 100,
    _maxSpeed = 4, _maxSteerForce = 0.1, _avoidWalls = false;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    _acceleration = new THREE.Vector3();
    this.type = null;
    this.fired = false;

    this.active = false;
    this.pursue = false;
    this.hp = 1;
    this.enemiesKilled = 0;

    this.beginBehaviorTime = Math.floor(Date.now() / 1000);
    this.curBehaviorTime = this.beginBehaviorTime;
    this.behaviorLength = (Math.random() * 10) + 4;

    this.collided = false;
    var _lastFireTime = 0;
    var _time_between_fires = 200; // in ms

    var bullet;

    var _avoid_sd_boid = false;
    var _triangle;
    var _plane = new THREE.Plane();
    var _distance;
    var avoid_sd_scaling = 10;
    var _normal = new THREE.Vector3();

    var radians, cos_radians, sin_radians, max_turn_angle = 120;
    radians = max_turn_angle*Math.PI/180;
    cos_radians = Math.cos(radians);
    sin_radians = Math.sin(radians);

    var _collision_radius = 3;

    this.fireBullet = function () {
        if (!this.fired) {
            bullet = new Bullet(this.position.clone(), this.velocity.clone(), this);
            bullet.setWorldSize(_width, _height, _depth);
            this.fired = true;
            return bullet;
        }
        else {
            return undefined;
        }
    };

    this.forceFireBullet = function () {
        var now = Date.now()
        if (now - _lastFireTime > _time_between_fires) {
            bullet = new Bullet(this.position.clone(), this.velocity.clone(), this);
            bullet.setWorldSize(_width, _height, _depth);
            this.fired = true;
            _lastFireTime = now;
            return bullet;
        }
        else {
            return undefined;
        }
    };

    this.setAvoidStarDestroyer = function(value) {
        _avoid_sd_boid = value;
    };

    this.setGoal = function ( target ) {
        _goal = target;
    };
    this.setAvoidWalls = function ( value ) {
        _avoidWalls = value;
    };
    this.setWorldSize = function ( width, height, depth ) {
        _width = width;
        _height = height;
        _depth = depth;
    };
    this.setMaxSpeed = function ( maxSpeed ) {
        _maxSpeed = maxSpeed;
    };
    this.avoidStarDestroyer = function (sd_boid) {
        _distance = sd_boid.bounding_box.distanceToPoint(this.position);
        // console.log(_distance);
        if (_distance > sd_boid.effective_distance)
            return;
        vector.set(0, 0, 0);
        var min_dist = Infinity;
        var tmp = new THREE.Vector3();
        var outside = false;
        for (var i = 0, il = sd_boid.triangles.length; i < il; i++) {
            sd_boid.triangles[i].plane(_plane);
            _distance = _plane.normal.dot(this.position) + _plane.constant;
            if (_distance > 0) {
                // check their direction
                var _dot = _plane.normal.dot(this.velocity);
                if (_dot < 0) {
                    vector.add(_normal.copy(_plane.normal).divideScalar(_distance*_distance).multiplyScalar(-_dot));
                    if (_distance < min_dist) {
                        min_dist = _distance;
                    }
                }
                outside = true;
            }
        }
        if (!outside) {
            console.log('Collision with SD!');
            this.collided = true;
            // alert('asd');
        }
        if (!this.collided && vector.length() > 0 && min_dist !== Infinity) {
            tmp.copy(this.velocity).reflect(vector.normalize());
            tmp.multiplyScalar(avoid_sd_scaling/min_dist);
            _acceleration.add(tmp);
        }
    };
    this.run = function ( boids, enemy_boids, enemy_bullets, sd_boid = undefined) {
        if ( _avoidWalls ) {
            vector.set( - _width, this.position.y, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( 5 );
            _acceleration.add( vector );
            vector.set( _width, this.position.y, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( 5 );
            _acceleration.add( vector );
            vector.set( this.position.x, - _height, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( 5 );
            _acceleration.add( vector );
            vector.set( this.position.x, _height, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( 5 );
            _acceleration.add( vector );
            vector.set( this.position.x, this.position.y, - _depth );
            vector = this.avoid( vector );
            vector.multiplyScalar( 5 );
            _acceleration.add( vector );
            vector.set( this.position.x, this.position.y, _depth );
            vector = this.avoid( vector );
            vector.multiplyScalar( 5 );
            _acceleration.add( vector );
        }/* else {
            this.checkBounds();
        }
        */
        if ( Math.random() > 0.5 ) {
            this.flock( boids, enemy_boids, enemy_bullets);
        }

        if (_avoid_sd_boid && sd_boid !== undefined) {
            this.avoidStarDestroyer(sd_boid);
        }

        this.move();
        this.checkBounds();

    };
    this.flock = function ( boids, enemy_boids, enemy_bullets ) {
        if ( _goal ) {
            _acceleration.add( this.reach( _goal, 0.005 ) );
        }
        // _acceleration.add( this.alignment( boids ) );
        _acceleration.add( this.cohesion( boids ) );
        _acceleration.add( this.separation( boids ) );
        _acceleration.add( this.avoidBoids( enemy_boids ) );

        // update pursuit behavior
        if (this.active) {
            this.curBehaviorTime = Math.floor(Date.now() / 1000);
            if (this.curBehaviorTime - this.beginBehaviorTime > this.behaviorLength) {
                if (this.pursue) {
                    this.behaviorLength = (Math.random() * 10) + 4;
                    this.pursue = false;
                }
                else {
                    this.behaviorLength = (Math.random() * 10) + 4;
                    this.pursue = true;
                }
                this.beginBehaviorTime = this.curBehaviorTime;
                
            }
            if (this.pursue) _acceleration.add(this.pursueEnemy(enemy_boids));
            else _acceleration.add(this.fleeEnemy(enemy_boids));
        }
    };
    this.forcedMove = function (velocity, sd_boid = undefined) {
        this.velocity.copy( velocity ).multiplyScalar(_maxSpeed);
        var l = this.velocity.length();
        if ( l > _maxSpeed ) {
            this.velocity.divideScalar( l / _maxSpeed );
        }
        this.position.add( this.velocity );
        this.checkBounds();
        if (sd_boid !== undefined) {
            this.avoidStarDestroyer(sd_boid);
        }
        _acceleration.set( 0, 0, 0 );
        
    }

    // Rodrigues rotation formula
    // k is unit vector for axis of rotation
    // v is vector to be rotate
    var rotate = function(v, k) {
        var vnew = v.clone().multiplyScalar(cos_radians);
        vnew.add(v.cross(k).multiplyScalar(sin_radians));
        //vnew.add(k.clone().multiplyScalar(k.dot(v) * 1 - cos_radians));
        return vnew;
    }

    this.move = function () {
        var old_velocity = this.velocity.clone().normalize();
        this.velocity.add( _acceleration );
        var l = this.velocity.length();
        this.velocity.normalize();
        var dot = this.velocity.dot(old_velocity);

        if (dot == -1) {
            this.velocity.x = Math.random() - 0.5;
            this.velocity.y = Math.random() - 0.5;
            this.velocity.z = Math.random() - 0.5;
            this.velocity.normalize();
            dot = this.velocity.dot(old_velocity);
        } 
        if (dot < cos_radians) {
            var axis = old_velocity.cross(this.velocity);
            this.velocity = rotate(old_velocity, axis);
        }
        // else {
        //     _acceleration.set( 0, 0, 0 );
        // }
        _acceleration.set( 0, 0, 0 );
        this.velocity.multiplyScalar(l);
        if ( l > _maxSpeed ) {
            this.velocity.divideScalar( l / _maxSpeed );
        }
        this.position.add( this.velocity );
        // // old version
        // this.velocity.add( _acceleration );
        // // this.velocity.add(_acceleration.clone().divideScalar(10));
        // var l = this.velocity.length();
        // if ( l > _maxSpeed ) {
        //     this.velocity.divideScalar( l / _maxSpeed );
        // }
        // this.position.add( this.velocity );
        // _acceleration.set( 0, 0, 0 );
    };
    this.checkBounds = function () {
        if ( this.position.x >   _width || this.position.x < - _width || 
            this.position.y >   _height || this.position.y < - _height ||
            this.position.z >  _depth || this.position.z < - _depth ) 
            this.collided = true;

        // if ( this.position.x >   _width ) this.position.x = - _width;
        // if ( this.position.x < - _width ) this.position.x =   _width;
        // if ( this.position.y >   _height ) this.position.y = - _height;
        // if ( this.position.y < - _height ) this.position.y =  _height;
        // if ( this.position.z >  _depth ) this.position.z = - _depth;
        // if ( this.position.z < - _depth ) this.position.z =  _depth;
    };
    //
    this.avoid = function ( target ) {
        var steer = new THREE.Vector3();
        steer.copy( this.position );
        steer.sub( target );
        steer.multiplyScalar( 1 / this.position.distanceToSquared( target ) );
        return steer;
    };

    this.avoidBoids = function( boids ) {
        var boid = new THREE.Vector3();
        var steer = new THREE.Vector3();
        var avoidRadius = 20;
        for ( var i = 0, il = boids.length; i < il; i++ ) {
            boid = boids[ i ];
            if (boid.type == this.type) continue;
            // console.log(boid.type + " " + this.type);
            var bsteer = new THREE.Vector3();
            // bsteer.copy(this.position);
            // bsteer.sub(boid.position);
            // bsteer.multiplyScalar(1 / this.position.distanceToSquared(boid.position));
            var distVec = boid.position.clone().sub(this.position);
            if (distVec.length() < _collision_radius) {
                this.collided = true;
                boid.collided = true;
                console.log('boid collision');
                return steer;
            }
            var normVel = this.velocity.clone().normalize();
            var distDotVel = distVec.dot(normVel);
            if (distDotVel <= 0) continue;
            var dsquared = distVec.dot(distVec) - (distDotVel * distDotVel);
            if (dsquared > (avoidRadius * avoidRadius)) continue;
            // found that current velocity intersects radius, so avoid
            var scaledVVec = normVel.clone().multiplyScalar(distDotVel);
            var steerVec = scaledVVec.clone().sub(distVec);
            steerVec.normalize();
            bsteer.add(steerVec);
            bsteer.multiplyScalar(1 / this.position.distanceToSquared(boid.position));
            
            steer.add(bsteer);
        }
        steer.multiplyScalar(100);
        // steer.divideScalar(10);
        return steer;
    }

    // pursue the closest boid
    this.pursueEnemy = function (enemy_boids) {
        var boid = new THREE.Vector3();
        var minDist = Number.MAX_VALUE;
        var minBoid = null;
        for ( var i = 0, il = enemy_boids.length; i < il; i++ ) {
            boid = enemy_boids[i];
            var dist = this.position.distanceTo(boid.position);
            if (dist < minDist) {
                minDist = dist;
                minBoid = boid;
            }
        }
        // weight pursuit force proportional to distance (so slows down as gets closer)
        var pursuit = new THREE.Vector3();
        if (minBoid != null) {
            pursuit.add(minBoid.position);
            pursuit.sub(this.position);
            // console.log(pursuit);
            // pursuit.divideScalar(Math.sqrt(this.position.distanceTo(minBoid.position)));

            pursuit.normalize();
            pursuit.divideScalar(2);
            if (this.position.clone().distanceTo(minBoid.position) < 50) {
                // pursuit.divideScalar(this.position.distanceTo(minBoid.position));
                pursuit.multiplyScalar(1 / 50).multiplyScalar(this.position.clone().distanceTo(minBoid.position));
            }
        }
        
        // pursuit.divideScalar(1);
        return pursuit;
    }

    // flee the enemy boids (similar to avoid function)
    this.fleeEnemy = function (enemy_boids) {
        var boid = new THREE.Vector3();
        var flee = new THREE.Vector3();
        for ( var i = 0, il = enemy_boids.length; i < il; i++ ) {
            boid = enemy_boids[i];
            var bflee = new THREE.Vector3();
            if (this.position.distanceTo(boid.position) > _neighborhoodRadius) {
                continue;
            }
            bflee.add(this.position);
            bflee.sub(boid.position);
            bflee.normalize();
            bflee.divideScalar(this.position.distanceTo(boid.position));
            flee.add(bflee);
        }
        // flee.divideScalar(10);
        // console.log(flee);
        flee.multiplyScalar(10);
        return flee;
    }

    this.repulse = function ( target ) {
        var distance = this.position.distanceTo( target );
        if ( distance < 150 ) {
            var steer = new THREE.Vector3();
            steer.subVectors( this.position, target );
            steer.multiplyScalar( 0.5 / distance );
            _acceleration.add( steer );
        }
    };
    this.reach = function ( target, amount ) {
        var steer = new THREE.Vector3();
        steer.subVectors( target, this.position );
        steer.multiplyScalar( amount );
        return steer;
    };
    this.alignment = function ( boids ) {
        var boid, velSum = new THREE.Vector3(),
        count = 0;
        for ( var i = 0, il = boids.length; i < il; i++ ) {
            if ( Math.random() > 0.6 ) continue;
            boid = boids[ i ];
            distance = boid.position.distanceTo( this.position );
            if ( distance > 0 && distance <= _neighborhoodRadius ) {
                velSum.add( boid.velocity );
                count++;
            }
        }
        if ( count > 0 ) {
            velSum.divideScalar( count );
            var l = velSum.length();
            if ( l > _maxSteerForce ) {
                velSum.divideScalar( l / _maxSteerForce );
            }
        }
        return velSum;
    };
    this.cohesion = function ( boids ) {
        var boid, distance,
        posSum = new THREE.Vector3(),
        steer = new THREE.Vector3(),
        count = 0;
        for ( var i = 0, il = boids.length; i < il; i ++ ) {
            if ( Math.random() > 0.6 ) continue;
            boid = boids[ i ];
            distance = boid.position.distanceTo( this.position );
            if ( distance > 0 && distance <= _neighborhoodRadius ) {
                posSum.add( boid.position );
                count++;
            }
        }
        if ( count > 0 ) {
            posSum.divideScalar( count );
        }
        steer.subVectors( posSum, this.position );
        var l = steer.length();
        if ( l > _maxSteerForce ) {
            steer.divideScalar( l / _maxSteerForce );
        }
        return steer;
    };
    this.separation = function ( boids ) {
        var boid, distance,
        posSum = new THREE.Vector3(),
        repulse = new THREE.Vector3();
        for ( var i = 0, il = boids.length; i < il; i ++ ) {
            if ( Math.random() > 0.6 ) continue;
            boid = boids[ i ];
            distance = boid.position.distanceTo( this.position );
            if ( distance > 0 && distance <= _neighborhoodRadius ) {
                repulse.subVectors( this.position, boid.position );
                repulse.normalize();
                repulse.divideScalar( distance );
                posSum.add( repulse );
            }
        }
        return posSum;
    }
    this.fire
}

var Bullet = function(init_position, init_velocity, owner) {
    var _width = 500, _height = 500, _depth = 200, _collision_distance = 8;
    var _max_distance = 500;
    var _distance_travelled = 0;
    var _owner = owner;
    this.remove_this = false;
    this.position = init_position;
    this.velocity = init_velocity.normalize().multiplyScalar(8);
    var distance, boid;
    var _distance_unit = this.velocity.length();

    this.setWorldSize = function ( width, height, depth ) {
        _width = width;
        _height = height;
        _depth = depth;
    };

    this.move = function () {
        this.position.add( this.velocity );
        _distance_travelled += _distance_unit;  
    };

    this.run = function(boids) {
        if (_distance_travelled > _max_distance || this.checkBounds()) {
            this.remove_this = true;
            _owner.fired = false;
            return undefined;
        }
        else {
            this.move();
            for (var i = 0, il = boids.length; i < il; i++) {
                boid = boids[i];
                distance = boid.position.distanceTo( this.position );
                if (distance <= _collision_distance && boid != _owner) {
                    // console.log(distance);
                    console.log('collision!');
                    this.remove_this = true;
                    _owner.fired = false;
                    return i;
                }
            }
        }
    };

    this.getOwner = function() {
        return _owner;
    }

    this.checkBounds = function () {
        if ( this.position.x >   _width ) {
            this.position.x = _width;
            return true;
        }
        if ( this.position.x < - _width ) {
            this.position.x =  - _width;
            return true;
        }
        if ( this.position.y >   _height ) {
            this.position.y = _height;
            return true;
        }
        if ( this.position.y < - _height ) {
            this.position.y = - _height;
            return true;
        }
        if ( this.position.z >  _depth ) {
            this.position.z = _depth;
            return true;
        }
        if ( this.position.z < - _depth ) {
            this.position.z = - _depth;
            return true;
        }
    };
};

var Explosion = function(init_position, num_particles, init_vel) {
    var _width = 800, _height = 400, _depth = 1000, _collision_distance = 5;
    var _max_distance = 75;
    var _distance_travelled = 0;
    this.remove_this = false;

    this.positions = new Array(num_particles);
    this.velocities = new Array(num_particles);
    this.meshes = new Array(num_particles);

    // Taken from http://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-bell-curve
    // returns a gaussian random function with the given mean and stdev.
    function gaussian(mean, stdev) {
        var y2;
        var use_last = false;
        return function() {
            var y1;
            if(use_last) {
               y1 = y2;
               use_last = false;
            }
            else {
                var x1, x2, w;
                do {
                     x1 = 2.0 * Math.random() - 1.0;
                     x2 = 2.0 * Math.random() - 1.0;
                     w  = x1 * x1 + x2 * x2;               
                } while( w >= 1.0);
                w = Math.sqrt((-2.0 * Math.log(w))/w);
                y1 = x1 * w;
                y2 = x2 * w;
                use_last = true;
           }

           var retval = mean + stdev * y1;
           if(retval > 0) 
               return retval;
           return -retval;
       }
    };


    // initialize velocities to random points on unit sphere
    function initializeVelocities(velocities, scaleVal) {
        standard = gaussian(0, 1);
        for(var i = 0; i < velocities.length; i++) {
            var velocity = new THREE.Vector3();
            // velocity.x = standard(); velocity.y = standard(); velocity.z = standard();
            velocity.x = Math.random() * 2 - 1;
            velocity.y = Math.random() * 2 - 1;
            velocity.z = Math.random() * 2 - 1;
            velocity.normalize();
            velocity.divideScalar(3);
            velocity.add(init_vel.clone().normalize());
            velocity.normalize();

            velocity.multiplyScalar(scaleVal);
            velocities[i] = velocity;
        }
        return velocities;
    };

    for(var i = 0; i < this.positions.length; i++) {
        this.positions[i] = init_position.clone();
        this.meshes[i] = null;
    };
    initializeVelocities(this.velocities, 3.0);

    var distance, boid;
    var _distance_unit = 1;

    this.setMesh = function( mesh ) {
        for(var i = 0; i < this.meshes.length; i++) {
            this.meshes[i] = mesh.clone();
            this.meshes[i].position.copy(this.positions[i]);
        }
    }

    this.setMaxDistance = function (maxDist) {
        _max_distance = maxDist;
    }

    this.setWorldSize = function ( width, height, depth ) {
        _width = width;
        _height = height;
        _depth = depth;
    };

    this.move = function () {
        for(var i = 0; i < this.positions.length; i++) {
            this.positions[i].add(this.velocities[i]);
            this.velocities[i].multiplyScalar(0.95);
            // console.log('moving');
            // console.log(this.positions[i]);
        }
        // this.position.add( this.velocity );
        _distance_travelled += _distance_unit;  
    };

    this.run = function() {
        //if (_distance_travelled > _max_distance || this.checkBounds()) {
        if (_distance_travelled > _max_distance) {
            // console.log("REMOVING");
            // if (_distance_travelled > _max_distance) console.log("because of max distance");
            // else console.log("BECAUE OF BOUNDS");
            this.remove_this = true;
            return undefined;
        }
        else {
            this.move();
        }
    };

    this.checkBounds = function () {
        for(var i = 0; i < this.positions.length; i++) {
            var position = this.positions[i];
            if ( position.x >   _width ) {
                position.x = _width;
                return true;
            }
            if ( position.x < - _width ) {
                position.x =  - _width;
                return true;
            }
            if ( position.y >   _height ) {
                position.y = _height;
                return true;
            }
            if ( position.y < - _height ) {
                position.y = - _height;
                return true;
            }
            if ( position.z >  _depth ) {
                position.z = _depth;
                return true;
            }
            if ( position.z < - _depth ) {
                position.z = - _depth;
                return true;
            }
        }
    };
}

var StarDestroyerBoid = function () {
    this.bounding_box = new THREE.Box3();
    this.triangles = [];
    this.effective_distance = 10;

    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();

    this.active = false;

    var _maxSpeed = 1;

    var vector = new THREE.Vector3();
    var _acceleration = new THREE.Vector3();
    var _avoidWalls = true;
    var _avoid_accel_scaling = 2.5 * _maxSpeed;

    var _face;
    var _triangle;
    var _point = new THREE.Vector3();

    var _width, _height, _depth;

    var radians, cos_radians, sin_radians, max_turn_angle = 2;
    radians = max_turn_angle*Math.PI/180;
    cos_radians = Math.cos(radians);
    sin_radians = Math.sin(radians);

    _lastFireTime = 0;
    _lastBurstTime = 0;
    _time_between_fires = 100;
    _time_between_bursts = 3000;
    _burst_count = 0;
    _burst_limit = 10;

    this.setWorldSize = function ( width, height, depth ) {
        _width = width;
        _height = height;
        _depth = depth;
    };

    this.forceFireBullet = function (turret, fireVelocity) {
        if (!this.active) return undefined;
        var now = Date.now();
        if (_burst_count < _burst_limit) {
            if (now - _lastFireTime > _time_between_fires) {
                bullet = new Bullet(turret.position.clone(), fireVelocity.clone(), this);
                console.log('FORCE FIRING BULLET');
                bullet.setWorldSize(_width, _height, _depth);
                _lastFireTime = now;
                _burst_count += 1;
                if (_burst_count == _burst_limit) {
                    _lastBurstTime = now;
                }
                return bullet;
            }
            else {
                return undefined;
            }
        } else {
            if (now - _lastBurstTime > _time_between_bursts) {
                _burst_count = 0;
                _lastBurstTime = now;
            }
        }
        return undefined;
    };

    this.run = function() {
        if ( _avoidWalls ) {
            vector.set( - _width, this.position.y, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( _avoid_accel_scaling );
            _acceleration.add( vector );
            vector.set( _width, this.position.y, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( _avoid_accel_scaling );
            _acceleration.add( vector );
            vector.set( this.position.x, - _height, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( _avoid_accel_scaling );
            _acceleration.add( vector );
            vector.set( this.position.x, _height, this.position.z );
            vector = this.avoid( vector );
            vector.multiplyScalar( _avoid_accel_scaling );
            _acceleration.add( vector );
            vector.set( this.position.x, this.position.y, - _depth );
            vector = this.avoid( vector );
            vector.multiplyScalar( _avoid_accel_scaling );
            _acceleration.add( vector );
            vector.set( this.position.x, this.position.y, _depth );
            vector = this.avoid( vector );
            vector.multiplyScalar( _avoid_accel_scaling );
            _acceleration.add( vector );
        }
        this.move();
    };

    this.avoid = function ( target ) {
        var steer = new THREE.Vector3();
        steer.copy( this.position );
        steer.sub( target );
        if (steer.length() < target.length()/3) {
            return steer.set(0,0,0);
        }
        steer.multiplyScalar( 1 / this.position.distanceToSquared( target ) );
        return steer;
    };

    // Rodrigues rotation formula
    // k is unit vector for axis of rotation
    // v is vector to be rotate
    // theta is how much to rotate (in radians)
    var rotate = function(v, k) {
        var vnew = new THREE.Vector3();
        vnew.copy(v).multiplyScalar(cos_radians);
        vnew.add(v.clone().cross(k).multiplyScalar(sin_radians));
        // vnew.add(k.clone().multiplyScalar(k.dot(v) * 1 - cos_radians));
        return vnew;
    };

    this.move = function () {
        var old_velocity = this.velocity.clone().normalize();
        this.velocity.add( _acceleration );
        var l = this.velocity.length();
        this.velocity.normalize();
        var dot = this.velocity.dot(old_velocity);

        if (dot == -1) {
            this.velocity.x = Math.random();
            this.velocity.y = Math.random();
            this.velocity.z = Math.random();
            this.velocity.normalize();
            dot = this.velocity.dot(old_velocity);
        } 
        if (dot < cos_radians) {
            var axis = old_velocity.clone().cross(this.velocity);
            this.velocity = rotate(old_velocity, axis);
            console.log(Math.acos(this.velocity.dot(old_velocity)));
            _acceleration.add(this.velocity);
        } else {
            _acceleration.set( 0, 0, 0 );
        }
        
        this.velocity.multiplyScalar(l);
        if ( l > _maxSpeed ) {
            this.velocity.divideScalar( l / _maxSpeed );
        }
        this.position.add( this.velocity );
    };

    // call after running and updating the mesh
    this.updateGeoWithMesh = function(obj) {
        this.bounding_box.copy(obj.geometry.boundingBox).applyMatrix4(obj.matrixWorld);
        for (var i = 0, il = obj.geometry.faces.length; i < il; i++) {
            _face = obj.geometry.faces[i];
            
            if (this.triangles[i] === undefined) {
                this.triangles[i] = new THREE.Triangle();
            }
            _triangle = this.triangles[i];
            _triangle.a = obj.geometry.vertices[_face.a].clone().applyMatrix4(obj.matrixWorld);
            _triangle.b = obj.geometry.vertices[_face.b].clone().applyMatrix4(obj.matrixWorld);
            _triangle.c = obj.geometry.vertices[_face.c].clone().applyMatrix4(obj.matrixWorld);
        }
    };
}