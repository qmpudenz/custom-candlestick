document
  .getElementById("updateDateRange")
  .addEventListener("click", updateDateRange);
function updateDateRange() {
  const startDateInput = document.getElementById("startDate").value;
  const endDateInput = document.getElementById("endDate").value;

  if (startDateInput && endDateInput) {
    startDate = startDateInput;
    endDate = endDateInput;

    // Display success message or do something
    console.log(`Date range updated: ${startDate} to ${endDate}`);
  } else {
    // Handle error: both inputs should be filled
    console.log("Please fill both date inputs");
  }

  fetchDataAndDrawChart(
    traderTable,
    currency,
    indicator,
    filterIndicator,
    selectedSources,
    selectedFilters
  );
  populateIndicatorCheckboxGroup(
    traderTable,
    currency,
    startDate,
    endDate,
    selectedSources,
    selectedFilters
  );
  populateIndicatorFilterCheckboxGroup(
    traderTable,
    currency,
    startDate,
    endDate,
    selectedSources,
    selectedFilters
  );
}

// Close the no data message when escape key is pressed
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    document.getElementById("noDataMessage").style.display = "none";
  }
});

// Close the no data message when the close button is clicked
document.getElementById("closeMessage").addEventListener("click", () => {
  document.getElementById("noDataMessage").style.display = "none";
});

// Declare and initialize global variables
const { DateTime } = luxon;
let chartData;
let signalData;

// Define a function to find the closest date in the candlestick data to a given date
function findCandlestickForDate(targetDate, candlestickData) {
  let closestCandlestick = candlestickData[0];
  let closestTimeDifference = Math.abs(
    new Date(closestCandlestick.date) - targetDate
  );

  candlestickData.forEach((candlestick) => {
    let currentCandlestickDate = new Date(candlestick.date);
    let currentTimeDifference = Math.abs(currentCandlestickDate - targetDate);

    if (currentTimeDifference < closestTimeDifference) {
      closestCandlestick = candlestick;
      closestTimeDifference = currentTimeDifference;
    }
  });

  return closestCandlestick;
}

