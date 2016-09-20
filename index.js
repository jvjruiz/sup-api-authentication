var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var User = require('./models/user');
var Message = require('./models/message');
var bcrypt = require('bcryptjs');
var passport = require("passport")
var BasicStrategy = require("passport-http").BasicStrategy
var app = express();

var jsonParser = bodyParser.json();

//API endpoints for USERS

var strategy = new BasicStrategy(function(username, password, callback) {
    User.findOne({
        username: username
    }, function (err, user) {
        if (err) {
            callback(err);
            return;
        }

        if (!user) {
            return callback(null, false, {
                message: 'Incorrect username.'
            });
        }

        user.validatePassword(password, function(err, isValid) {
            if (err) {
                return callback(err);
            }

            if (!isValid) {
                return callback(null, false, {
                    message: 'Incorrect password.'
                });
            }
            return callback(null, user);
        });
    });
});

passport.use(strategy);

app.use(passport.initialize());

app.get('/hidden' , passport.authenticate('basic', {session: false}), function(req, res){
    res.json({
        message: "luke I am your Father"
    });
});

app.get('/users', function(req, res) {
    User.find({}, function(err, user) { //blank obj means it searches for EVERYTHING
        res.json(user);
    });
});

app.post('/users', passport.authenticate('basic' , {session: false}), jsonParser, function(req, res) {
 
    if(!req.body) {
        return res.status(400).json({
            message: "No request body"
        });
    }
    
    if(!req.body.username) {
        return res.status(422).json({
            'message': 'Missing field: username'
        });
    } 
    
    var username = req.body.username;
    
    if(typeof username !== 'string') {
        return res.status(422).json({
            'message': 'Incorrect field type: username'
        })
    }
    
    username = username.trim();
    
    if (username === '') {
        return res.status(422).json({
            message: 'Incorrect field length: username'
        });
    }
    
    if(!('password' in req.body)) {
        return res.status(422).json({
            message: 'Incorrect field length: username'
        });
    }
    
    var password = req.body.password;
    
    if (password === '') {
        return res.status(422).json({
            message: 'Incorrect field length: password'
        });
    }
    
    bcrypt.genSalt(10, function(err, salt) {
        console.log('yougotsalt')
        if (err) {
            return res.status(500).json({
                message: 'Internal server error'
            });
        }
        
        bcrypt.hash(password, salt, function(err, hash) {
            //  console.log('you got hash')
            //  console.log(password)
            //  console.log(salt)
            //  console.log(hash)
             if (err) {
            return res.status(500).json({
                message: 'Internal server error'
            });
            }
            
            var user = new User({
                username: username,
                password: hash
            });
            
            console.log(user)
            
            user.save(function(err) {
                if (err) {
                    console.log(err)
                    return res.status(500).json({
                        message: 'Internal server error'
                    });
                }
                
                return res.status(201).json({message:"User added"});
            });
        });
        
    });
    
});


app.get("/users/:userId", passport.authenticate('basic' , {session: false}), function(req, res) {
    var id = req.params.userId;
    User.findOne({_id: id}, function(err, user) {
        if(!user) {
            //console.log("You made it! good job! :+1:");
            return res.status(404).json({"message": "User not found"});
        }
        res.status(200).json({"username": user.username, "_id": user._id});
    });
    
});

app.put("/users/:userId", passport.authenticate('basic' , {session: false}), jsonParser, function(req, res) {
    var id = req.params.userId;
    var newName = req.body.username;
    if(!newName) {
        return res.status(422).json({'message': 'Missing field: username'});
    }
    else if (typeof newName !== 'string') {
        return res.status(422).json({'message': 'Incorrect field type: username'});
    }
    User.findOneAndUpdate({_id: id}, {username: newName}, {upsert: true}, function(err, user) { //upsert creates a new object if it doesn't already exists
        res.status(200).json({});
    });
});

app.delete("/users/:userId", passport.authenticate('basic' , {session: false}), jsonParser, function(req,res) {
   var id = req.params.userId;
   User.findOneAndRemove({_id: id}, function(err, user ) {
      if (!user) {
          return res.status(404).json({'message': 'User not found'});
      }
      res.status(200).json({});
   });
});

//API endpoints for MESSAGES

app.get('/messages', passport.authenticate('basic' , {session: false}), function(req,res) {
//    verified user is at req.user;
//  Query db for all Messages with from or to that equal req.user's id
//   response with result

var username = req.user.username
var password = req.user.password
var user = req.user._id


    // console.log(username)
    // console.log(password)
    // console.log(req.user._id)

   var messages = [];
   var options = [{path: 'from'}, {path: 'to'}]; 
   var query = req.query; 
   console.log(query)
    //if user ID matches to or from ID show messages
    // if(req.query.from == req.user._id || req.query.to == req.user._id) {
        Message.find(query)
        .populate('from to')
        .exec(function(err,message) {
            return res.status(200).json(message);
        });
    // }
    
    // else {
       // res.status(401).json({"Message":"Gtfo"});
    //}
});

app.post('/messages', passport.authenticate('basic' , {session: false}), jsonParser, function(req, res) {
    if(!req.body.text) {
           return res.status(422).json({"message": "Missing field: text"});
       }else if(typeof(req.body.text) !== "string") {
           return res.status(422).json({"message": "Incorrect field type: text"});
       }else if(typeof(req.body.to) !== "string") {
           return res.status(422).json({"message": "Incorrect field type: to"});
       }else if(typeof(req.body.from) !== "string") {
           return res.status(422).json({"message": "Incorrect field type: from"});
       }
    
    if(req.body.from == req.user._id){  //checks to make sure that the from ID matches the currently logged in user
        User.findOne({ _id: req.body.to }) //checks if query passes(syntax errors only)
            .then(function(user){ 
                //checks if user is found/not
                if (!user) return res.status(422).json({ message: 'Incorrect field value: to'});
                return User.findOne({ _id: req.body.from }); // to continue chain, must return new Promise(check query again)
            })
            .then(function(user) { //chain continues
                if (!user) return res.status(422).json({ message: 'Incorrect field value: from'});
                
               Message.create(req.body, function(err, message) {
                   //console.log(message);
                   if(err) {
                       console.error(err);
                       return res.sendStatus(500);
                   }
                    return res.status(201).location("/messages/" + message._id).json({});
               });
            }) //catch runs when there is query runs into an error
            .catch(function(err){
                console.error(err);
                return res.sendStatus(500);
            });
    }
    else {
        return res.status(403).json({message:"gtfo hacker"})
    }
});

app.get("/messages/:messageId", passport.authenticate('basic' , {session: false}), function(req, res) {
    var msgID = req.params.messageId;
    Message
        .findOne({_id: msgID})
        //change parameter
        .populate('to from')
        .exec(function(err, message){
            if(err) {
                console.error(err);
                return res.sendStatus(500);
            }
            if(!message) {
                console.log("you're in");
                return res.status(404).json({"message": "Message not found"});   
            }
            console.log(message);
            return res.status(200).json(message);
        });
});




var runServer = function(callback) {
    var databaseUri = process.env.DATABASE_URI || global.databaseUri || 'mongodb://localhost/sup';
    mongoose.connect(databaseUri).then(function() {
        var port = process.env.PORT || 8080;
        var server = app.listen(port, function() {
            console.log('Listening on localhost:' + port);
            if (callback) {
                callback(server);
            }
        });
    });
};

if (require.main === module) {
    runServer();
};

exports.app = app;
exports.runServer = runServer;

