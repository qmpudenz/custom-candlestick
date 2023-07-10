// Import necessary libraries and methods
const express = require("express");
const https = require("https");
const fs = require("fs");
const { fetchData, fetchSignals, fetchIndicators } = require("./server");
const app = express();
const PORT = process.env.PORT || 3002;

const server = app;

// const server = process.env.TESTING
//   ? app
//   : https.createServer(
//       {
//         key: fs.readFileSync(process.env.SSL_KEY_PATH),
//         cert: fs.readFileSync(process.env.SSL_CERT_PATH),
//       },
//       app
//     );

// Enable CORS (Cross-Origin Resource Sharing) for all routes. This is required to allow requests from different origins.
server.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Serve static files from the public directory
server.use(express.static("public"));

// Define a GET route to fetch data from the server for a specific trader table, currency, and range.
server.get("/data/:traderTable/:currency/:startRange/:endRange", (req, res) => {
  const { traderTable, currency, startRange, endRange } = req.params;
  fetchData(
    traderTable,
    currency,
    startRange,
    endRange,
    (data) => {
      res.json(data);
    },
    (error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  );
});

// Define a GET route to fetch signals from the server for a specific trader table, currency, and range.
server.get(
  "/nashsignals/:traderTable/:currency/:startRange/:endRange",
  (req, res) => {
    const { traderTable, currency, startRange, endRange } = req.params;
    fetchSignals(
      traderTable,
      currency,
      startRange,
      endRange,
      (data) => {
        res.json(data);
      },
      (error) => {
        console.error(error);
        res.status(500).send("Internal Server Error");
      }
    );
  }
);

// Define a GET route to fetch indicators from the server
server.get("/ind_signal", (req, res) => {
  fetchIndicators(
    (data) => {
      res.json(data.indicatorSignalData);
    },
    (error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  );
});

// Define a GET route to fetch currencies from the server
server.get("/currency", (req, res) => {
  fetchIndicators(
    (data) => {
      res.json(data.currencyData);
    },
    (error) => {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  );
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