// Function to fetch data from the API and draw the chart
async function fetchDataAndDrawChart(
  traderTable,
  currency,
  selectedSources,
  selectedFilters
) {
  console.log(
    "Inside fetchDataAndDrawChart with:",
    traderTable,
    currency,
    selectedSources,
    selectedFilters
  );

  // The function will show a loading message while the fetch operation is in progress
  myChart.showLoading({
    text: "Loading...",
    textColor: "#000",
    maskColor: "rgba(255, 255, 255, 0.8)",
    zlevel: 0,
  });
  // Fetch start and end date from date inputs
  let startDate = document.getElementById("startDate").value;
  let endDate = document.getElementById("endDate").value;

  try {
    // Then it will fetch the candlestick and signals data, show a no data message if necessary
    const response = await fetch(
      `http://localhost:3002/data/${traderTable}/${currency}/${startDate}/${endDate}`
    );
    data = await response.json();
    const signalResponse = await fetch(
      `http://localhost:3002/nashsignals/${traderTable}/${currency}/${startDate}/${endDate}`
    );
    signalData = await signalResponse.json();

    if (signalData.length === 0) {
      // If there is no line data, show the message
      document.getElementById("noDataMessage").style.display = "block";
    } else {
      // If there is line data, hide the message
      document.getElementById("noDataMessage").style.display = "none";
    }

    // It converts the fetched candlestick data to the format used by the chart
    chartData = data.map((row) => {
      const date_candle_started = row[0];
      const low = row[1];
      const open = row[2];
      const close = row[3];
      const high = row[4];
      return {
        date: date_candle_started,
        values: [open, close, low, high],
      };
    });

    // Then it creates the mark line data for the chart
    let markLineData = signalData.map((signal) => {
      const [startDate, endDate, indicatorSource, signalType] = signal;

      // Find the matching candlesticks for the start and end dates
      const startCandlestick = findCandlestickForDate(
        new Date(startDate),
        chartData
      );
      const endCandlestick = findCandlestickForDate(
        new Date(endDate),
        chartData
      );

      // Find the index of the start and end candlesticks
      const startIndex = chartData.findIndex(
        (candlestick) => candlestick.date === startCandlestick.date
      );
      const endIndex = chartData.findIndex(
        (candlestick) => candlestick.date === endCandlestick.date
      );
      let lineColor;
      switch (signalType) {
        case "BUY":
        case "BUY SOON":
          lineColor = "green";
          break;
        case "SELL":
        case "SELL SOON":
          lineColor = "red";
          break;
        default:
          lineColor = "blue";
          break;
      }

      return [
        {
          name: indicatorSource, // Added indicatorSource here
          signalType: signalType, // Added signalType here
          symbol: "circle",
          symbolSize: 7,
          coord: [startIndex, startCandlestick.values[1]],
          label: {
            formatter: "",
            position: "start",
          },
          lineStyle: {
            color: lineColor,
          },
          tooltip: {
            formatter: function () {
              const startFormattedDate = DateTime.fromISO(startDate)
                .setZone("America/Chicago")
                .toFormat("MM-dd-yyyy HH:mm");
              const endFormattedDate = DateTime.fromISO(endDate)
                .setZone("America/Chicago")
                .toFormat("MM-dd-yyyy HH:mm");
              return (
                "Signal Source: " +
                indicatorSource +
                "<br />" +
                signalType +
                ": " +
                startFormattedDate +
                " to " +
                endFormattedDate
              );
            },
          },
        },
        {
          name: "end",
          coord: [endIndex, endCandlestick.values[1]],
          symbol: "circle",
          symbolSize: 7,
          tooltip: {
            formatter: function () {
              const endFormattedDate = DateTime.fromISO(endDate)
                .setZone("America/Chicago")
                .toFormat("MM-dd-yyyy HH:mm");
              return "End: " + endFormattedDate;
            },
          },
        },
      ];
    });

    console.log("Initial markLineData:", JSON.stringify(markLineData));

    myChart.hideLoading();

    // Define the filters and sources
    let selectedFilters = Array.from(
      document
        .getElementById("indicatorFilter-checkbox-group")
        .getElementsByTagName("input")
    )
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
    let selectedSources = Array.from(
      document
        .getElementById("indicator-checkbox-group")
        .getElementsByTagName("input")
    )
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);

    console.log("Selected Filters: ", selectedFilters);
    console.log("Selected Sources: ", selectedSources);

    // Check if 'all' is selected in the filters
    if (selectedFilters.includes("all")) {
      // If 'all' is selected, clear the selectedFilters
      selectedFilters = [];
    }

    // Check if 'all' is selected in the sources
    if (selectedSources.includes("all")) {
      // If 'all' is selected, clear the selectedSources
      selectedSources = [];
    }

    // Filter the markLineData based on selectedFilters and selectedSources
    let markLineDataFiltered = markLineData;

    console.log("Pre-filtered markLineData: ", markLineDataFiltered);

    // Filter by source only if a specific source is selected
    if (selectedSources.length > 0) {
      markLineDataFiltered = markLineDataFiltered.filter((data) =>
        selectedSources.includes(data[0].name)
      );
    }

    console.log("Post-source filter markLineData: ", markLineDataFiltered);

    // Filter by filters only if specific filters are selected
    if (selectedFilters.length > 0) {
      markLineDataFiltered = markLineDataFiltered.filter((data) =>
        selectedFilters.includes(data[0].signalType)
      );
    }

    // console.log("Post-filters filter markLineData: ", markLineDataFiltered);

    // And finally it draws the chart
    drawChart(markLineDataFiltered);
  } catch (error) {
    console.error("Error fetching data:", error);
    myChart.hideLoading();
  }
}

// Initialize the chart
var myChart = echarts.init(document.getElementById("main"));
window.addEventListener("resize", function () {
  myChart.resize();
});

