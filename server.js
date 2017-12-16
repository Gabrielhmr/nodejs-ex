//  OpenShift sample Node application


var express = require('express'),
    app     = express(),
    morgan  = require('morgan');

var cors = require('cors')
app.use(cors({origin: 'http://localhost:4200'}));

const paypal = require('paypal-rest-sdk');


let env = new paypal.SandboxEnvironment('Af2OTrdO8DP8x2A8-YZopy0xP5HQI6xlEecebvvg1ZpYePXrxKKwp0q80gpKobEqdbR35h7TZ26SJL-X', 'EBQkDl0ZhDBxaMdeBgdX_ncVTchUR2aEDXRseDV-usKiKaiOSqb6RM_d7w4Tve1aYJuEN5mrC_GgC1N3');
let client = new paypal.PayPalHttpClient(env);

Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.post('/pay',(req, res) => {
  console.log(req);
  var create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
        "return_url": "http://antecipay-antecipay.193b.starter-ca-central-1.openshiftapps.com/success",
        "cancel_url": "http://antecip-56286.firebaseapp.com/cancel"
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": "pacote prata",
                "sku": "20 encaixes",
                "price": "30.00",
                "currency": "BRL",
                "quantity": 1
            }]
        },
        "amount": {
            "currency": "BRL",
            "total": "30.00"
        },
        "description": "This is the payment description for encaixes."
    }]
};

      let request = new paypal.PaymentCreateRequest();
      request.requestBody(create_payment_json);

      client.execute(request).then((response) => {
        console.log(response.statusCode);
        console.log(response.result);
        let payment = response.result;
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === 'approval_url') {
            res.redirect(payment.links[i].href);
          }
        }

      }).catch((error) => {
        console.error(error.statusCode);
        console.error(error.message);
      });



});

app.get('/success', function (req, res) {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;

  let request = new paypal.PaymentExecuteRequest(paymentId);
  request.requestBody({ payer_id: payerId});

  client.execute(request).then((r) => {
    res.send('success');

  }).catch((error) => {
    console.error(error);
  });

});


app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
