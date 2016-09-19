var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var User = require('./models/user');
var Message = require('./models/message');

var app = express();

var jsonParser = bodyParser.json();

//API endpoints for USERS

app.get('/users', function(req, res) {
    User.find({}, function(err, user) { //blank obj means it searches for EVERYTHING
        res.json(user);
    });
});

app.post('/users', jsonParser, function(req, res) {
    
    User.create({username: req.body.username}, function(err, user) {

        if(!req.body.username) {
            return res.status(422).json({'message': 'Missing field: username'});
        } else if(typeof req.body.username !== 'string') {
            return res.status(422).json({'message': 'Incorrect field type: username'})
        }
        
        res.status(201).location('/users/' + user._id).json({});
    });
});

app.get("/users/:userId", function(req, res) {
    var id = req.params.userId;
    User.findOne({_id: id}, function(err, user) {
        if(!user) {
            //console.log("You made it! good job! :+1:");
            return res.status(404).json({"message": "User not found"});
        }
        res.status(200).json({"username": user.username, "_id": user._id});
    });
    
});

app.put("/users/:userId", jsonParser, function(req, res) {
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

app.delete("/users/:userId", jsonParser, function(req,res) {
   var id = req.params.userId;
   User.findOneAndRemove({_id: id}, function(err, user ) {
      if (!user) {
          return res.status(404).json({'message': 'User not found'});
      }
      res.status(200).json({});
   });
});

//API endpoints for MESSAGES

app.get('/messages', function(req,res) {
   var messages = [];
   var options = [{path: 'from'}, {path: 'to'}]; 
   var query = req.query; 
   
    Message.find(query)
    .populate('from to')
    .exec(function(err,message) {
        return res.status(200).json(message);
    });
});

app.post('/messages', jsonParser, function(req, res) {
    if(!req.body.text) {
           return res.status(422).json({"message": "Missing field: text"});
       }else if(typeof(req.body.text) !== "string") {
           return res.status(422).json({"message": "Incorrect field type: text"});
       }else if(typeof(req.body.to) !== "string") {
           return res.status(422).json({"message": "Incorrect field type: to"});
       }else if(typeof(req.body.from) !== "string") {
           return res.status(422).json({"message": "Incorrect field type: from"});
       }
       console.log(req.body);
      
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
});

app.get("/messages/:messageId", function(req, res) {
    var msgID = req.params.messageId;
    Message
        .findOne({_id: msgID})
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