// Function to draw the chart. The chart will display the fetched candlestick data and signal lines.
function drawChart(markLineDataFiltered) {
  // const selectedSources = document.getElementById('indicator-checkbox-group').value;
  let selectedSources = Array.from(
    document
      .getElementById("indicator-checkbox-group")
      .getElementsByTagName("input")
  )
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  // Show all signals if 'All Signals' option is selected

  const option = {
    tooltip: {
      trigger: "item",
      axisPointer: {
        type: "cross",
      },
      formatter: function (params) {
        var date = DateTime.fromISO(chartData[params.dataIndex].date).setZone(
          "America/Chicago"
        );
        var formattedDate = date.toFormat("M-dd-yy H:mm");
        return (
          formattedDate +
          "<br/>" +
          "Open: " +
          params.value[1] +
          "<br/>" +
          "Close: " +
          params.value[2] +
          "<br/>" +
          "Lowest: " +
          params.value[3] +
          "<br/>" +
          "Highest: " +
          params.value[4]
        );
      },
    },

    dataZoom: [
      {
        type: "inside",
        start: 90, // Display last 10% of data
        end: 100,
      },
    ],
    xAxis: {
      type: "category",
      data: chartData.map((candlestick) => {
        return DateTime.fromISO(candlestick.date)
          .setZone("America/Chicago")
          .toFormat("M-dd-yy H:mm");
      }),
    },

    yAxis: {
      scale: true,
    },
    series: [
      {
        type: "candlestick",
        data: chartData.map((candlestick) => candlestick.values),
        itemStyle: {
          color: "#009129",
          color0: "#d50000",
          borderColor: "#009129",
          borderColor0: "#d50000",
        },

        markLine: {
          showSymbol: true,
          symbol: "circle", // specify the shape of symbol, optional
          symbolSize: 8, // increase the symbol size
          connectNulls: true,
          data: markLineDataFiltered,
          lineStyle: {
            width: 4, // you may want to increase line width as well
            color: "#0000FF",
            type: "solid",
          },
        },
      },
    ],
  };
  myChart.setOption(option);
}

// Function to fetch the list of available currency pairs
async function fetchIndicators(successCallback, errorCallback) {
  try {
    const response = await fetch("http://localhost:3002/currency");
    const data = await response.json();
    successCallback(data);
  } catch (error) {
    errorCallback(error);
  }
}

let selectedSources = ["all"]; // Initialize with 'all' selected
let selectedFilters = ["all"]; // Initialize with 'all' selected

async function populateIndicatorCheckboxGroup(
  traderTable,
  currency,
  startDate,
  endDate
) {
  const signalResponse = await fetch(
    `http://localhost:3002/nashsignals/${traderTable}/${currency}/${startDate}/${endDate}`
  );
  const signalData = await signalResponse.json();

  const uniqueSignalSources = [...new Set(signalData.map((item) => item[2]))];
  const checkboxGroup = document.getElementById("indicator-checkbox-group");
  checkboxGroup.innerHTML = "";
  let allOption = document.createElement("input");
  allOption.type = "checkbox";
  allOption.id = "all";
  allOption.name = "all"; // Add name to the checkbox
  allOption.value = "all"; // Add value to the checkbox
  allOption.checked = true; // Set as checked by default

  let allOptionLabel = document.createElement("label");
  allOptionLabel.htmlFor = "all";
  allOptionLabel.appendChild(document.createTextNode("All"));

  checkboxGroup.appendChild(allOption);
  checkboxGroup.appendChild(allOptionLabel);
  checkboxGroup.appendChild(document.createElement("br")); // Added line break here

  uniqueSignalSources.forEach((source) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = source;
    checkbox.value = source;
    checkbox.id = `indicator-checkbox-${source}`;

    const label = document.createElement("label");
    label.htmlFor = `indicator-checkbox-${source}`;
    label.appendChild(document.createTextNode(source));

    checkboxGroup.appendChild(checkbox);
    checkboxGroup.appendChild(label);
    checkboxGroup.appendChild(document.createElement("br"));
  });

  checkboxGroup.addEventListener("change", function (event) {
    // Get all the checked checkboxes
    let checkedBoxes = Array.from(checkboxGroup.children).filter(
      (child) => child.nodeName === "INPUT" && child.checked
    );

    if (event.target.id === "all") {
      if (event.target.checked) {
        // If "all" was checked, uncheck all other options
        Array.from(checkboxGroup.children)
          .filter(
            (child) => child !== event.target && child.nodeName === "INPUT"
          )
          .forEach((child) => (child.checked = false));
      } else {
        // If "all" was unchecked, and previously it was checked, check first available option
        const firstAvailableCheckbox = Array.from(checkboxGroup.children).find(
          (child) => child !== event.target && child.nodeName === "INPUT"
        );
        if (firstAvailableCheckbox) {
          firstAvailableCheckbox.checked = true;
        }
      }
    } else {
      if (event.target.checked) {
        // If it was checked, uncheck "all"
        checkboxGroup.children[0].checked = false;
      } else {
        // If it was unchecked, check if all others are also unchecked.
        // If so, check "all"
        const allUnchecked = Array.from(checkboxGroup.children)
          .filter((child) => child.nodeName === "INPUT")
          .every((child) => !child.checked);
        if (allUnchecked) {
          checkboxGroup.children[0].checked = true;
        }
      }
    }

    // Update selectedSources with checked options, or with all options if 'all' is checked
    selectedSources = checkedBoxes.map((box) => box.value);
    if (selectedSources.includes("all")) {
      selectedSources = uniqueSignalSources; // use all sources instead of ['all']
    }
  });
}

