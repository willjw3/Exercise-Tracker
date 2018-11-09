
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
var moment = require('moment')
var fs = require('fs');

const mongoose = require('mongoose')
var Schema = mongoose.Schema;

var userSchema = new Schema({
  userName: {
    type: String,
    required: [true, 'Please enter a user name'],
    unique: true,
    minlength: [3, 'choose a longer user name'],
    maxlength: [17, 'choose a shorter user name']
  },
  events: [{
    description: {
      type: String,
      required: true
    },
    duration: {
       type: Number,
       required: true
    },
    date: {
      type: String,
      default: moment(new Date()).format('YYYY-MM-DD')
    }
  }]
  
}, { usePushEach: true })

var User = mongoose.model('User', userSchema);

mongoose.connect(process.env.MLAB_URI, { useNewUrlParser: true });
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected, yo!');
  db.db.listCollections().toArray(function(err, names) {
    if (names.length === 1){
      console.log('creating collection')
      var newUser = new User({
        userName: 'marathon_man',
        events: [{
            description: 'registration',
            duration: 0,
            date: moment(new Date()).format('YYYY-MM-DD')
          }]
      });
      newUser.save(function(err, newUser){
        if (err) {
          return console.error(err);
        }
      });
      console.log(names);
    } else {console.log('Collection name: '+names[1].name)}
  });

});

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', function(req, res) {
  var uName = req.body.username;
  console.log(uName);
      //console.log(Object.values(member)[3].short_url);
     var newUser = new User({
        userName: uName,
        events: [{
            description: 'registration',
            duration: 0,
            date: moment(new Date()).format('YYYY-MM-DD')
          }]
      });
      newUser.save(function(err, newUser){
        if (err) {
          if (err.code === 11000) {
            res.json({"error message": "That user name is already taken"});
          } else {
              res.json({"error message": err['errors']['userName']['message']});
          }
          return console.error(err);
        }
        console.log(newUser._id);
        res.json({"username": uName, "userId": newUser._id});
      });
    return;
});

app.post('/api/exercise/add', function(req, res) {
  var udesc = req.body.description;
  var udur= req.body.duration;
  var udate = req.body.date;
  if (req.body.date === '') {
    udate = moment(new Date()).format('YYYY-MM-DD');
  }

  User.findById(req.body.userId, function(err, doc) {
    if (err) {
      res.json({"error message": 'Enter a valid userId'});
      return console.error(err);
    }
    doc.events.push({description: udesc, duration: udur, date: udate});
    doc.save(function(err, data) {
      if (err) {
        res.json({"error message": err});
        return console.error(err);
      }
      console.log('Success');
      res.json({"username": doc.userName, "description": udesc, "duration": udur+' mins', "date": udate, "userId": doc._id });
      return;
    });
  });
  return;
});

app.get('/api/exercise/users', function(req, res) {
  User.find({}, function(err, users) {
    var userMap = users.map(function(user) {
      return {"userId": user._id, "username": user.userName};
    });
    res.send(userMap);
  });
});

app.get('/api/exercise/user/:userId', function(req, res) {
  User.findById(req.params.userId, function(err, doc) {
    if (err) {
      res.json({"error message": 'Enter a valid userId'});
      return console.error(err);
    }
    var activityLog = doc.events.slice(1).map(event => {
      return {"activity": event.description, "duration": event.duration+' mins', "date": event.date};
    });
    res.json({"username": doc.userName, "activities": activityLog, "total number of activites": doc.events.length-1});
    return;
  });
  return;
});

app.get('/api/exercise/user/:userId/date1/:fromDate/date2/:toDate/limit/:limit', function (req, res) {

  var start = new Date(req.params.fromDate),
    end = new Date(req.params.toDate);

  User.find({_id: req.params.userId}, function(err, data) {
    if (err) {
      res.json({"error message": 'Query failed. Check Step 2 for query format'});
      return console.error(err);
    }
    var myArr = data[0].events.filter(function(elem){
      var theDate = new Date(elem.date);
      return theDate >= start && theDate <= end;
    });
    var newArr = myArr.map(elem => {
      return {"activity": elem.description,
              "time": elem.duration+' mins',
              "date": elem.date
      }
    });
    newArr.sort(function(a,b){
      return a - b;
    });
    var finArr = newArr.slice(0, req.params.limit);
    console.log(data);
    res.json({"username": data[0].userName, "activities": finArr});
    return;
  });
  return;
})







// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
