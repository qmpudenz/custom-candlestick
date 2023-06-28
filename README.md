# Currency Candlestick Chart Application

This application displays currency candlestick data in a chart format. A request is sent from the user's browser to the server, which fetches data from a database and returns it to the user.

The application consists of three main files:

## index.html

This is the front-end of the application, written in HTML and JavaScript. The interface includes a dropdown to select the desired currency and time interval, and a button to fetch the data.

On clicking the fetch button, the application sends a request to the server for the appropriate data. The received data is processed and displayed in a candlestick chart using ECharts.

## server.js

This is the back-end of the application, written in Node.js. It establishes a server that listens for HTTP requests on a specified port.

The server supports requests to fetch the candlestick data for a particular currency and time interval, and the list of available currencies. The data is fetched from a MySQL database and returned to the user in JSON format.

## app.js

This file initiates the server. It imports the server module from server.js and calls the function to start the server.

# Running the Application

## Prerequisites

- Node.js and npm (Node Package Manager)
- MySQL database
- Apache Web Server

Ensure Node.js, npm, and MySQL are installed on your server. Apache is necessary to host the static `index.html` file.

## Steps to Setup

1. Clone the project on your server using Git:

   `git clone https://github.com/qmpudenz/custom-candlestick.git`

2. Navigate to the project directory and install the necessary dependencies:

cd custom-candlestick
npm install

3. Start the Node.js server:

`node app.js`

4. Copy `index.html` and related files (CSS, JavaScript) to the Apache document root (`/var/www/html`):

sudo cp path/to/index.html /var/www/html/
sudo systemctl restart apache2

Replace `path/to/index.html` with the actual path to the file.

Now, open a web browser and navigate to `http://your-server-ip/index.html` to use the application. Replace `your-server-ip` with the actual IP address or domain name of your server.

## Updating the Application

To update the application:

1. Pull the latest changes from the git repository:

`git pull origin main`

2. Restart the Node.js server:

`node app.js`

## Troubleshooting

If you encounter issues, check the JavaScript console in your browser for errors. Additionally, monitor the output of the Node.js server.