// Function to populate 'indicatorFilter'
async function populateIndicatorFilterCheckboxGroup(
  traderTable,
  currency,
  startDate,
  endDate,
  sources
) {
  const signalResponse = await fetch(
    `http://localhost:3002/nashsignals/${traderTable}/${currency}/${startDate}/${endDate}`
  );
  const signalData = await signalResponse.json();

  console.log("sources:", sources); // Add this
  // Filter signalData based on selected sources
  let filteredSignalData = signalData;
  if (sources && !sources.includes("all")) {
    filteredSignalData = signalData.filter((item) => sources.includes(item[2]));
  }

  const uniqueIndicators = [
    ...new Set(filteredSignalData.map((item) => item[3])),
  ];
  const checkboxGroup = document.getElementById(
    "indicatorFilter-checkbox-group"
  );
  checkboxGroup.innerHTML = "";
  // Add an "all" option to the start of the checkbox list
  let allOption = document.createElement("input");
  allOption.type = "checkbox";
  allOption.id = "allFilter";
  allOption.name = "all"; // Add name to the checkbox
  allOption.value = "all"; // Add value to the checkbox
  allOption.checked = true; // Set as checked by default

  let allOptionLabel = document.createElement("label");
  allOptionLabel.htmlFor = "allFilter";
  allOptionLabel.appendChild(document.createTextNode("All"));

  checkboxGroup.appendChild(allOption);
  checkboxGroup.appendChild(allOptionLabel);
  checkboxGroup.appendChild(document.createElement("br")); // Added line break here
  uniqueIndicators.forEach((indicator) => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = indicator;
    checkbox.value = indicator;
    checkbox.id = `indicatorFilter-checkbox-${indicator}`;

    const label = document.createElement("label");
    label.htmlFor = `indicatorFilter-checkbox-${indicator}`;
    label.appendChild(document.createTextNode(indicator));

    checkboxGroup.appendChild(checkbox);
    checkboxGroup.appendChild(label);
    checkboxGroup.appendChild(document.createElement("br"));
  });
  checkboxGroup.addEventListener("change", function (event) {
    // Get all the checked checkboxes
    let checkedBoxes = Array.from(checkboxGroup.children).filter(
      (child) => child.nodeName === "INPUT" && child.checked
    );

    // Update selectedFilters with checked options, or with all options if 'all' is checked
    selectedFilters = checkedBoxes.map((box) => box.value);
    if (selectedFilters.includes("all")) {
      selectedFilters = uniqueIndicators; // use all indicators instead of ['all']
    }
  });
}

// Event listener for 'indicator-checkbox-group' change
document
  .getElementById("indicator-checkbox-group")
  .addEventListener("change", async () => {
    const checkboxes = document
      .getElementById("indicator-checkbox-group")
      .getElementsByTagName("input");

    // Filter out the 'all' option if other checkboxes are selected
    let selectedSources = Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
    if (selectedSources.includes("all") && selectedSources.length > 1) {
      selectedSources = selectedSources.filter((source) => source !== "all");
    }

    console.log("Selected sources:", selectedSources); // Add this

    const traderTable = document.getElementById("traderTable").value;
    const currency = document.getElementById("currency").value;
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    populateIndicatorFilterCheckboxGroup(
      traderTable,
      currency,
      startDate,
      endDate,
      selectedSources
    );
  });

