// Import necessary libraries and methods
const express = require('express');
const { fetchData, fetchSignals, fetchIndicators } = require('./server');
const app = express();

// Enable CORS (Cross-Origin Resource Sharing) for all routes. This is required to allow requests from different origins.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve static files from the public directory
app.use(express.static('public'));

// Define a GET route to fetch data from the server for a specific trader table and currency
app.get('/data/:traderTable/:currency', (req, res) => {
  const { traderTable, currency } = req.params;
  fetchData(traderTable, currency, data => {
    res.json(data);
  }, error => {
    console.error(error);
    res.status(500).send('Internal Server Error');
  });
});

// Define a GET route to fetch signals from the server for a specific trader table and currency
app.get('/nashsignals/:traderTable/:currency', (req, res) => {
  const { traderTable, currency } = req.params;
  fetchSignals(traderTable, currency, data => {
    res.json(data);
  }, error => {
    console.error(error);
    res.status(500).send('Internal Server Error');
  });
});

// Define a GET route to fetch indicators from the server
app.get('/ind_signal', (req, res) => {
  fetchIndicators(data => {
    res.json(data.indicatorSignalData);
  }, error => {
    console.error(error);
    res.status(500).send('Internal Server Error');
  });
});

// Define a GET route to fetch currencies from the server
app.get('/currency', (req, res) => {
  fetchIndicators(data => {
    res.json(data.currencyData);
  }, error => {
    console.error(error);
    res.status(500).send('Internal Server Error');
  });
});

// Start the server on port 3002
app.listen(3002, () => {
  console.log('Server is running on port 3002');
});