// Event listener for 'currency' change
document.getElementById("currency").addEventListener("change", async () => {
  const traderTable = document.getElementById("traderTable").value;
  const currency = document.getElementById("currency").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  populateIndicatorCheckboxGroup(traderTable, currency, startDate, endDate);
  populateIndicatorFilterCheckboxGroup(
    traderTable,
    currency,
    startDate,
    endDate
  );
});

// Event listener for 'indicatorFilter-checkbox-group' change
document
  .getElementById("indicatorFilter-checkbox-group")
  .addEventListener("change", async () => {
    const checkboxes = document
      .getElementById("indicatorFilter-checkbox-group")
      .getElementsByTagName("input");

    // Filter out the 'all' option if other checkboxes are selected
    selectedFilters = Array.from(checkboxes)
      .filter((checkbox) => checkbox.checked)
      .map((checkbox) => checkbox.value);
    if (selectedFilters.includes("all") && selectedFilters.length > 1) {
      selectedFilters = selectedFilters.filter((filter) => filter !== "all");
    }

    console.log("Selected indicator filters:", selectedFilters);
  });

// Fetch the available currency pairs and populate the currency select element when the page loads
window.onload = () => {
  document.getElementById("startDate").value = "2023-04-01";
  document.getElementById("endDate").value = "2023-05-23";
  let startDate = document.getElementById("startDate").value;
  let endDate = document.getElementById("endDate").value;
  console.log(startDate);

  // Fetch initial data and draw the chart
  const traderTable = document.getElementById("traderTable").value;
  const currency = document.getElementById("currency").value;

  fetchIndicators(
    async (currencyData) => {
      const currencySelect = document.getElementById("currency");
      currencySelect.innerHTML = "";
      let firstOption = null;
      currencyData.forEach(([id, currency_name]) => {
        if (currency_name.includes("_")) {
          const option = document.createElement("option");
          option.value = id;
          option.textContent = currency_name.replace("_", "/");
          currencySelect.appendChild(option);
          if (!firstOption) {
            firstOption = option;
          }
        }
      });

      if (firstOption) {
        firstOption.selected = true;
        const traderTable = "trader_H1"; // replace 'trader_H1' with your initial traderTable value
        document.getElementById("currency").value = 10;
        const currency = document.getElementById("currency").value;

        const source = document.getElementById(
          "indicator-checkbox-group"
        ).value;

        // Fetch initial data and draw the chart
        fetchDataAndDrawChart(traderTable, currency, "all", "all");
        populateIndicatorCheckboxGroup(
          traderTable,
          currency,
          startDate,
          endDate
        );
        populateIndicatorFilterCheckboxGroup(
          traderTable,
          currency,
          startDate,
          endDate
        );

        // const signalResponse = await fetch(`http://localhost:3002/nashsignals/${traderTable}/${currency}/${startDate}/${endDate}`);
        // const signalData = await signalResponse.json();
        // if (signalData && signalData.length > 0) {
        //   console.log('did i get here?', signalData)
        //   // Call event listener code here
        // }
      } else {
        console.log("No valid currency options found");
      }
    },
    (error) => {
      console.error("An error occurred:", error);
    }
  );
};

// Register click event on the fetch button to request and draw new data
document.getElementById("fetchData").addEventListener("click", () => {
  const traderTable = document.getElementById("traderTable").value;
  const currency = document.getElementById("currency").value;

  // For sources
  const sourceCheckboxes = document
    .getElementById("indicator-checkbox-group")
    .getElementsByTagName("input");
  const selectedSources = Array.from(sourceCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  // For filters
  const filterCheckboxes = document
    .getElementById("indicatorFilter-checkbox-group")
    .getElementsByTagName("input");
  const selectedFilters = Array.from(filterCheckboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.value);

  console.log(
    "fetching new data, selectedSources, selectedFilters",
    selectedSources,
    selectedFilters
  );

  fetchDataAndDrawChart(
    traderTable,
    currency,
    selectedSources,
    selectedFilters
  );
});
